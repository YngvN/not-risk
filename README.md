# Expo Template

A production-ready Expo starter for **mobile (iOS/Android) and web**, with:

- **Light/Dark mode** — follows system preference, user-overridable via Settings
- **Internationalization** — English and Norwegian; easily extensible
- **NativeWind v4** — Tailwind CSS classes on every React Native component
- **Moti** — Framer Motion-style animations that work on mobile and web
- **Expo Router v5** — file-based tab navigation with static web output
- **Typed reusable component library** — Text, Button, Card, Input, AnimatedCard, PressableScale, Screen, Header

---

## Screens

| Tab | Route | Description |
|-----|-------|-------------|
| Home | `/(tabs)/` | Welcome screen |
| Components | `/(tabs)/components` | Live preview of every UI component, NativeWind badges, and Moti animations |
| Settings | `/(tabs)/settings` | Toggle theme and language |

---

## Getting Started

```bash
npm install
npx expo start          # opens Expo Go / dev server
npm run web             # web dev server
npm run build:web       # static web export → dist/
```

> **Assets**: Replace the placeholder images in `assets/images/` (`icon.png`, `splash.png`, `adaptive-icon.png`, `favicon.png`) with your own before publishing.

---

## Project Structure

```
├── app/
│   ├── _layout.tsx              # Root layout — providers + global.css import
│   └── (tabs)/
│       ├── _layout.tsx          # Tab bar (themed + i18n titles)
│       ├── index.tsx            # Home screen
│       ├── components.tsx       # Component gallery
│       └── settings.tsx         # Theme + language settings
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Text.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── AnimatedCard.tsx   # Moti fade+slide entrance
│   │   │   └── PressableScale.tsx # Moti spring press feedback
│   │   └── layout/
│   │       ├── Screen.tsx         # Safe-area wrapper
│   │       └── Header.tsx
│   ├── context/
│   │   ├── ThemeContext.tsx       # Light/dark state + NativeWind sync
│   │   └── LanguageContext.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   └── useLanguage.ts
│   ├── constants/
│   │   ├── colors.ts              # Light/dark color token sets
│   │   └── spacing.ts
│   └── locales/
│       ├── en.json
│       ├── no.json
│       └── index.ts               # Typed dot-notation key resolver
├── global.css                     # Tailwind entry point for NativeWind
├── tailwind.config.js
├── metro.config.js                # NativeWind Metro integration
└── assets/images/                 # Replace with real assets (gitignored)
```

---

## Theming

`ThemeContext` manages light/dark state and keeps NativeWind in sync so Tailwind `dark:` variants activate when the user switches themes in Settings.

```typescript
const { colors, isDark, toggleTheme } = useTheme();

// StyleSheet approach — use color tokens, never raw hex
<View style={{ backgroundColor: colors.surface }} />

// NativeWind approach — dark: prefix switches automatically
<View className="bg-white dark:bg-gray-900 rounded-xl p-4" />
```

Color tokens are defined in [src/constants/colors.ts](src/constants/colors.ts).

---

## NativeWind (Tailwind CSS)

Tailwind classes work on every React Native component via `className`. The `dark:` prefix activates when the app is in dark mode.

```tsx
<View className="flex-row gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
  <Text className="text-blue-600 dark:text-blue-400 font-semibold">
    Hello NativeWind
  </Text>
</View>
```

Configured in [tailwind.config.js](tailwind.config.js). Extend `theme.extend.colors` there to add brand tokens.

---

## Moti Animations

Moti is the Expo/React Native equivalent of Framer Motion. It runs on **both mobile and web** via `react-native-reanimated`.

### AnimatedCard — entrance animation

```tsx
import { AnimatedCard } from '../src/components';

// Stagger a list with the delay prop
{items.map((item, i) => (
  <AnimatedCard key={item.id} delay={i * 100}>
    <Text>{item.title}</Text>
  </AnimatedCard>
))}
```

### PressableScale — spring press feedback

```tsx
import { PressableScale } from '../src/components';

<PressableScale onPress={handlePress}>
  <Card>Tap me</Card>
</PressableScale>
```

### Custom Moti animations

```tsx
import { MotiView } from 'moti';

// Infinite pulse
<MotiView
  from={{ opacity: 0.4 }}
  animate={{ opacity: 1 }}
  transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
/>

// Enter/exit with AnimatePresence
import { AnimatePresence } from 'moti';

<AnimatePresence>
  {visible && (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card>Modal content</Card>
    </MotiView>
  )}
</AnimatePresence>
```

---

## Internationalization

```typescript
const { t, language, setLanguage } = useLanguage();
t('home.welcome')  // "Welcome to Expo Template" | "Velkommen til Expo-mal"
```

Translation keys are type-safe (TypeScript dot-notation). To add a language:

1. Duplicate `src/locales/en.json` → `src/locales/<code>.json` and translate.
2. Add to `translations` in [src/locales/index.ts](src/locales/index.ts).
3. Add `{ code, label }` to `availableLanguages` in [src/context/LanguageContext.tsx](src/context/LanguageContext.tsx).

---

## Component Library

| Component | Key Props | Description |
|-----------|-----------|-------------|
| `Text` | `variant`, `secondary` | h1–h3, body, label, caption |
| `Button` | `label`, `variant`, `loading`, `disabled` | primary / secondary / outline / ghost |
| `Card` | `...ViewProps` | Themed surface |
| `Input` | `label`, `error` | Focus + error states |
| `AnimatedCard` | `delay` | Card with Moti entrance animation |
| `PressableScale` | `onPress`, `scale` | Spring press feedback wrapper |
| `Screen` | `scrollable`, `padded` | Safe-area wrapper |
| `Header` | `title`, `left`, `right` | Page header with action slots |

Import from the barrel:

```typescript
import { Text, Button, AnimatedCard, PressableScale } from '../src/components';
```

---

## Tech Stack

### Core

| Package | Version | Purpose |
|---------|---------|---------|
| [Expo](https://expo.dev) | ~53 | Build toolchain and SDK |
| [React Native](https://reactnative.dev) | 0.76.9 | Mobile app framework |
| [React](https://react.dev) | 19.2.7 | UI library |
| [TypeScript](https://www.typescriptlang.org) | ^5 | Strict type checking throughout |

### Navigation & Routing

| Package | Version | Purpose |
|---------|---------|---------|
| [Expo Router](https://expo.github.io/router) | ~5 | File-based routing, tab navigation, static web output |
| [expo-linking](https://docs.expo.dev/versions/latest/sdk/linking/) | ~7 | Deep linking and URL handling |
| [expo-constants](https://docs.expo.dev/versions/latest/sdk/constants/) | ~17 | App metadata and environment constants |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| [NativeWind](https://www.nativewind.dev) | ^4 | Tailwind CSS classes on every RN component; `dark:` variants sync with theme |
| [Tailwind CSS](https://tailwindcss.com) | ^4 | Utility-class source for NativeWind |
| [react-native-web](https://necolas.github.io/react-native-web/) | ^0.20 | Renders React Native components in the browser |
| [@expo/vector-icons](https://docs.expo.dev/guides/icons/) | ^14 | Icon sets (Ionicons, MaterialIcons, etc.) |

### Animation

| Package | Version | Purpose |
|---------|---------|---------|
| [Moti](https://moti.fyi) | ^0.30 | Framer Motion-style declarative animations (mobile + web) |
| [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) | ~3 | High-performance animation engine (Moti's runtime) |

### Internationalization & Storage

| Package | Version | Purpose |
|---------|---------|---------|
| [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) | ~16 | Device locale detection |
| [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) | 2.1.2 | Persist theme and language preferences |

### Platform Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) | 5.4.0 | Safe area insets (notch, home bar) |
| [react-native-screens](https://github.com/software-mansion/react-native-screens) | ~4 | Native navigation screen optimisation |
| [expo-status-bar](https://docs.expo.dev/versions/latest/sdk/status-bar/) | ~2 | Status bar style control |
| [expo-font](https://docs.expo.dev/versions/latest/sdk/font/) | ~13 | Custom font loading |
| [expo-asset](https://docs.expo.dev/versions/latest/sdk/asset/) | ~11 | Static asset management |
| [react-dom](https://react.dev) | 19.2.7 | React DOM renderer (web only) |


### Credits

Risk map:
By Gr0gmint - Own work by uploader - based on a Risk board i own., CC BY-SA 3.0, https://commons.wikimedia.org/w/index.php?curid=5184827