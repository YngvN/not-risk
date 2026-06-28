import '../global.css';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { GameProvider, useGame } from '../src/context/GameContext';
import { MultiplayerProvider, useMultiplayer } from '../src/context/MultiplayerContext';

/**
 * Wires MultiplayerContext ↔ GameContext without either knowing about the other.
 * When a multiplayer session is active, game actions go to the server and
 * authoritative state comes back from the server.
 */
function MultiplayerGameBridge() {
  const game = useGame();
  const mp = useMultiplayer();

  useEffect(() => {
    if (mp.status === 'connected') {
      game.setMultiplayerDispatch(mp.sendAction);
      mp.registerStateHandler(game.applyNetworkState);
    } else {
      game.setMultiplayerDispatch(null);
      mp.registerStateHandler(null);
    }
  }, [mp.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/**
 * Root layout.
 * Wraps the entire app in ThemeProvider and LanguageProvider so every
 * screen has access to colors and translations via useTheme() / useLanguage().
 *
 * Stack animation:
 *   - iOS/Android: native 'ios' slide push/pop
 *   - Web: 'fade' (slide_from_right doesn't translate well to CSS transitions)
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <MultiplayerProvider>
            <GameProvider>
              <MultiplayerGameBridge />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: Platform.select({ web: 'fade', default: 'slide_from_right' }),
                }}
              />
            </GameProvider>
          </MultiplayerProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
