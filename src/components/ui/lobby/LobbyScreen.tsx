import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../Text';
import { HostPanel } from './HostPanel';
import { JoinPanel } from './JoinPanel';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { useMultiplayer } from '../../../context/MultiplayerContext';
import { Spacing, BorderRadius } from '../../../constants/spacing';
import type { GameStartConfig } from '../../../services/MultiplayerService';
import { multiplayerService } from '../../../services/MultiplayerService';
import type { PlayerColor } from '../../../engine/types';

type Tab = 'host' | 'join';

interface LobbyScreenProps {
  /** Which tab to open by default. Defaults to 'host'. */
  defaultTab?: Tab;
}

/**
 * Top-level lobby screen. Toggles between host view (QR code + player list)
 * and join view (IP entry form). Powered by MultiplayerContext.
 */
export function LobbyScreen({ defaultTab = 'host' }: LobbyScreenProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const {
    status, myId, isAdmin, serverIp, serverPort,
    lobbyPlayers, lobbyConfig, droppedPlayer,
    connect, disconnect, markReady, sendDisconnectChoice,
  } = useMultiplayer();

  const [tab, setTab] = useState<Tab>(defaultTab);

  const handleConnect = (host: string, port: number, name: string, color: PlayerColor) => {
    connect(host, port, name, color);
  };

  const handleConfigChange = (config: GameStartConfig) => {
    multiplayerService.send({ type: 'SET_CONFIG', config });
  };

  const isConnected = status === 'connected';

  return (
    <View style={styles.container}>
      {/* Tab toggle — hide when already connected (tab is fixed at that point) */}
      {!isConnected && (
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['host', 'join'] as Tab[]).map(t2 => (
            <Pressable
              key={t2}
              style={({ pressed }) => [styles.tab, tab === t2 && { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
              onPress={() => setTab(t2)}
            >
              <Text
                variant="label"
                style={{ color: tab === t2 ? colors.background : colors.textSecondary }}
              >
                {t2 === 'host' ? t('lobby.tabHost') : t('lobby.tabJoin')}
              </Text>
            </Pressable>
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
          onConfigChange={handleConfigChange}
          onReady={markReady}
          onDisconnectChoice={sendDisconnectChoice}
        />
      ) : (
        <JoinPanel
          status={status}
          players={lobbyPlayers}
          lobbyConfig={lobbyConfig}
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
