import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../Text';
import { HostPanel } from './HostPanel';
import { JoinPanel } from './JoinPanel';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { useMultiplayer } from '../../../context/MultiplayerContext';
import { Spacing, BorderRadius } from '../../../constants/spacing';
import type { GameStartConfig } from '../../../services/MultiplayerService';
import type { PlayerColor } from '../../../engine/types';

type Tab = 'host' | 'join';

/**
 * Top-level lobby screen. Toggles between host view (QR code + player list)
 * and join view (IP entry form). Powered by MultiplayerContext.
 */
export function LobbyScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    status, myId, isAdmin, serverIp, serverPort,
    lobbyPlayers, droppedPlayer,
    connect, disconnect, markReady, startGame, sendDisconnectChoice,
  } = useMultiplayer();

  const [tab, setTab] = useState<Tab>('host');

  const handleConnect = (host: string, port: number, name: string, color: PlayerColor) => {
    connect(host, port, name, color);
  };

  const handleStart = (config: GameStartConfig) => {
    startGame(config);
  };

  const isConnected = status === 'connected';

  return (
    <View style={styles.container}>
      {/* Tab toggle — hide when already connected (tab is fixed at that point) */}
      {!isConnected && (
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['host', 'join'] as Tab[]).map(t2 => (
            <TouchableOpacity
              key={t2}
              style={[styles.tab, tab === t2 && { backgroundColor: colors.primary }]}
              onPress={() => setTab(t2)}
              activeOpacity={0.7}
            >
              <Text
                variant="label"
                style={{ color: tab === t2 ? colors.background : colors.textSecondary }}
              >
                {t2 === 'host' ? t('lobby.tabHost') : t('lobby.tabJoin')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tab === 'host' ? (
        <HostPanel
          status={status}
          serverIp={serverIp}
          serverPort={serverPort}
          players={lobbyPlayers}
          droppedPlayerId={droppedPlayer?.playerId ?? null}
          isAdmin={isAdmin}
          onConnect={handleConnect}
          onDisconnect={disconnect}
          onStart={handleStart}
          onDisconnectChoice={sendDisconnectChoice}
        />
      ) : (
        <JoinPanel
          status={status}
          players={lobbyPlayers}
          myId={myId}
          onConnect={handleConnect}
          onReady={markReady}
          onDisconnect={disconnect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  tabs: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
