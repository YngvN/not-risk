import '../global.css';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { GameProvider } from '../src/context/GameContext';

/**
 * Root layout.
 * Wraps the entire app in ThemeProvider and LanguageProvider so every
 * screen has access to colors and translations via useTheme() / useLanguage().
 *
 * Stack animation:
 *   - iOS/Android: native 'ios' slide push/pop
 *   - Web: 'fade' (slide_from_right doesn't translate well to CSS transitions)
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <GameProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: Platform.select({ web: 'fade', default: 'slide_from_right' }),
            }}
          />
          </GameProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
