import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../Input';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { LobbyPlayerList } from './LobbyPlayerList';
import { Text } from '../Text';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../../constants/spacing';
import { scanForServers, type DiscoveredServer } from '../../../services/DiscoveryService';
import type { ConnectionStatus, LobbyPlayer, GameStartConfig } from '../../../services/MultiplayerService';
import type { PlayerColor } from '../../../engine/types';
import { PLAYER_COLOR_HEX } from '../../../context/GameContext';

const DEFAULT_PORT = '8080';

function parseAddress(raw: string): { host: string; port: string } | null {
  const match = raw.trim().match(/^([\d.]+)(?::(\d+))?$/);
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
 * Join-side lobby panel.
 *
 * Default: scans the local subnet for fRISKy servers and lists them.
 * Tapping a server shows a name prompt and connects.
 * "Enter manually" opens a modal for direct IP/port entry.
 */
export function JoinPanel({ status, players, lobbyConfig, myId, onConnect, onReady, onDisconnect }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // ── Discovery state ───────────────────────────────────────────────────────
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [scanning, setScanning] = useState(false);
  const scanAbort = useRef<AbortController | null>(null);

  // Pending server the user tapped — waits for name before connecting
  const [pendingServer, setPendingServer] = useState<DiscoveredServer | null>(null);
  const [pendingName, setPendingName] = useState('');

  // Manual entry modal
  const [showManual, setShowManual] = useState(false);
  const [manualHost, setManualHost] = useState('');
  const [manualPort, setManualPort] = useState(DEFAULT_PORT);
  const [manualName, setManualName] = useState('');
  const [pasteError, setPasteError] = useState(false);

  const scan = useCallback(() => {
    scanAbort.current?.abort();
    const ctrl = new AbortController();
    scanAbort.current = ctrl;

    setServers([]);
    setScanning(true);

    scanForServers(Number(manualPort) || 8080, server => {
      setServers(prev => {
        if (prev.some(s => s.ip === server.ip)) return prev;
        return [...prev, server];
      });
    }, ctrl.signal).finally(() => {
      if (!ctrl.signal.aborted) setScanning(false);
    });
  }, [manualPort]);

  useEffect(() => {
    scan();
    return () => scanAbort.current?.abort();
  }, []);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    const parsed = parseAddress(text);
    if (parsed) {
      setManualHost(parsed.host);
      setManualPort(parsed.port);
      setPasteError(false);
    } else {
      setPasteError(true);
      setTimeout(() => setPasteError(false), 2000);
    }
  };

  // ── Connected / waiting room view ─────────────────────────────────────────
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

    const modeKey: Record<string, Parameters<typeof t>[0]> = {
      classic: 'game.modeClassic', mission: 'game.modeMission', capital: 'game.modeCapital',
    };

    return (
      <View style={styles.container}>
        {lobbyConfig && (
          <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="label" style={{ color: colors.textSecondary }}>{t('game.modeLabel')}</Text>
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
              {t(modeKey[lobbyConfig.mode] ?? 'game.modeClassic')}
            </Text>
            {lobbyConfig.setupMode === 'random' && (
              <Text variant="caption" style={{ color: colors.textSecondary }}>· {t('game.setupModeRandom')}</Text>
            )}
            {lobbyConfig.randomPlacement && (
              <Text variant="caption" style={{ color: colors.textSecondary }}>· {t('game.setupModeRandomPlacement')}</Text>
            )}
          </View>
        )}

        <Text variant="label" style={{ color: colors.textSecondary }}>
          {t('lobby.players')} ({allPlayers.length}/6)
        </Text>
        {allPlayers.map(player => (
          <View key={player.id} style={[styles.playerRow, {
            backgroundColor: colors.surface,
            borderColor: 'isLocal' in player || 'isAI' in player ? colors.border : colors.primary,
          }]}>
            <View style={[styles.swatch, { backgroundColor: PLAYER_COLOR_HEX[player.color] }]} />
            <Text variant="body" style={{ color: colors.text, flex: 1 }}>{player.name}</Text>
            {'isAI' in player && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{t('game.aiLabel')}</Text>
              </View>
            )}
            {'isLocal' in player && (
              <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{t('lobby.localBadge')}</Text>
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
          <Button label={t('lobby.markReady')} onPress={onReady} />
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

  // ── Discovery view ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Server list */}
      <View style={styles.listHeader}>
        <Text variant="label" style={{ color: colors.textSecondary }}>{t('lobby.availableServers')}</Text>
        <Pressable onPress={scan} disabled={scanning} style={styles.refreshBtn}>
          {scanning
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="refresh-outline" size={18} color={colors.primary} />}
        </Pressable>
      </View>

      {servers.length === 0 && !scanning && (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="wifi-outline" size={32} color={colors.textSecondary} />
          <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('lobby.noServersFound')}
          </Text>
        </View>
      )}

      {servers.map(server => (
        <Pressable
          key={server.ip}
          onPress={() => { setPendingServer(server); setPendingName(''); }}
          style={[styles.serverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.serverInfo}>
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>
              {server.host}
            </Text>
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              {server.ip}:{server.port}
            </Text>
          </View>
          <View style={styles.serverMeta}>
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              {server.playerCount}/6
            </Text>
            {server.started && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text variant="caption" style={{ color: '#fff', fontSize: 10 }}>{t('lobby.inProgress')}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward-outline" size={16} color={colors.textSecondary} />
        </Pressable>
      ))}

      {/* Name prompt after tapping a server */}
      <Modal
        visible={pendingServer !== null}
        onClose={() => setPendingServer(null)}
        title={pendingServer ? `${pendingServer.host}` : ''}
      >
        <View style={styles.modalBody}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            {pendingServer?.ip}:{pendingServer?.port}
          </Text>
          <Input
            label={t('lobby.yourName')}
            placeholder={t('lobby.namePlaceholder')}
            value={pendingName}
            onChangeText={setPendingName}
            maxLength={20}
            autoFocus
          />
          {status === 'error' && (
            <Text variant="caption" style={{ color: colors.error }}>{t('lobby.connectionFailed')}</Text>
          )}
          <Button
            label={t('lobby.connect')}
            loading={status === 'connecting'}
            disabled={status === 'connecting' || !pendingName.trim()}
            onPress={() => {
              if (!pendingServer) return;
              onConnect(pendingServer.ip, pendingServer.port, pendingName.trim(), 'blue');
            }}
          />
        </View>
      </Modal>

      {/* Manual entry button */}
      <Button
        label={t('lobby.enterManually')}
        variant="ghost"
        onPress={() => setShowManual(true)}
      />

      {/* Manual entry modal */}
      <Modal visible={showManual} onClose={() => setShowManual(false)} title={t('lobby.enterManually')}>
        <View style={styles.modalBody}>
          <View style={styles.addressRow}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('lobby.serverIP')}
                placeholder="10.0.0.57"
                value={manualHost}
                onChangeText={text => {
                  const parsed = parseAddress(text);
                  if (parsed && text.includes(':')) { setManualHost(parsed.host); setManualPort(parsed.port); }
                  else setManualHost(text);
                }}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Button label={pasteError ? '✕' : t('lobby.paste')} variant="outline" onPress={handlePaste} style={styles.pasteBtn} />
          </View>
          <Input label={t('lobby.port')} placeholder={DEFAULT_PORT} value={manualPort} onChangeText={setManualPort} keyboardType="number-pad" />
          <Input label={t('lobby.yourName')} placeholder={t('lobby.namePlaceholder')} value={manualName} onChangeText={setManualName} maxLength={20} />
          {status === 'error' && (
            <Text variant="caption" style={{ color: colors.error }}>{t('lobby.connectionFailed')}</Text>
          )}
          <Button
            label={t('lobby.connect')}
            loading={status === 'connecting'}
            disabled={status === 'connecting' || !manualHost.trim()}
            onPress={() => {
              onConnect(manualHost.trim(), Number(manualPort) || 8080, manualName.trim() || t('lobby.defaultName'), 'blue');
              setShowManual(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { gap: Spacing.md },
  listHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  refreshBtn:  { padding: 4 },
  emptyCard:   { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl,
                 borderRadius: BorderRadius.lg, borderWidth: 1 },
  serverCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                 padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  serverInfo:  { flex: 1, gap: 2 },
  serverMeta:  { alignItems: 'flex-end', gap: 4 },
  configCard:  { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: 4 },
  playerRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                 padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  swatch:      { width: 16, height: 16, borderRadius: 8 },
  badge:       { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  modalBody:   { gap: Spacing.md },
  addressRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  pasteBtn:    { marginBottom: 1 },
});
