# fRISKy

A Risk-inspired strategy game for **iOS, Android, and Web**, built with Expo.

---

## Features

### Game Modes
| Mode | Description |
|------|-------------|
| **Classic Conquest** | Eliminate all opponents to win |
| **Secret Mission** | Race to complete a hidden objective (conquer continents, destroy a player, hold territory counts) |
| **Capital Risk** | Each player protects a headquarters; capture it to win |

### Gameplay
- **Full Risk rules** — setup, reinforce, attack, fortify phases with Risk cards and continent bonuses
- **Dice combat** — 1–3 attacking dice vs 1–2 defending dice, animated results panel
- **Risk cards** — infantry, cavalry, artillery, wild; trade sets of 3 for armies
- **AI opponents** — three difficulty levels (easy / medium / hard) with per-phase strategy modules
- **Wheel of fortune** — a spinning wheel reveals the randomised starting player at game start
- **Pass-device hot-seat** — multiple humans on one device, with lock screen between turns
- **Event log** — full game history with map-highlight on tap
- **Undo reinforcements** — freely revise army placements before ending the reinforce phase

### Multiplayer (LAN)
- Host a game from the setup screen via **Make Online**
- Guests scan a **QR code** or enter the server address manually
- **Auto-discovery** — the join screen scans your local Wi-Fi subnet for running games
- Game starts automatically when all players mark **Ready**
- Graceful disconnect handling — hand slot to AI or pause and wait for reconnect

### Maps
- **Classic Risk board** — the original 42-territory layout
- **World map** — full world with all continents
- **North America** and **Africa** focused maps
- Pan/zoom with gesture handler; territory labels with editor overlay (dev mode)

### UI & Polish
- **Light and dark themes** — follows system preference, user-overridable
- **English and Norwegian** — type-safe i18n keys, easy to extend
- **Moti animations** — spring-physics buttons, slide-in player cards, `AnimatePresence` exits
- **Floating nav button** — 3-dot FAB that opens a slide-up navigation panel (hidden on home screen)
- **Mission inspector** — testing overlay showing every player's secret mission and % progress

---

## Getting Started

### App (iOS / Android / Web)

```bash
npm install
npm start          # Expo dev server (scan QR with Expo Go or open in simulator)
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # Web dev server
npm run build:web  # Static web export → dist/
```

### LAN Multiplayer Server

```bash
npm run server          # Run once
npm run server:watch    # Watch mode — restarts on file changes
npm run dev             # Run Expo + server together (recommended for dev)
```

The server starts on port **8080** and prints its LAN IP. Players join via the **Find LAN Game** button on the home screen, or by scanning the QR code shown on the host's setup screen.

---

## Project Structure

```
├── app/
│   ├── _layout.tsx              # Root layout — providers, multiplayer↔game bridge
│   └── (tabs)/
│       ├── index.tsx            # Home screen — new game, resume, find LAN game
│       ├── game.tsx             # Setup screen + all in-game screens
│       ├── lobby.tsx            # LAN join screen (server discovery + manual entry)
│       ├── map.tsx              # Map viewer with dev editing tools
│       ├── settings.tsx         # Theme, language, testing toggles
│       └── components.tsx       # UI component gallery
│
├── server/
│   ├── index.ts                 # HTTP + WebSocket server, LAN IP detection
│   ├── GameServer.ts            # Authoritative game state, action validation
│   ├── LobbyManager.ts          # Player slots, ready state, admin role
│   └── types.ts                 # Client↔server message types
│
└── src/
    ├── ai/                      # AI decision modules (setup, reinforce, attack, fortify)
    ├── assets/maps/             # SVG path data for all maps
    ├── components/
    │   ├── game/                # ActionPanel, BattleResultPanel, EventLog, MissionCard,
    │   │                        #   SpinWheelScreen, ContinentLegend, PassDeviceScreen, …
    │   ├── layout/              # Screen (safe-area), Header, FloatingTabBar
    │   ├── map/                 # RiskBoardMap, ZoomableMap, TerritoryPolygon, LabelEditor
    │   └── ui/                  # Text, Button, Card, Input, Modal, Slider, QrCode
    │       └── lobby/           # HostPanel, JoinPanel, LobbyScreen, LobbyPlayerList
    ├── constants/               # Color tokens, spacing, territory data, AI/player name pools
    ├── context/                 # GameContext, ThemeContext, LanguageContext,
    │                            #   MultiplayerContext, TestingContext
    ├── engine/                  # State machine, board graph, combat, cards, missions, RNG
    ├── hooks/                   # useTheme, useLanguage, useLabelPositions
    ├── locales/                 # en.json, no.json, typed key resolver
    └── services/                # MultiplayerService (WebSocket), DiscoveryService (LAN scan)
```

---

## Tech Stack

### Core
| Package | Purpose |
|---------|---------|
| [Expo](https://expo.dev) ~53 | Build toolchain and SDK |
| [React Native](https://reactnative.dev) 0.76 | Mobile framework |
| [TypeScript](https://www.typescriptlang.org) ^5 | Strict typing throughout |
| [Expo Router](https://expo.github.io/router) ~5 | File-based tab routing, static web export |

### Styling & Animation
| Package | Purpose |
|---------|---------|
| [NativeWind](https://www.nativewind.dev) ^4 | Tailwind CSS classes on React Native; `dark:` variants |
| [Moti](https://moti.fyi) ^0.30 | Declarative spring/timing animations (mobile + web) |
| [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) ~3 | UI-thread animation engine |
| [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/) ~2.24 | Gesture recognition (map pan/zoom, slider) |
| [@expo/vector-icons](https://docs.expo.dev/guides/icons/) ^14 | Ionicons and other icon sets |

### Maps & Graphics
| Package | Purpose |
|---------|---------|
| [react-native-svg](https://github.com/software-mansion/react-native-svg) 15.11 | SVG rendering for game maps |
| [react-native-qrcode-svg](https://github.com/awesomejerry/react-native-qrcode-svg) ^6.3 | QR code display for LAN join |

### Multiplayer & Networking
| Package | Purpose |
|---------|---------|
| [ws](https://github.com/websockets/ws) ^8 | WebSocket server for LAN games |
| [expo-network](https://docs.expo.dev/versions/latest/sdk/network/) ~7.1 | Local IP address detection for discovery |
| [expo-clipboard](https://docs.expo.dev/versions/latest/sdk/clipboard/) ~7.1 | Copy/paste server address |

### Storage & Localization
| Package | Purpose |
|---------|---------|
| [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) 2.1 | Persist game state and preferences |
| [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) ~16 | Device locale detection |

---

## Theming

All colors come from `useTheme()` — never hardcode hex values.

```typescript
const { colors, isDark, toggleTheme } = useTheme();

<View style={{ backgroundColor: colors.surface }} />
<Text style={{ color: colors.primary }} />
```

Color tokens are defined in [src/constants/colors.ts](src/constants/colors.ts) for both `light` and `dark` palettes.

---

## Internationalization

```typescript
const { t } = useLanguage();
t('game.startGame')  // "Start Game" | "Start spill"
```

Keys are type-safe (TypeScript dot-notation). To add a language:

1. Copy `src/locales/en.json` → `src/locales/<code>.json` and translate all values.
2. Add the locale to `translations` in [src/locales/index.ts](src/locales/index.ts).
3. Add `{ code, label }` to `availableLanguages` in [src/context/LanguageContext.tsx](src/context/LanguageContext.tsx).

---

## Adding a New UI Component

1. Create `src/components/ui/MyComponent.tsx`.
2. Export from `src/components/ui/index.ts`.
3. Add a preview in `app/(tabs)/components.tsx`.
4. Use `useTheme()` for all colors, `useLanguage()` for all strings.

---

## Credits

Risk map SVG:
By Gr0gmint — Own work, based on a Risk board game. CC BY-SA 3.0
https://commons.wikimedia.org/w/index.php?curid=5184827
