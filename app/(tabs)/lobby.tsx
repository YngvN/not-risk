import React from 'react';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { LobbyScreen } from '../../src/components/ui/lobby';
import { useLanguage } from '../../src/hooks/useLanguage';

/** LAN multiplayer lobby — host or join a game over local Wi-Fi. */
export default function LobbyRoute() {
  const { t } = useLanguage();

  return (
    <Screen scrollable padded>
      <Header title={t('lobby.title')} />
      <LobbyScreen />
    </Screen>
  );
}
