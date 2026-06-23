import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

/** Access the translation function, current language, and language setter from any component. */
export function useLanguage() {
  return useContext(LanguageContext);
}
