import React, { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { QrCode } from '../QrCode';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { Button } from '../Button';
import { Input } from '../Input';
import { Modal } from '../Modal';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';
import { Spacing, BorderRadius, FontSize } from '../../../constants/spacing';
import { PLAYER_COLOR_HEX } from '../../../context/GameContext';
import type { LobbyPlayer, GameStartConfig } from '../../../services/MultiplayerService';
import type { ConnectionStatus } from '../../../services/MultiplayerService';
import type { PlayerColor, GameMode, AIDifficulty } from '../../../engine/types';

const ALL_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const DEFAULT_PORT = '8080';

interface LocalSlot { name: string; color: PlayerColor }
interface AiSlot   { name: string; color: PlayerColor; difficulty: AIDifficulty }

interface Props {
  status: ConnectionStatus;
  /** LAN IP received from server WELCOME — may arrive slightly after connection. */
  serverIp: string | null;
  serverPort: number;
  players: LobbyPlayer[];
  droppedPlayerId: string | null;
  isAdmin: boolean;
  onConnect: (host: string, port: number, name: string, color: PlayerColor) => void;
  onDisconnect: () => void;
  onConfigChange: (config: GameStartConfig) => void;
  onStart: (config: GameStartConfig) => void;
  onDisconnectChoice: (choice: 'ai' | 'pause') => void;
}

function nextFreeColor(taken: PlayerColor[]): PlayerColor {
  return ALL_COLORS.find(c => !taken.includes(c)) ?? 'red';
}

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <View style={[styles.checkboxBox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.surface }]}>
        {checked && <Text variant="caption" style={{ color: '#fff', fontWeight: '700', lineHeight: 16 }}>✓</Text>}
      </View>
      <Text variant="body" style={{ color: colors.text, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Host-side lobby panel.
 *
 * Form state (host/port/name) lives here so it survives the ConnectForm → lobby
 * view transition. The typed host IP is used immediately as the QR source;
 * the server's WELCOME IP is preferred when available.
 */
export function HostPanel({
  status, serverIp, serverPort, players, droppedPlayerId,
  isAdmin, onConnect, onDisconnect, onConfigChange, onStart, onDisconnectChoice,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Form state lives here so it persists after ConnectForm unmounts
  const [host, setHost] = useState('');
  const [port, setPort] = useState(DEFAULT_PORT);
  const [name, setName] = useState('');

  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUrl = async (url: string) => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [randomDeal, setRandomDeal] = useState(false);
  const [randomPlacement, setRandomPlacement] = useState(false);
  const [localSlots, setLocalSlots] = useState<LocalSlot[]>([]);
  const [aiSlots, setAiSlots] = useState<AiSlot[]>([]);

  const connected = status === 'connected';

  // Prefer the server's WELCOME IP; fall back to what the user typed.
  const displayIp      = serverIp ?? host;
  const displayPort    = serverIp ? serverPort : (Number(port) || 8080);
  // Plain "IP:PORT" string — no URL scheme so cameras show it as copyable text,
  // and it works without the app being registered as a URL scheme handler.
  const serverAddress  = displayIp ? `${displayIp}:${displayPort}` : null;

  const takenColors   = [...players.map(p => p.color), ...localSlots.map(s => s.color), ...aiSlots.map(s => s.color)];
  const totalPlayers  = players.length + localSlots.length + aiSlots.length;
  const canStart      = totalPlayers >= 2;

  const addLocal = () => {
    if (totalPlayers >= 6) return;
    setLocalSlots(prev => [...prev, { name: t('game.humanLabel'), color: nextFreeColor(takenColors) }]);
  };
  const removeLocal = (i: number) => setLocalSlots(prev => prev.filter((_, j) => j !== i));
  const updateLocal = (i: number, patch: Partial<LocalSlot>) =>
    setLocalSlots(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));

  const addAI = () => {
    if (totalPlayers >= 6) return;
    setAiSlots(prev => [...prev, { name: t('game.aiLabel'), color: nextFreeColor(takenColors), difficulty: 'medium' }]);
  };
  const removeAI = (i: number) => setAiSlots(prev => prev.filter((_, j) => j !== i));
  const updateAI = (i: number, patch: Partial<AiSlot>) =>
    setAiSlots(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));

  const handleConnect = () => {
    onConnect(host.trim(), Number(port) || 8080, name.trim() || t('lobby.defaultName'), 'red');
  };

  const handleStart = () => {
    onStart({
      mode: gameMode,
      setupMode: randomDeal ? 'random' : 'claim',
      randomPlacement,
      localSlots: localSlots.map(s => ({ name: s.name || t('game.humanLabel'), color: s.color })),
      aiSlots: aiSlots.map(s => ({ name: s.name || t('game.aiLabel'), color: s.color, difficulty: s.difficulty })),
    });
  };

  // Broadcast config to all lobby members whenever the host changes anything
  React.useEffect(() => {
    if (!connected) return;
    onConfigChange({
      mode: gameMode,
      setupMode: randomDeal ? 'random' : 'claim',
      randomPlacement,
      localSlots: localSlots.map(s => ({ name: s.name || '', color: s.color })),
      aiSlots: aiSlots.map(s => ({ name: s.name || '', color: s.color, difficulty: s.difficulty })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, gameMode, randomDeal, randomPlacement, localSlots, aiSlots]);

  React.useEffect(() => {
    if (!droppedPlayerId || !isAdmin) return;
    Alert.alert(
      t('lobby.playerDroppedTitle'),
      t('lobby.playerDroppedMessage'),
      [
        { text: t('lobby.handToAI'), onPress: () => onDisconnectChoice('ai') },
        { text: t('lobby.pauseGame'), onPress: () => onDisconnectChoice('pause') },
      ],
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedPlayerId, isAdmin]);

  // ── Connect form ──────────────────────────────────────────────────────────

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {t('lobby.hostHint')}
        </Text>
        <Input label={t('lobby.serverIP')} placeholder="192.168.1.42" value={host} onChangeText={setHost}
          keyboardType="numbers-and-punctuation" autoCapitalize="none" autoCorrect={false} />
        <Input label={t('lobby.port')} placeholder={DEFAULT_PORT} value={port} onChangeText={setPort}
          keyboardType="number-pad" />
        <Input label={t('lobby.yourName')} placeholder={t('lobby.namePlaceholder')} value={name}
          onChangeText={setName} maxLength={20} />
        {status === 'error' && (
          <Text variant="caption" style={{ color: colors.error }}>{t('lobby.connectionFailed')}</Text>
        )}
        <Button
          label={t('lobby.connectAsHost')}
          onPress={handleConnect}
          loading={status === 'connecting'}
          disabled={status === 'connecting' || !host.trim()}
        />
      </View>
    );
  }

  // ── Lobby view (connected) ────────────────────────────────────────────────

  const MODES: { id: GameMode; labelKey: Parameters<typeof t>[0] }[] = [
    { id: 'classic', labelKey: 'game.modeClassic' },
    { id: 'mission', labelKey: 'game.modeMission' },
    { id: 'capital', labelKey: 'game.modeCapital' },
  ];

  return (
    <View style={styles.container}>

      {/* QR — always visible once connected, tap to enlarge */}
      {serverAddress ? (
        <>
          <Pressable
            onPress={() => setShowQr(true)}
            style={[styles.qrInline, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.qrBox}>
              <QrCode value={serverAddress} size={110} />
            </View>
            <View style={styles.qrInfo}>
              <Text variant="label" style={{ color: colors.text }}>{t('lobby.scanToJoin')}</Text>
              <Text variant="body" style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
                {serverAddress}
              </Text>
              <Pressable onPress={() => copyUrl(serverAddress)} style={styles.qrHint}>
                <Ionicons
                  name={copied ? 'checkmark-outline' : 'copy-outline'}
                  size={12}
                  color={copied ? colors.success : colors.primary}
                />
                <Text variant="caption" style={{ color: copied ? colors.success : colors.primary }}>
                  {copied ? t('lobby.copied') : t('lobby.copyUrl')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowQr(true)} style={styles.qrHint}>
                <Ionicons name="expand-outline" size={12} color={colors.textSecondary} />
                <Text variant="caption" style={{ color: colors.textSecondary }}>{t('lobby.tapToEnlarge')}</Text>
              </Pressable>
            </View>
          </Pressable>

          <Modal visible={showQr} onClose={() => setShowQr(false)} title={t('lobby.scanToJoin')}>
            <View style={styles.qrModalContent}>
              <View style={styles.qrModalBox}>
                <QrCode value={serverAddress} size={220} />
              </View>
              <Text variant="caption" style={{ color: colors.textSecondary }}>{t('lobby.orEnterManually')}</Text>
              <Text variant="body" style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>
                {serverAddress}
              </Text>
              <Pressable onPress={() => copyUrl(serverAddress)} style={styles.copyBtn}>
                <Ionicons
                  name={copied ? 'checkmark-outline' : 'copy-outline'}
                  size={16}
                  color={copied ? colors.success : colors.primary}
                />
                <Text variant="body" style={{ color: copied ? colors.success : colors.primary, fontWeight: '600' }}>
                  {copied ? t('lobby.copied') : t('lobby.copyUrl')}
                </Text>
              </Pressable>
            </View>
          </Modal>
        </>
      ) : (
        <View style={[styles.qrInline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>{t('lobby.waitingForServer')}</Text>
        </View>
      )}

      {/* Game mode */}
      <Text variant="body" style={{ color: colors.textSecondary }}>{t('game.modeLabel')}</Text>
      <View style={styles.modeRow}>
        {MODES.map(({ id, labelKey }) => (
          <Pressable
            key={id}
            onPress={() => setGameMode(id)}
            style={[styles.modeBtn, { backgroundColor: gameMode === id ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Text variant="caption" style={{ color: gameMode === id ? '#fff' : colors.text, textAlign: 'center' }}>
              {t(labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Setup options */}
      <Text variant="body" style={{ color: colors.textSecondary }}>{t('game.setupModeLabel')}</Text>
      <Checkbox checked={randomDeal} onToggle={() => setRandomDeal(v => !v)} label={t('game.setupModeRandom')} />
      <Checkbox checked={randomPlacement} onToggle={() => setRandomPlacement(v => !v)} label={t('game.setupModeRandomPlacement')} />

      {/* Players */}
      <Text variant="body" style={{ color: colors.textSecondary }}>
        {t('game.playerCount')}  {totalPlayers}/6
      </Text>

      {/* LAN players — read-only */}
      {players.map(player => (
        <View key={player.id} style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={[styles.colorDot, { backgroundColor: PLAYER_COLOR_HEX[player.color] }]} />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <View style={styles.cardHeader}>
              <Text variant="body" style={{ color: colors.text, flex: 1, fontWeight: '600' }}>
                {player.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>LAN</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* Local human slots */}
      {localSlots.map((slot, i) => {
        const available = ALL_COLORS.filter(c => !takenColors.includes(c) || c === slot.color);
        return (
          <View key={`local-${i}`} style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.colorDot, { backgroundColor: PLAYER_COLOR_HEX[slot.color] }]} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <View style={styles.cardHeader}>
                <TextInput
                  value={slot.name}
                  onChangeText={text => updateLocal(i, { name: text })}
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, flex: 1 }]}
                  placeholder={t('game.humanLabel')}
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={[styles.badge, { backgroundColor: colors.textSecondary }]}>
                  <Text variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>{t('lobby.localBadge')}</Text>
                </View>
                <Pressable onPress={() => removeLocal(i)} style={[styles.removeBtn, { borderColor: colors.border }]}>
                  <Text variant="caption" style={{ color: colors.textSecondary, lineHeight: 16 }}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.colorPicker}>
                {available.map(color => (
                  <Pressable
                    key={color}
                    onPress={() => updateLocal(i, { color })}
                    style={[styles.colorSwatch, { backgroundColor: PLAYER_COLOR_HEX[color], borderWidth: slot.color === color ? 2 : 0, borderColor: colors.text }]}
                  />
                ))}
              </View>
            </View>
          </View>
        );
      })}

      {/* AI slots */}
      {aiSlots.map((slot, i) => {
        const available = ALL_COLORS.filter(c => !takenColors.includes(c) || c === slot.color);
        return (
          <View key={`ai-${i}`} style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.colorDot, { backgroundColor: PLAYER_COLOR_HEX[slot.color] }]} />
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <View style={styles.cardHeader}>
                <TextInput
                  value={slot.name}
                  onChangeText={text => updateAI(i, { name: text })}
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, flex: 1 }]}
                  placeholder={t('game.aiLabel')}
                  placeholderTextColor={colors.textSecondary}
                />
                <Pressable onPress={() => removeAI(i)} style={[styles.removeBtn, { borderColor: colors.border }]}>
                  <Text variant="caption" style={{ color: colors.textSecondary, lineHeight: 16 }}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.colorPicker}>
                {available.map(color => (
                  <Pressable
                    key={color}
                    onPress={() => updateAI(i, { color })}
                    style={[styles.colorSwatch, { backgroundColor: PLAYER_COLOR_HEX[color], borderWidth: slot.color === color ? 2 : 0, borderColor: colors.text }]}
                  />
                ))}
              </View>
              <View style={styles.diffRow}>
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map(d => (
                  <Pressable
                    key={d}
                    onPress={() => updateAI(i, { difficulty: d })}
                    style={[styles.diffBtn, { backgroundColor: slot.difficulty === d ? colors.primary : colors.surface, borderColor: colors.border }]}
                  >
                    <Text variant="caption" style={{ color: slot.difficulty === d ? '#fff' : colors.text }}>
                      {t(`game.aiDifficulty${d.charAt(0).toUpperCase() + d.slice(1)}` as Parameters<typeof t>[0])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        );
      })}

      {/* Add buttons */}
      {totalPlayers < 6 && (
        <View style={styles.addRow}>
          <Pressable onPress={addLocal} style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>+ {t('game.humanLabel')}</Text>
          </Pressable>
          <Pressable onPress={addAI} style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text variant="body" style={{ color: colors.primary, fontWeight: '600' }}>+ {t('game.aiLabel')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={handleStart}
        disabled={!canStart}
        style={[styles.startBtn, { backgroundColor: canStart ? colors.primary : colors.border, marginTop: Spacing.sm }]}
      >
        <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('lobby.startGame')}</Text>
      </Pressable>

      <Button label={t('common.back')} variant="ghost" onPress={onDisconnect} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { gap: Spacing.md },
  qrInline:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1 },
  qrBox:          { padding: Spacing.xs, backgroundColor: '#ffffff', borderRadius: BorderRadius.sm },
  qrInfo:         { flex: 1, gap: 4 },
  qrHint:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  qrModalContent: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  qrModalBox:     { padding: Spacing.sm, backgroundColor: '#ffffff', borderRadius: BorderRadius.md },
  copyBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  modeRow:        { flexDirection: 'row', gap: Spacing.sm },
  modeBtn:        { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  checkboxRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkboxBox:    { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playerCard:     { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.md },
  colorDot:       { width: 24, height: 24, borderRadius: 12, marginTop: 8 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  badge:          { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  nameInput:      { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: FontSize.md },
  removeBtn:      { width: 28, height: 28, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorPicker:    { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  colorSwatch:    { width: 24, height: 24, borderRadius: 12 },
  diffRow:        { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  diffBtn:        { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  addRow:         { flexDirection: 'row', gap: Spacing.sm },
  addBtn:         { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  startBtn:       { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center' },
});
