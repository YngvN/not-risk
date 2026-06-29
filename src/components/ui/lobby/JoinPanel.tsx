import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Input } from '../Input';
import { Button } from '../Button';
import { LobbyPlayerList } from './LobbyPlayerList';
import { Text } from '../Text';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { Spacing } from '../../../constants/spacing';
import type { ConnectionStatus, LobbyPlayer, GameStartConfig } from '../../../services/MultiplayerService';
import type { PlayerColor } from '../../../engine/types';
import { PLAYER_COLOR_HEX } from '../../../context/GameContext';
import { BorderRadius } from '../../../constants/spacing';

const DEFAULT_PORT = '8080';

/** Parses "IP:PORT" or bare "IP" strings copied from the host's QR card. */
function parseAddress(raw: string): { host: string; port: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^([\d.]+)(?::(\d+))?$/);
  if (!match) return null;
  return { host: match[1], port: match[2] ?? DEFAULT_PORT };
}

interface Props {
  status: ConnectionStatus;
  players: LobbyPlayer[];
  lobbyConfig: GameStartConfig | null;
  myId: string | null;
  onConnect: (host: string, port: number, name: string, color: PlayerColor) => void;
  onReady: () => void;
  onDisconnect: () => void;
}

/**
 * Join-side lobby view: address entry form with a paste button that parses
 * "IP:PORT" strings copied from the host's QR card.
 */
export function JoinPanel({ status, players, lobbyConfig, myId, onConnect, onReady, onDisconnect }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [host, setHost] = useState('');
  const [port, setPort] = useState(DEFAULT_PORT);
  const [name, setName] = useState('');
  const [color] = useState<PlayerColor>('blue');
  const [pasteError, setPasteError] = useState(false);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    const parsed = parseAddress(text);
    if (parsed) {
      setHost(parsed.host);
      setPort(parsed.port);
      setPasteError(false);
    } else {
      setPasteError(true);
      setTimeout(() => setPasteError(false), 2000);
    }
  };

  const connecting = status === 'connecting';
  const connected = status === 'connected';
  const myPlayer = players.find(p => p.id === myId);

  if (connected) {
    const allPlayers = [
      ...players,
      ...(lobbyConfig?.localSlots ?? []).map((s, i) => ({
        id: `local-${i}`, name: s.name, color: s.color,
        isAdmin: false, isReady: true, connected: true, isLocal: true,
      })),
      ...(lobbyConfig?.aiSlots ?? []).map((s, i) => ({
        id: `ai-${i}`, name: s.name, color: s.color,
        isAdmin: false, isReady: true, connected: true, isAI: true,
      })),
    ];

    const modeLabel: Record<string, Parameters<typeof t>[0]> = {
      classic: 'game.modeClassic', mission: 'game.modeMission', capital: 'game.modeCapital',
    };

    return (
      <View style={styles.container}>
        {/* Game settings — read-only mirror of what the host has set */}
        {lobbyConfig && (
          <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="label" style={{ color: colors.textSecondary }}>{t('game.modeLabel')}</Text>
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
              {t(modeLabel[lobbyConfig.mode] ?? 'game.modeClassic')}
            </Text>
            {lobbyConfig.setupMode === 'random' && (
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                · {t('game.setupModeRandom')}
              </Text>
            )}
            {lobbyConfig.randomPlacement && (
              <Text variant="caption" style={{ color: colors.textSecondary }}>
                · {t('game.setupModeRandomPlacement')}
              </Text>
            )}
          </View>
        )}

        {/* Full player list including local + AI slots from host */}
        <Text variant="label" style={{ color: colors.textSecondary }}>
          {t('lobby.players')} ({allPlayers.length}/6)
        </Text>
        {allPlayers.map(player => (
          <View
            key={player.id}
            style={[styles.playerRow, {
              backgroundColor: colors.surface,
              borderColor: 'isLocal' in player ? colors.border : colors.primary,
            }]}
          >
            <View style={[styles.swatch, { backgroundColor: PLAYER_COLOR_HEX[player.color] }]} />
            <Text variant="body" style={{ color: colors.text, flex: 1 }}>{player.name}</Text>
            {'isAI' in player && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {t('game.aiLabel')}
                </Text>
              </View>
            )}
            {'isLocal' in player && (
              <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {t('lobby.localBadge')}
                </Text>
              </View>
            )}
            {!('isAI' in player) && !('isLocal' in player) && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>LAN</Text>
              </View>
            )}
          </View>
        ))}

        {myPlayer && !myPlayer.isReady && (
          <Button label={t('lobby.markReady')} onPress={onReady} style={styles.btn} />
        )}
        {myPlayer?.isReady && (
          <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('lobby.waitingForAdmin')}
          </Text>
        )}
        <Button label={t('common.back')} variant="ghost" onPress={onDisconnect} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="caption" style={{ color: colors.textSecondary }}>
        {t('lobby.joinHint')}
      </Text>

      <View style={styles.addressRow}>
        <View style={{ flex: 1 }}>
          <Input
            label={t('lobby.serverIP')}
            placeholder="10.0.0.57"
            value={host}
            onChangeText={text => {
              // Accept "IP:PORT" typed or pasted directly into the IP field
              const parsed = parseAddress(text);
              if (parsed && text.includes(':')) {
                setHost(parsed.host);
                setPort(parsed.port);
              } else {
                setHost(text);
              }
            }}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Button
          label={pasteError ? '✕' : t('lobby.paste')}
          variant="outline"
          onPress={handlePaste}
          style={styles.pasteBtn}
        />
      </View>

      <Input
        label={t('lobby.port')}
        placeholder={DEFAULT_PORT}
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <Input
        label={t('lobby.yourName')}
        placeholder={t('lobby.namePlaceholder')}
        value={name}
        onChangeText={setName}
        maxLength={20}
      />

      {status === 'error' && (
        <Text variant="caption" style={{ color: colors.error }}>
          {t('lobby.connectionFailed')}
        </Text>
      )}

      <Button
        label={t('lobby.connect')}
        onPress={() => onConnect(host.trim(), Number(port) || 8080, name.trim() || t('lobby.defaultName'), color)}
        loading={connecting}
        disabled={connecting || !host.trim()}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { gap: Spacing.md },
  addressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  pasteBtn:   { marginBottom: 1 },
  btn:        { marginTop: Spacing.xs },
  configCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: 4 },
  playerRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  swatch:     { width: 16, height: 16, borderRadius: 8 },
  badge:      { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
});
