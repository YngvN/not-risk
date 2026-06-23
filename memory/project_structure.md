---
name: project-structure
description: Core architecture and file layout of the expo-template project
metadata:
  type: project
---

This is a production-ready Expo template with theming, i18n, and a reusable component library.

**Why:** Serves as a starting point for new Expo apps with conventions already in place.

**How to apply:** When adding features, follow the established folder conventions and always wire up theme + language support.

## Key paths
- `app/(tabs)/` — Expo Router screens (index, components, settings)
- `src/components/ui/` — atomic UI components (Text, Button, Card, Input)
- `src/components/layout/` — layout wrappers (Screen, Header)
- `src/context/` — ThemeContext and LanguageContext (AsyncStorage-persisted)
- `src/hooks/` — useTheme and useLanguage shorthand hooks
- `src/constants/` — colors.ts (light/dark tokens) and spacing.ts
- `src/locales/` — en.json, no.json, index.ts (typed dot-notation keys)

## Theme system
- `useTheme()` → `{ colors, isDark, toggleTheme, setTheme }`
- Never hardcode colors — always use `colors.<token>` from the theme

## i18n system
- `useLanguage()` → `{ t, language, setLanguage, availableLanguages }`
- `t('home.title')` is type-safe (TypeScript `DeepKeys` utility type)
- Languages: `en` (English), `no` (Norwegian)

## Rules (from CLAUDE.md)
- All code and comments in English
- Every component uses useTheme() for colors
- Every user-visible string goes through t()
- Ask user before updating README
- Split long files; one component/hook per file
