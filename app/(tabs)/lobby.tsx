import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { LobbyScreen } from '../../src/components/ui/lobby';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useGame } from '../../src/context/GameContext';
import { useMultiplayer } from '../../src/context/MultiplayerContext';

/** LAN multiplayer lobby — host or join a game over local Wi-Fi. */
export default function LobbyRoute() {
  const { t } = useLanguage();
  const { state, multiplayerMode } = useGame();
  const { status } = useMultiplayer();
  const router = useRouter();
  const prevStateRef = useRef(state);

  // Navigate to the game screen the moment GAME_START is applied —
  // i.e. when state transitions from null → non-null while in multiplayer mode.
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev && state && multiplayerMode === 'multiplayer' && status === 'connected') {
      router.navigate('/game' as never);
    }
  }, [state, multiplayerMode, status]);

  return (
    <Screen scrollable padded>
      <Header title={t('lobby.title')} />
      <LobbyScreen defaultTab="join" />
    </Screen>
  );
}
