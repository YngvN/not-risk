/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // NativeWind manages dark mode through setColorScheme(); keep 'class' so
  // Tailwind emits dark: variants that NativeWind activates programmatically.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mirror the design tokens from src/constants/colors.ts so Tailwind
        // classes can reference the same semantic palette.
        primary: {
          DEFAULT: '#007AFF',
          dark: '#0A84FF',
        },
      },
    },
  },
  plugins: [],
};
