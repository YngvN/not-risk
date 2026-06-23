# CLAUDE.md — Agent Instructions

This file defines the rules and conventions Claude must follow when working in this Expo template project.

---

## Core Principles

### Reusable Code
- Extract repeated logic into components (`src/components/`) or hooks (`src/hooks/`).
- Components must be generic and composable — no screen-specific logic inside shared components.
- Prefer composition over duplication; three similar lines of code is a signal to extract.

### Light / Dark Mode
- Every visual component must use `useTheme()` to get colors from `ThemeContext`.
- Never hardcode color values (no `'#fff'`, `'black'`, `'gray'`, etc.). Always use `colors.<token>`.
- All new color tokens must be added to both `light` and `dark` in `src/constants/colors.ts`.

### Internationalization (i18n)
- Never hardcode user-visible strings. Always use `t()` from `useLanguage()`.
- All new user-facing text must have keys added to both `src/locales/en.json` AND `src/locales/no.json`.
- To add a new language: create `src/locales/<code>.json`, add it to `translations` in `src/locales/index.ts`, and add an entry to `availableLanguages` in `src/context/LanguageContext.tsx`.

### File Length and Splitting
- Split code into multiple focused files rather than writing long files.
- One component per file. One hook per file. One context per file.
- Group related files in subfolders and always export through an `index.ts` barrel file.
- If a file grows beyond ~150 lines, consider splitting it.

### Documentation
- Add JSDoc comments to all exported functions, hooks, and components.
- Comment non-obvious logic — explain WHY, not WHAT.
- All comments and documentation must be in **English**, even if the user communicates in Norwegian.
- JSON config files may include comments where the format allows (use `.jsonc` extension if needed).

---

## Tech Stack — Check Before Installing

Before reaching for a new package, verify that the existing stack cannot already solve the problem. Installing a duplicate or redundant library wastes bundle size and creates two ways to do the same thing.

| Need | Use what's already here |
|------|------------------------|
| Animations (entrance, exit, loop, spring) | **Moti** — `MotiView`, `MotiText`, `AnimatePresence` |
| High-performance / gesture-driven animations | **react-native-reanimated** — `useAnimatedStyle`, `withSpring`, etc. |
| Utility-class styling | **NativeWind** — `className` prop with Tailwind classes |
| Semantic color tokens (theme-aware) | `useTheme()` → `colors.<token>` from `ThemeContext` |
| Icon sets | **@expo/vector-icons** — Ionicons, MaterialIcons, FontAwesome, etc. |
| Navigation / routing | **Expo Router** — file-based, already configured |
| Deep links / URL parsing | **expo-linking** |
| Translation / i18n | `useLanguage()` → `t('key')` + locale JSON files |
| Persistent key-value storage | **AsyncStorage** |
| Device locale detection | **expo-localization** |
| Safe area insets | **react-native-safe-area-context** → `<Screen>` wrapper |
| Custom fonts | **expo-font** |
| Static assets | **expo-asset** |
| App metadata / env constants | **expo-constants** |

Only install a new package when the existing stack **genuinely** cannot cover the requirement. When in doubt, check the README tech stack section first.

---

## README Updates

After completing any task that adds or removes user-facing functionality:
1. Complete the task fully first.
2. At the very end, **ask the user** whether they would like the README updated.
3. Only update the README after the user confirms — never update it automatically.

---

## File Conventions

| Path | Purpose |
|------|---------|
| `src/components/ui/` | Atomic UI components (Button, Text, Input, Card, …) |
| `src/components/layout/` | Layout wrappers (Screen, Header, …) |
| `src/hooks/` | Custom React hooks |
| `src/context/` | React Contexts (theme, language, …) |
| `src/constants/` | Design tokens (colors, spacing, fonts) |
| `src/locales/` | Translation JSON files |
| `app/(tabs)/` | Tab-based screen files (Expo Router) |
| `assets/` | Static assets — icons, splash, fonts |

---

## Adding New UI Components

1. Create `src/components/ui/MyComponent.tsx`.
2. Export it from `src/components/ui/index.ts`.
3. Add a preview section in `app/(tabs)/components.tsx` so it appears in the component gallery.
4. Use `useTheme()` for all colors and `useLanguage()` for all user-visible strings.
5. Add a JSDoc comment describing props and usage.

## Adding New Screens

1. Create the file under `app/(tabs)/` or a new route group.
2. Use `<Screen>` as the root wrapper to get safe-area handling and background color automatically.
3. Add navigation entry in `app/(tabs)/_layout.tsx`.
4. Add localization keys for the screen/tab title in all locale files.

## Adding New Languages

1. Duplicate `src/locales/en.json` → `src/locales/<code>.json` and translate all values.
2. Add the new locale to `translations` in `src/locales/index.ts`.
3. Add `{ code: '<code>', label: 'Display Name' }` to `availableLanguages` in `src/context/LanguageContext.tsx`.

---

## Language Rule

Always write code, comments, and documentation in **English**. If the user communicates in Norwegian, respond in English and implement everything in English.
