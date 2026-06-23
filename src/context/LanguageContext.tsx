import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  translations,
  LanguageCode,
  TranslationKey,
  getTranslation,
} from '../locales';

const STORAGE_KEY = '@language_preference';

interface AvailableLanguage {
  code: LanguageCode;
  /** Human-readable label shown in the language picker. */
  label: string;
}

interface LanguageContextValue {
  /** Currently active language code. */
  language: LanguageCode;
  /** Change the active language and persist the choice. */
  setLanguage: (code: LanguageCode) => void;
  /** Translate a dot-notation key to the current language. */
  t: (key: TranslationKey) => string;
  /** All languages the app supports. */
  availableLanguages: AvailableLanguage[];
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  availableLanguages: [],
});

/** Detect the best supported language from the device locale. */
function detectLanguage(): LanguageCode {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  return (locale in translations ? locale : 'en') as LanguageCode;
}

interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * Provides language state to the component tree.
 * Detects the device locale on first load and restores any persisted
 * user override from AsyncStorage.
 *
 * To add a new language:
 *  1. Add `<code>.json` to `src/locales/`.
 *  2. Add it to `translations` in `src/locales/index.ts`.
 *  3. Add `{ code, label }` to `AVAILABLE_LANGUAGES` below.
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(detectLanguage());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in translations) {
        setLanguageState(stored as LanguageCode);
      }
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLanguageState(code);
    await AsyncStorage.setItem(STORAGE_KEY, code);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => getTranslation(language, key),
    [language],
  );

  // Add new languages here when extending the app
  const availableLanguages = useMemo<AvailableLanguage[]>(
    () => [
      { code: 'en', label: 'English' },
      { code: 'no', label: 'Norsk' },
    ],
    [],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t, availableLanguages }),
    [language, setLanguage, t, availableLanguages],
  );

  // Avoid rendering with the wrong language before AsyncStorage resolves
  if (!isLoaded) return null;

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
