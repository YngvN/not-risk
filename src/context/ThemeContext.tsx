import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ColorScheme, ThemeColors } from '../constants/colors';

const STORAGE_KEY = '@theme_preference';

/**
 * Sync the active color scheme with NativeWind so that Tailwind `dark:` class
 * variants activate correctly on every platform.
 *
 * Why not `import { setColorScheme } from 'nativewind'` at the top level?
 * On web with static rendering (SSR), NativeWind's setColorScheme accesses
 * native internals (tslib helpers) that don't exist on the server and crashes
 * with "Cannot destructure property '__extends' of '_tslib.default'".
 *
 * Platform-specific strategy:
 *   - Web   → toggle the `dark` CSS class on <html>; NativeWind's generated
 *             CSS already uses `.dark` selectors when darkMode: 'class' is set.
 *             Guard with `typeof document` so SSR never touches the DOM.
 *   - Native → lazy-require NativeWind to avoid module-init timing issues.
 */
function syncNativeWindScheme(scheme: ColorScheme): void {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', scheme === 'dark');
    }
  } else {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nw = require('nativewind') as { setColorScheme: (s: string) => void };
      nw.setColorScheme(scheme);
    } catch {
      // NativeWind not available or not yet initialized — safe to ignore
    }
  }
}

interface ThemeContextValue {
  /** Current active color scheme. */
  theme: ColorScheme;
  /** Resolved color tokens for the current scheme. */
  colors: ThemeColors;
  /** True when the dark scheme is active. */
  isDark: boolean;
  /** Toggle between light and dark. */
  toggleTheme: () => void;
  /** Explicitly set the color scheme and persist the choice. */
  setTheme: (theme: ColorScheme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colors: Colors.light,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Provides theme state to the component tree.
 * Reads the device color scheme on first load, restores any persisted user
 * override from AsyncStorage, and syncs the resolved scheme with NativeWind.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ColorScheme>(systemScheme ?? 'light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      const resolved: ColorScheme =
        stored === 'light' || stored === 'dark'
          ? stored
          : (systemScheme ?? 'light');

      setThemeState(resolved);
      // Apply the resolved theme to NativeWind on initial load too
      syncNativeWindScheme(resolved);
      setIsLoaded(true);
    });
  }, [systemScheme]);

  const setTheme = useCallback(async (next: ColorScheme) => {
    setThemeState(next);
    syncNativeWindScheme(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: Colors[theme],
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme],
  );

  // Avoid a flash of the wrong theme before AsyncStorage resolves
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
