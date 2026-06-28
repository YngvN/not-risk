import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../../constants/spacing';
import type { LobbyPlayer } from '../../../services/MultiplayerService';
import { PLAYER_COLOR_HEX } from '../../../context/GameContext';

interface Props {
  players: LobbyPlayer[];
}

/**
 * Renders the list of players currently in the lobby with their
 * connection status, ready state, and color swatch.
 */
export function LobbyPlayerList({ players }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.list}>
      {players.map(player => (
        <View
          key={player.id}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.swatch, { backgroundColor: PLAYER_COLOR_HEX[player.color] }]} />
          <View style={styles.info}>
            <Text variant="body" style={{ color: colors.text }}>
              {player.name}
              {player.isAdmin ? ` (${t('lobby.admin')})` : ''}
            </Text>
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              {!player.connected
                ? t('lobby.disconnected')
                : player.isReady
                ? t('lobby.ready')
                : t('lobby.waiting')}
            </Text>
          </View>
          <View style={[styles.indicator, { backgroundColor: player.connected ? colors.success : colors.error }]} />
        </View>
      ))}
      {players.length === 0 && (
        <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('lobby.noPlayers')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  info: { flex: 1 },
  indicator: { width: 8, height: 8, borderRadius: 4 },
});
