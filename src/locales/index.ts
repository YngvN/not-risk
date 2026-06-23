import en from './en.json';
import no from './no.json';

/** All supported locales keyed by ISO 639-1 language code. */
export const translations = { en, no } as const;

export type LanguageCode = keyof typeof translations;

/**
 * Recursive type that produces all dot-notation key paths for a nested object.
 * Example: DeepKeys<{ home: { title: string } }> => 'home.title'
 */
type DeepKeys<T extends Record<string, unknown>, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? DeepKeys<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

/** All valid dot-notation translation keys derived from the English locale file. */
export type TranslationKey = DeepKeys<typeof en>;

/**
 * Resolves a dot-notation key to its translated string.
 * Falls back to English if the key is missing in the requested language.
 */
export function getTranslation(lang: LanguageCode, key: TranslationKey): string {
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations[lang];
  for (const part of parts) {
    value = value?.[part];
  }
  if (typeof value === 'string') return value;

  // Fallback to English
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: any = translations.en;
  for (const part of parts) {
    fallback = fallback?.[part];
  }
  return typeof fallback === 'string' ? fallback : key;
}
