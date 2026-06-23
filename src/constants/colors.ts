/**
 * Design tokens for light and dark color schemes.
 * All components must reference these tokens — never hardcode color values.
 */
export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#007AFF',
    primaryDark: '#0056B3',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E0E0E0',
    icon: '#666666',
    iconActive: '#007AFF',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    primary: '#0A84FF',
    primaryDark: '#0056B3',
    text: '#FFFFFF',
    textSecondary: '#ABABAB',
    border: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    card: '#1C1C1E',
    tabBar: '#1C1C1E',
    tabBarBorder: '#38383A',
    icon: '#ABABAB',
    iconActive: '#0A84FF',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
