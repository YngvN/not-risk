import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/** Access theme colors, current scheme, and toggle function from any component. */
export function useTheme() {
  return useContext(ThemeContext);
}
