import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { Input } from '../Input';
import { Button } from '../Button';
import { LobbyPlayerList } from './LobbyPlayerList';
import { Text } from '../Text';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { Spacing } from '../../../constants/spacing';
import type { ConnectionStatus, LobbyPlayer } from '../../../services/MultiplayerService';
import type { PlayerColor } from '../../../engine/types';

const DEFAULT_PORT = '8080';

interface Props {
  status: ConnectionStatus;
  players: LobbyPlayer[];
  myId: string | null;
  onConnect: (host: string, port: number, name: string, color: PlayerColor) => void;
  onReady: () => void;
  onDisconnect: () => void;
}

/**
 * Join-side lobby view: IP/port entry form, player name input,
 * and a waiting room once connected.
 */
export function JoinPanel({ status, players, myId, onConnect, onReady, onDisconnect }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [host, setHost] = useState('');
  const [port, setPort] = useState(DEFAULT_PORT);
  const [name, setName] = useState('');
  const [color, setColor] = useState<PlayerColor>('blue');

  // Auto-fill IP from deep link (frisky://join?host=...&port=...)
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (!url) return;
      const { queryParams } = Linking.parse(url);
      if (queryParams?.host) setHost(String(queryParams.host));
      if (queryParams?.port) setPort(String(queryParams.port));
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      const { queryParams } = Linking.parse(url);
      if (queryParams?.host) setHost(String(queryParams.host));
      if (queryParams?.port) setPort(String(queryParams.port));
    });
    return () => sub.remove();
  }, []);

  const connecting = status === 'connecting';
  const connected = status === 'connected';
  const myPlayer = players.find(p => p.id === myId);

  if (connected) {
    return (
      <View style={styles.container}>
        <Text variant="label" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('lobby.players')} ({players.length}/6)
        </Text>
        <LobbyPlayerList players={players} />

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
      <Input
        label={t('lobby.serverIP')}
        placeholder="192.168.1.42"
        value={host}
        onChangeText={setHost}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        autoCorrect={false}
      />
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
  container: { gap: Spacing.md },
  sectionTitle: { marginBottom: -Spacing.xs },
  btn: { marginTop: Spacing.xs },
});
