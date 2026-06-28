import React, { useState, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { ZoomableMap, type ZoomableMapRef } from '../../src/components/map/ZoomableMap';
import { RiskBoardMap, TERRITORY_LABEL_POS } from '../../src/components/map/RiskBoardMap';
import {
  DiceModal, ActionPanel, CardHandModal,
  PassDeviceScreen, MissionCard, GameSidePanel, GameSlidePanel,
  ContinentLegend,
  type SelectionMode,
} from '../../src/components/game';
import { useGame, PLAYER_COLOR_HEX } from '../../src/context/GameContext';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing, BorderRadius } from '../../src/constants/spacing';
import type { PlayerColor, TerritoryId, GameMode, GameRules, AIDifficulty } from '../../src/engine/types';
import { DEFAULT_RULES } from '../../src/engine/types';
import { missionDescription } from '../../src/engine/missions';
import { TERRITORIES, type Territory } from '../../src/constants/riskWorldTerritories';
import { areAdjacent, getConnectedOwned, getAdjacentIds } from '../../src/engine/board';
import type { PlayerConfig, SetupMode } from '../../src/engine/setup';

// ── Shared helpers ────────────────────────────────────────────────────────────

const ALL_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const DEFAULT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

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

/** Map-fill override from current game state (player colors). */
/** Darkens a #rrggbb hex colour by multiplying each channel by `factor` (0–1). */
/** Diagonal gradient that fills the ocean/map background area. */
function OceanGradient() {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}
    >
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="bg-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors.ocean1} />
              <Stop offset="100%" stopColor={colors.ocean2} />
            </LinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill="url(#bg-ocean)" />
        </Svg>
      )}
    </View>
  );
}

function darkenHex(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function useTerritoryFills(
  st: ReturnType<typeof useGame>['state'],
  dimmedIds?: ReadonlySet<string>,
) {
  const { colors } = useTheme();
  return useMemo(() => {
    if (!st) return {};
    const fills: Record<string, string> = {};
    for (const ts of Object.values(st.territories)) {
      const base = ts.owner
        ? PLAYER_COLOR_HEX[st.players.find(p => p.id === ts.owner)!.color]
        : colors.territoryNeutral;
      fills[ts.id] = dimmedIds?.has(ts.id) ? darkenHex(base, 0.45) : base;
    }
    return fills;
  }, [st?.territories, st?.players, colors.territoryNeutral, dimmedIds]);
}

/**
 * During REINFORCE, shows the snapshot (pre-placement) army count so the
 * "+N" delta badge stays accurate. Outside reinforce, shows the live total.
 */
function useArmyCounts(st: ReturnType<typeof useGame>['state']) {
  return useMemo(() => {
    if (!st) return {};
    const counts: Record<string, number> = {};
    for (const ts of Object.values(st.territories)) {
      const display =
        st.phase === 'REINFORCE' && st.reinforceSnapshot
          ? (st.reinforceSnapshot.territories[ts.id]?.armies ?? ts.armies)
          : ts.armies;
      if (display > 0) counts[ts.id] = display;
    }
    return counts;
  }, [st?.territories, st?.reinforceSnapshot, st?.phase]);
}

/** Delta armies placed this turn (territory id → count). Only non-null during REINFORCE. */
function useArmyDeltas(st: ReturnType<typeof useGame>['state']) {
  return useMemo(() => {
    if (!st || st.phase !== 'REINFORCE' || !st.reinforceSnapshot) return undefined;
    const deltas: Record<string, number> = {};
    for (const ts of Object.values(st.territories)) {
      const snap = st.reinforceSnapshot.territories[ts.id]?.armies ?? 0;
      const delta = ts.armies - snap;
      if (delta > 0) deltas[ts.id] = delta;
    }
    return Object.keys(deltas).length > 0 ? deltas : undefined;
  }, [st?.territories, st?.reinforceSnapshot, st?.phase]);
}

// ── Setup screen ─────────────────────────────────────────────────────────────

interface PlayerEntry {
  name: string;
  color: PlayerColor;
  isAI: boolean;
  difficulty: AIDifficulty;
}

function SetupScreen() {
  const { startGame, hasSavedGame, resumeGame } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [players, setPlayers] = useState<PlayerEntry[]>([
    { name: DEFAULT_NAMES[0], color: 'red',  isAI: false, difficulty: 'medium' },
    { name: DEFAULT_NAMES[1], color: 'blue', isAI: false, difficulty: 'medium' },
  ]);
  const [lastAIDifficulty, setLastAIDifficulty] = useState<AIDifficulty>('medium');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [randomDeal, setRandomDeal] = useState(false);
  const [randomPlacement, setRandomPlacement] = useState(false);
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);

  const toggleRule = <K extends keyof GameRules>(key: K, value: GameRules[K]) =>
    setRules(r => ({ ...r, [key]: value }));

  const takenColors = (excludeIdx: number) =>
    players.filter((_, j) => j !== excludeIdx).map(p => p.color);

  const nextFreeColor = (): PlayerColor =>
    ALL_COLORS.find(c => !players.some(p => p.color === c)) ?? ALL_COLORS[0];

  const addHuman = () => {
    if (players.length >= 6) return;
    const idx = players.length;
    setPlayers(prev => [...prev, {
      name: DEFAULT_NAMES[idx] ?? `Player ${idx + 1}`,
      color: nextFreeColor(),
      isAI: false,
      difficulty: 'medium',
    }]);
  };

  const addAI = () => {
    if (players.length >= 6) return;
    setPlayers(prev => [...prev, {
      name: t('game.aiLabel'),
      color: nextFreeColor(),
      isAI: true,
      difficulty: lastAIDifficulty,
    }]);
  };

  const removePlayer = (i: number) => {
    if (players.length <= 2) return;
    setPlayers(prev => prev.filter((_, j) => j !== i));
  };

  const updatePlayer = (i: number, patch: Partial<PlayerEntry>) => {
    setPlayers(prev => prev.map((p, j) => j === i ? { ...p, ...patch } : p));
    if (patch.difficulty !== undefined) setLastAIDifficulty(patch.difficulty);
  };

  const handleStart = () => {
    const configs: PlayerConfig[] = players.map(p => ({
      name: p.name || t('game.humanLabel'),
      color: p.color,
      isAI: p.isAI,
      aiDifficulty: p.isAI ? p.difficulty : undefined,
    }));
    startGame(configs, gameMode, randomDeal ? 'random' : 'claim', randomPlacement, rules);
  };

  const MODES: { id: GameMode; labelKey: Parameters<typeof t>[0] }[] = [
    { id: 'classic', labelKey: 'game.modeClassic' },
    { id: 'mission', labelKey: 'game.modeMission' },
    { id: 'capital', labelKey: 'game.modeCapital' },
  ];

  return (
    <Screen scrollable>
      <Text variant="h2" style={{ color: colors.text, marginBottom: Spacing.md }}>{t('game.newGame')}</Text>

      {hasSavedGame && (
        <Pressable onPress={resumeGame} style={[styles.resumeBtn, { borderColor: colors.primary }]}>
          <Text variant="body" style={{ color: colors.primary, fontWeight: '700' }}>{t('game.resumeGame')}</Text>
        </Pressable>
      )}

      {/* Game mode */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>{t('game.modeLabel')}</Text>
      <View style={[styles.countRow, { marginBottom: Spacing.lg }]}>
        {MODES.map(({ id, labelKey }) => (
          <Pressable
            key={id}
            onPress={() => setGameMode(id)}
            style={[styles.modeBtn, { backgroundColor: gameMode === id ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Text variant="caption" style={{ color: gameMode === id ? '#fff' : colors.text, textAlign: 'center' }}>{t(labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Setup options */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>{t('game.setupModeLabel')}</Text>
      <View style={{ marginBottom: Spacing.lg, gap: Spacing.sm }}>
        <Checkbox checked={randomDeal} onToggle={() => setRandomDeal(v => !v)} label={t('game.setupModeRandom')} />
        <Checkbox checked={randomPlacement} onToggle={() => setRandomPlacement(v => !v)} label={t('game.setupModeRandomPlacement')} />
      </View>

      {/* Rules */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>{t('game.rulesLabel')}</Text>
      <View style={{ marginBottom: Spacing.lg, gap: Spacing.sm }}>
        <Checkbox checked={rules.allowReinforceUndo} onToggle={() => toggleRule('allowReinforceUndo', !rules.allowReinforceUndo)} label={t('game.ruleUndoReinforce')} />
        <Checkbox checked={rules.fortifyMode === 'chain'} onToggle={() => toggleRule('fortifyMode', rules.fortifyMode === 'chain' ? 'adjacent' : 'chain')} label={t('game.ruleFortifyChain')} />
        <Checkbox checked={rules.missionWinTiming === 'own_turn'} onToggle={() => toggleRule('missionWinTiming', rules.missionWinTiming === 'own_turn' ? 'immediate' : 'own_turn')} label={t('game.ruleMissionOwnTurn')} />
      </View>

      {/* Per-player config */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>
        {t('game.playerCount')}  {players.length}/6
      </Text>

      {players.map((player, i) => (
        <View key={i} style={[styles.playerCard, { backgroundColor: colors.card, borderColor: player.isAI ? colors.primary : colors.border }]}>
          <View style={[styles.playerColorDot, { backgroundColor: PLAYER_COLOR_HEX[player.color] }]} />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <View style={styles.playerCardHeader}>
              <TextInput
                value={player.name}
                onChangeText={text => updatePlayer(i, { name: text })}
                style={[styles.nameInput, { color: colors.text, borderColor: colors.border, flex: 1 }]}
                placeholder={player.isAI ? t('game.aiLabel') : `Player ${i + 1}`}
                placeholderTextColor={colors.textSecondary}
              />
              {players.length > 2 && (
                <Pressable onPress={() => removePlayer(i)} style={[styles.removeBtn, { borderColor: colors.border }]}>
                  <Text variant="caption" style={{ color: colors.textSecondary, lineHeight: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.colorPicker}>
              {ALL_COLORS.filter(c => !takenColors(i).includes(c)).map(color => (
                <Pressable
                  key={color}
                  onPress={() => updatePlayer(i, { color })}
                  style={[styles.colorSwatch, { backgroundColor: PLAYER_COLOR_HEX[color], borderWidth: player.color === color ? 2 : 0, borderColor: colors.text }]}
                />
              ))}
            </View>
            {/* Difficulty row (AI players only) */}
            {player.isAI && (
              <View style={styles.aiRow}>
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map(d => (
                  <Pressable
                    key={d}
                    onPress={() => updatePlayer(i, { difficulty: d })}
                    style={[styles.diffBtn, { backgroundColor: player.difficulty === d ? colors.primary : colors.surface, borderColor: colors.border }]}
                  >
                    <Text variant="caption" style={{ color: player.difficulty === d ? '#fff' : colors.text }}>
                      {t(`game.aiDifficulty${d.charAt(0).toUpperCase() + d.slice(1)}` as Parameters<typeof t>[0])}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Add player buttons */}
      {players.length < 6 && (
        <View style={[styles.addRow, { marginBottom: Spacing.sm }]}>
          <Pressable
            onPress={addHuman}
            style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text variant="body" style={{ color: colors.text, fontWeight: '600' }}>+ {t('game.humanLabel')}</Text>
          </Pressable>
          <Pressable
            onPress={addAI}
            style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text variant="body" style={{ color: colors.primary, fontWeight: '600' }}>+ {t('game.aiLabel')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={handleStart} style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.sm }]}>
        <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.startGame')}</Text>
      </Pressable>
    </Screen>
  );
}

// ── HQ selection screen (Mode 3) ─────────────────────────────────────────────

function HQSelectionScreen() {
  const { state, dispatch } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [deviceUnlocked, setDeviceUnlocked] = useState(false);
  const [candidate, setCandidate] = useState<TerritoryId | null>(null);

  const st = state!;
  const activePlayer = st.players.find(p => p.id === st.activePlayerId)!;
  const allChosen = st.players.every(p => !p.alive || p.hqChosen);
  const territoryFills = useTerritoryFills(st);
  const armyCounts = useArmyCounts(st);

  const selectableIds = useMemo(() => {
    if (allChosen) return new Set<string>();
    const s = new Set<string>();
    for (const ts of Object.values(st.territories)) {
      if (ts.owner === activePlayer.id) s.add(ts.id);
    }
    return s;
  }, [st.territories, activePlayer.id, allChosen]);

  const highlightedIds = useMemo(
    () => (candidate ? new Set([candidate]) : new Set<string>()),
    [candidate],
  );

  const handleConfirm = () => {
    if (!candidate) return;
    dispatch({ type: 'SELECT_HQ', territoryId: candidate });
    setDeviceUnlocked(false);
    setCandidate(null);
  };

  const candidateName = candidate
    ? (() => { const terr = TERRITORIES.find(t => t.id === candidate); return terr?.id ?? candidate; })()
    : null;

  if (!deviceUnlocked && !allChosen && !activePlayer.isAI) {
    return <PassDeviceScreen visible player={activePlayer} onUnlock={() => { setDeviceUnlocked(true); setCandidate(null); }} />;
  }

  if (allChosen) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text variant="h2" style={{ color: colors.text, textAlign: 'center' }}>{t('game.allHQsChosen')}</Text>
        <Text variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('game.allHQsChosenSub')}</Text>
        <Pressable onPress={() => dispatch({ type: 'REVEAL_HQS' })} style={[styles.startBtn, { backgroundColor: colors.primary }]}>
          <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.revealHQs')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.hqHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.colorDot, { backgroundColor: PLAYER_COLOR_HEX[activePlayer.color] }]} />
        <View>
          <Text variant="body" style={{ color: colors.text, fontWeight: '700' }}>{activePlayer.name}</Text>
          <Text variant="caption" style={{ color: colors.textSecondary }}>{t('game.chooseHQ')}</Text>
        </View>
      </View>

      <ZoomableMap>
        <RiskBoardMap showRiskLayer territoryFills={territoryFills} armyCounts={armyCounts} highlightedIds={highlightedIds} selectableIds={selectableIds} onTerritorySelect={terr => { if (terr && st.territories[terr.id as TerritoryId]?.owner === activePlayer.id) setCandidate(terr.id as TerritoryId); }} />
      </ZoomableMap>

      <View style={[styles.hqPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {candidate ? (
          <>
            <Text variant="body" style={{ color: colors.text }}>{t('game.hqSelected').replace('{{name}}', candidateName ?? '')}</Text>
            <Pressable onPress={handleConfirm} style={[styles.startBtn, { backgroundColor: colors.primary }]}>
              <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.confirmHQ')}</Text>
            </Pressable>
          </>
        ) : (
          <Text variant="caption" style={{ color: colors.textSecondary }}>{t('game.tapOwnForHQ')}</Text>
        )}
      </View>
    </View>
  );
}

// ── Game over screen ──────────────────────────────────────────────────────────

function GameOverScreen() {
  const { state, resetGame } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (!state) return null;

  const winner = state.players.find(p => p.id === state.winner);
  const winnerColor = winner ? PLAYER_COLOR_HEX[winner.color] : colors.primary;
  const mission = winner?.mission ?? null;
  const isMissionVictory = state.mode === 'mission' && !!mission;
  const desc = mission ? missionDescription(mission) : null;

  return (
    <Screen>
      {/* Player-color accent bar */}
      <View style={[styles.gameOverBar, { backgroundColor: winnerColor }]} />

      <View style={styles.center}>
        {/* Winner orb */}
        <MotiView
          from={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 13, stiffness: 150 }}
        >
          <View style={[styles.winnerDot, { backgroundColor: winnerColor }]} />
        </MotiView>

        {/* Name + mode label */}
        <MotiView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 380, delay: 200 }}
          style={{ alignItems: 'center', gap: Spacing.xs }}
        >
          <Text variant="caption" style={{ color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            {isMissionVictory ? t('game.secretMission') : t('game.modeClassic')}
          </Text>
          <Text variant="h2" style={{ color: colors.text, textAlign: 'center' }}>
            {winner ? t('game.winner').replace('{{name}}', winner.name) : 'Game Over'}
          </Text>
        </MotiView>

        {/* Mission reveal card */}
        {isMissionVictory && desc && (
          <MotiView
            from={{ opacity: 0, translateY: 28 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 160, delay: 450 }}
            style={[styles.missionRevealCard, { backgroundColor: colors.card, borderColor: colors.success }]}
          >
            <View style={[styles.missionRevealBand, { backgroundColor: colors.success }]}>
              <Text variant="caption" style={{ color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>
                {'✓  '}{t('game.missionComplete')}
              </Text>
            </View>
            <View style={styles.missionRevealBody}>
              <Text variant="body" style={{ color: colors.text, textAlign: 'center', fontWeight: '600', lineHeight: 24 }}>
                {desc}
              </Text>
              {mission.type === 'DESTROY_PLAYER' && mission.targetColor && (
                <View style={styles.targetRow}>
                  <View style={[styles.targetDot, { backgroundColor: PLAYER_COLOR_HEX[mission.targetColor] }]} />
                  <Text variant="caption" style={{ color: colors.textSecondary }}>
                    {t('game.targetPlayer').replace('{{color}}', mission.targetColor)}
                  </Text>
                </View>
              )}
            </View>
          </MotiView>
        )}

        {/* Play again */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 300, delay: isMissionVictory ? 750 : 350 }}
        >
          <Pressable
            onPress={resetGame}
            style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg, minWidth: 200 }]}
          >
            <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.playAgain')}</Text>
          </Pressable>
        </MotiView>
      </View>
    </Screen>
  );
}

// ── Main play screen ──────────────────────────────────────────────────────────

const WIDE_BREAKPOINT = 680;

function PlayScreen() {
  const { state, dispatch } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [selection, setSelection] = useState<SelectionMode>({ phase: 'none' });
  const [showDice, setShowDice] = useState(false);
  const [showCards, setShowCards] = useState(false);
  /** Which player's hand to display in CardHandModal; null = active player. */
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(false);
  const [passDeviceVisible, setPassDeviceVisible] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [logHighlightedIds, setLogHighlightedIds] = useState<Set<string>>(new Set());
  const [showReinforceDoneModal, setShowReinforceDoneModal] = useState(false);
  const [lastClaimedId, setLastClaimedId] = useState<TerritoryId | null>(null);
  const prevActivePlayer = useRef<string | null>(null);
  const zoomMapRef = useRef<ZoomableMapRef>(null);

  const st = state!;
  const activePlayerId = st.activePlayerId;
  const activePlayer = st.players.find(p => p.id === activePlayerId)!;

  // ── Zoom helpers (attack phase) ───────────────────────────────────────────

  /** Risk board SVG viewBox origin and width — must match VIEWBOX in RiskBoardMap.tsx. */
  const VB = { x: 191, y: 60, w: 714 } as const;

  const zoomToTerritory = React.useCallback((from: TerritoryId) => {
    // Collect label positions for the attacker and all its neighbours
    const ids = [from, ...getAdjacentIds(from)] as string[];
    const positions = ids.map(id => TERRITORY_LABEL_POS[id]).filter((p): p is { x: number; y: number } => Boolean(p));
    if (positions.length === 0) return;

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    const svgCx = (minX + maxX) / 2;
    const svgCy = (minY + maxY) / 2;

    // bbox dimensions in SVG units (with padding)
    const pad = 70;
    const bboxW = Math.max(maxX - minX + pad * 2, 160);

    // Scale to fill ~75 % of the available map width
    const mapWidth = isWide ? width - 200 : width;
    const targetScale = Math.min(3.8, Math.max(1.8, 0.75 * VB.w / bboxW));

    // Convert SVG focal point to container pixel coords
    const px = (svgCx - VB.x) * mapWidth / VB.w;
    const py = (svgCy - VB.y) * mapWidth / VB.w;

    zoomMapRef.current?.zoomToPoint(px, py, targetScale);
  }, [isWide, width]);

  // Zoom in when attacker territory selected; reset otherwise
  React.useEffect(() => {
    if (selection.phase === 'ATTACK_FROM') {
      zoomToTerritory(selection.from);
    } else if (selection.phase === 'none' || selection.phase === 'FORTIFY_FROM' || selection.phase === 'FORTIFY_TO') {
      zoomMapRef.current?.resetZoom();
    }
    // Keep zoom when moving to ATTACK_TO (target selection)
  }, [selection.phase, (selection as { from?: TerritoryId }).from]);

  // Reset zoom when leaving attack phase
  React.useEffect(() => {
    if (st.phase !== 'ATTACK') zoomMapRef.current?.resetZoom();
  }, [st.phase]);

  // Clear the claimed-territory highlight when leaving the CLAIMING sub-phase
  React.useEffect(() => {
    if (st.phase !== 'SETUP' || st.setupSubPhase !== 'CLAIMING') {
      setLastClaimedId(null);
    }
  }, [st.phase, st.setupSubPhase]);

  React.useEffect(() => {
    if (state?.lastBattleResult && !activePlayer.isAI) setShowDice(true);
  }, [state?.lastBattleResult]);

  // Auto-show confirmation modal when all reinforcements are placed (human players only)
  React.useEffect(() => {
    if (
      st.phase === 'REINFORCE' &&
      st.reinforcementsRemaining === 0 &&
      !st.mustTradeCards &&
      !st.pendingTerritoryBonus &&
      !activePlayer.isAI
    ) {
      setShowReinforceDoneModal(true);
    } else {
      setShowReinforceDoneModal(false);
    }
  }, [st.phase, st.reinforcementsRemaining, st.mustTradeCards, st.pendingTerritoryBonus, activePlayer.isAI]);

  // Show pass-device screen when the active player changes (mission mode only, human players only)
  React.useEffect(() => {
    if (st.mode === 'mission' && st.phase === 'REINFORCE') {
      if (prevActivePlayer.current !== null && prevActivePlayer.current !== activePlayerId && !activePlayer.isAI) {
        setPassDeviceVisible(true);
        setSelection({ phase: 'none' });
      }
    }
    prevActivePlayer.current = activePlayerId;
  }, [activePlayerId, st.phase]);

  // Friendly territories to visually darken during ATTACK_FROM so they don't
  // look like valid attack targets compared to enemy territories.
  const dimmedTerritoryIds = useMemo<ReadonlySet<string> | undefined>(() => {
    if (st.phase !== 'ATTACK') return undefined;
    const attackerFrom = selection.phase === 'ATTACK_FROM' || selection.phase === 'ATTACK_TO'
      ? (selection as { from: TerritoryId }).from
      : undefined;
    if (!attackerFrom) return undefined;
    const s = new Set<string>();
    for (const ts of Object.values(st.territories)) {
      if (ts.owner === activePlayerId && ts.id !== attackerFrom) s.add(ts.id);
    }
    return s;
  }, [st.phase, st.territories, selection, activePlayerId]);

  const territoryFills = useTerritoryFills(st, dimmedTerritoryIds);
  const armyCounts = useArmyCounts(st);
  const armyDeltas = useArmyDeltas(st);

  // HQ highlights for capital mode
  const hqHighlights = useMemo(() => {
    if (st.mode !== 'capital' || !st.hqsRevealed) return new Set<string>();
    const s = new Set<string>();
    for (const p of st.players) {
      if (p.hqTerritoryId) s.add(p.hqTerritoryId);
    }
    return s;
  }, [st.mode, st.hqsRevealed, st.players]);

  // forceLiftedIds: territories that keep the hover lift even when non-selectable
  const forceLiftedIds = useMemo(() => {
    if (!lastClaimedId) return undefined;
    return new Set([lastClaimedId as string]);
  }, [lastClaimedId]);

  const { selectableIds, highlightedIds } = useMemo(() => {
    const selectable = new Set<string>();
    const highlighted = new Set<string>(hqHighlights);

    // Keep the last claimed territory gold-bordered during CLAIMING
    if (lastClaimedId) highlighted.add(lastClaimedId);

    if (st.phase === 'SETUP') {
      if (st.setupSubPhase === 'CLAIMING') {
        for (const ts of Object.values(st.territories)) { if (ts.owner === null) selectable.add(ts.id); }
      } else {
        for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId) selectable.add(ts.id); }
      }
    } else if (st.phase === 'REINFORCE') {
      for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId) selectable.add(ts.id); }
    } else if (st.phase === 'ATTACK') {
      if (!st.captureContext) {
        if (selection.phase === 'ATTACK_FROM') {
          // Attacker gets gold border; enemy targets are selectable but NOT highlighted —
          // the darkened-friendly contrast already shows which territories can be attacked.
          highlighted.add(selection.from);
          for (const adjId of (TERRITORIES.find(t => t.id === selection.from)?.adjacentTo ?? [])) {
            const adjT = st.territories[adjId as TerritoryId];
            if (adjT?.owner && adjT.owner !== activePlayerId) selectable.add(adjId);
          }
          for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id); }
        } else if (selection.phase === 'ATTACK_TO') {
          // Both attacker and target get gold borders.
          // Attacker stays selectable so it keeps its hover lift (and can be re-tapped to cancel).
          // Target is highlighted but NOT selectable → full opacity via isSelected, no hover.
          highlighted.add(selection.from);
          highlighted.add(selection.to);
          selectable.add(selection.from);
        } else {
          for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id); }
        }
      }
    } else if (st.phase === 'FORTIFY') {
      if (selection.phase === 'FORTIFY_FROM') {
        highlighted.add(selection.from);
        const targets = getConnectedOwned(selection.from, activePlayerId, st.territories);
        targets.delete(selection.from as TerritoryId);
        for (const id of targets) { selectable.add(id); highlighted.add(id); }
        for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id); }
      } else {
        for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id); }
      }
    }
    return { selectableIds: selectable, highlightedIds: highlighted };
  }, [st, activePlayerId, selection, hqHighlights]);

  // During ATTACK_TO: the chosen target is tappable (to deselect it) but
  // does not enter the map's hover/lift state.
  const tappableIds = useMemo<ReadonlySet<string> | undefined>(() => {
    if (selection.phase !== 'ATTACK_TO') return undefined;
    return new Set([selection.to as string]);
  }, [selection]);

  // Derive per-territory reinforcement log from snapshot diff (E0.4 / E2.3)
  const reinforcementLog = useMemo(() => {
    if (st.phase !== 'REINFORCE' || !st.reinforceSnapshot || !st.rules.allowReinforceUndo) return [];
    return Object.values(st.territories)
      .map(ts => ({
        territoryId: ts.id,
        armies: ts.armies - (st.reinforceSnapshot!.territories[ts.id]?.armies ?? 0),
      }))
      .filter(e => e.armies > 0);
  }, [st.territories, st.reinforceSnapshot, st.phase, st.rules.allowReinforceUndo]);

  const showLog = true; // always show the panel toggle; content adapts to phase

  const handleEventSelect = (eventId: string | null, territoryIds: TerritoryId[]) => {
    setSelectedEventId(eventId);
    setLogHighlightedIds(new Set(territoryIds));
  };

  // Clear log highlights when phase changes
  React.useEffect(() => {
    setSelectedEventId(null);
    setLogHighlightedIds(new Set());
  }, [st.phase]);

  // Merge phase-based highlights with log-click highlights
  const allHighlightedIds = useMemo(
    () => logHighlightedIds.size > 0 ? new Set([...highlightedIds, ...logHighlightedIds]) : highlightedIds,
    [highlightedIds, logHighlightedIds],
  );

  const handleTerritorySelect = (territory: Territory | null) => {
    if (logHighlightedIds.size > 0) { setLogHighlightedIds(new Set()); setSelectedEventId(null); }

    if (!territory) {
      // Background tap or dimmed territory — deselect everything and reset zoom
      if (selection.phase !== 'none') {
        setSelection({ phase: 'none' });
        zoomMapRef.current?.resetZoom();
      }
      return;
    }
    const id = territory.id as TerritoryId;
    const ts = st.territories[id];

    if (st.phase === 'SETUP') {
      if (st.setupSubPhase === 'CLAIMING') {
        dispatch({ type: 'CLAIM_TERRITORY', territoryId: id });
        setLastClaimedId(id); // keep the just-claimed territory lifted until next claim
      } else {
        dispatch({ type: 'PLACE_SETUP_ARMY', territoryId: id });
      }
      return;
    }
    if (st.phase === 'REINFORCE') {
      if (ts?.owner === activePlayerId && st.reinforcementsRemaining > 0 && !st.mustTradeCards && !st.pendingTerritoryBonus)
        dispatch({ type: 'REINFORCE', territoryId: id, count: 1 });
      return;
    }
    if (st.phase === 'ATTACK') {
      if (st.captureContext) return;
      if (selection.phase === 'ATTACK_FROM') {
        if (ts?.owner === activePlayerId && ts.armies >= 2) setSelection({ phase: 'ATTACK_FROM', from: id });
        else if (ts?.owner && ts.owner !== activePlayerId && areAdjacent(selection.from, id)) setSelection({ phase: 'ATTACK_TO', from: selection.from, to: id });
      } else if (selection.phase === 'ATTACK_TO') {
        if (id === selection.to) {
          // Tapping the chosen target again cancels the target — back to picking
          setSelection({ phase: 'ATTACK_FROM', from: selection.from });
        } else if (ts?.owner === activePlayerId && ts.armies >= 2) {
          setSelection({ phase: 'ATTACK_FROM', from: id });
        }
      } else {
        if (ts?.owner === activePlayerId && ts.armies >= 2) setSelection({ phase: 'ATTACK_FROM', from: id });
      }
      return;
    }
    if (st.phase === 'FORTIFY') {
      if (selection.phase === 'FORTIFY_FROM') {
        const connected = getConnectedOwned(selection.from, activePlayerId, st.territories);
        if (id === selection.from) setSelection({ phase: 'none' });
        else if (connected.has(id)) setSelection({ phase: 'FORTIFY_TO', from: selection.from, to: id });
        else if (ts?.owner === activePlayerId && ts.armies >= 2) setSelection({ phase: 'FORTIFY_FROM', from: id });
      } else {
        if (ts?.owner === activePlayerId && ts.armies >= 2) setSelection({ phase: 'FORTIFY_FROM', from: id });
      }
      return;
    }
  };

  const panelProps = {
    reinforcementEntries: reinforcementLog,
    onRemoveReinforcement: (id: TerritoryId) => dispatch({ type: 'REMOVE_REINFORCEMENT', territoryId: id }),
    events: st.eventLog,
    players: st.players,
    selectedEventId,
    onEventSelect: handleEventSelect,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Chips row — only rendered when at least one chip is visible */}
      {(st.mode === 'mission' && activePlayer.mission || !isWide) && (
        <View style={[styles.topBarActions, { borderBottomWidth: 1, borderColor: colors.border }]}>
          {st.mode === 'mission' && activePlayer.mission && (
            <Pressable
              onPress={() => setShowMission(true)}
              style={[styles.topChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {t('game.viewMission')}
              </Text>
            </Pressable>
          )}
          {!isWide && (
            <Pressable
              onPress={() => setLogOpen(v => !v)}
              style={[styles.topChip, { backgroundColor: logOpen ? colors.primary : colors.surface, borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ color: logOpen ? '#fff' : colors.text, fontWeight: '700' }}>
                {t('game.logLabel')}{reinforcementLog.length > 0 ? ` · ${reinforcementLog.length}` : ''}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Map + optional wide-screen log sidebar */}
      <View style={styles.mapRow}>
        <OceanGradient />
        <ZoomableMap ref={zoomMapRef}>
          <RiskBoardMap
            showRiskLayer
            onTerritorySelect={handleTerritorySelect}
            territoryFills={territoryFills}
            armyCounts={armyCounts}
            armyDeltas={armyDeltas}
            highlightedIds={allHighlightedIds}
            selectableIds={selectableIds}
            tappableIds={tappableIds}
            restoreSelectionId={selection.phase === 'ATTACK_TO' ? selection.from : undefined}
            forceLiftedIds={forceLiftedIds}
          />
        </ZoomableMap>

        <ContinentLegend />

        {/* Wide-screen sidebar — always shown */}
        {isWide && (
          <View style={styles.logSidebar}>
            <GameSidePanel {...panelProps} />
          </View>
        )}

        {/* Small-screen slide panel */}
        {!isWide && (
          <GameSlidePanel
            visible={logOpen}
            {...panelProps}
            onClose={() => setLogOpen(false)}
          />
        )}
      </View>

      <ActionPanel
        state={st}
        dispatch={dispatch}
        selection={selection}
        onSelectionChange={setSelection}
        onOpenCards={() => { setViewingPlayerId(null); setShowCards(true); }}
        onViewPlayerCards={playerId => {
          setViewingPlayerId(playerId);
          setShowCards(true);
        }}
      />

      <DiceModal
        result={showDice ? st.lastBattleResult : null}
        onDismiss={() => setShowDice(false)}
      />

      <CardHandModal
        visible={showCards}
        hand={(viewingPlayerId ? st.players.find(p => p.id === viewingPlayerId) : activePlayer)?.hand ?? activePlayer.hand}
        setsTraded={st.setsTraded}
        onTrade={cardIds => dispatch({ type: 'TRADE_IN_CARDS', cardIds })}
        readOnly={viewingPlayerId !== null}
        onClose={() => { setShowCards(false); setViewingPlayerId(null); }}
      />

      {st.mode === 'mission' && activePlayer.mission && (
        <MissionCard
          visible={showMission}
          mission={activePlayer.mission}
          playerId={activePlayerId}
          state={st}
          onClose={() => setShowMission(false)}
        />
      )}

      <PassDeviceScreen
        visible={passDeviceVisible}
        player={activePlayer}
        onUnlock={() => setPassDeviceVisible(false)}
      />

      {/* Reinforce-done confirmation modal */}
      <AnimatePresence>
        {showReinforceDoneModal && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={[styles.modalBackdrop]}
          >
            <MotiView
              from={{ translateY: 80, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              exit={{ translateY: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.modalColorBar, { backgroundColor: PLAYER_COLOR_HEX[activePlayer.color] }]} />
              <View style={styles.modalBody}>
                <Text variant="h3" style={{ color: colors.text }}>
                  {t('game.allArmiesPlaced')}
                </Text>
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  {activePlayer.name}
                </Text>
                <View style={styles.modalRow}>
                  <Pressable
                    onPress={() => dispatch({ type: 'UNDO_REINFORCE' })}
                    style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text variant="body" style={{ color: colors.text, fontWeight: '700', textAlign: 'center' }}>
                      {t('game.undoReinforce')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => dispatch({ type: 'END_REINFORCE' })}
                    style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text variant="body" style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                      {t('game.endReinforce')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

// ── Tab entry point ───────────────────────────────────────────────────────────

export default function GameScreen() {
  const { state } = useGame();
  if (!state) return <SetupScreen />;
  if (state.phase === 'GAME_OVER') return <GameOverScreen />;
  if (state.phase === 'HQ_SELECTION') return <HQSelectionScreen />;
  return <PlayScreen />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  countRow:      { flexDirection: 'row', gap: Spacing.sm },
  modeBtn:       { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  checkboxRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkboxBox:   { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playerCard:      { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
  playerCardHeader:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  playerColorDot:  { width: 24, height: 24, borderRadius: 12, marginTop: 10 },
  nameInput:       { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: 16 },
  removeBtn:       { width: 28, height: 28, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorPicker:     { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  colorSwatch:     { width: 24, height: 24, borderRadius: 12 },
  aiRow:           { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  diffBtn:         { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  addRow:          { flexDirection: 'row', gap: Spacing.sm },
  addBtn:          { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  startBtn:      { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  resumeBtn:     { borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, marginBottom: Spacing.md },
  center:            { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  winnerDot:         { width: 72, height: 72, borderRadius: 36, marginBottom: Spacing.sm },
  gameOverBar:       { height: 5, width: '100%' },
  missionRevealCard: { borderRadius: BorderRadius.lg, borderWidth: 2, overflow: 'hidden', width: '100%', maxWidth: 320 },
  missionRevealBand: { paddingVertical: Spacing.sm, alignItems: 'center' },
  missionRevealBody: { padding: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  targetRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  targetDot:         { width: 12, height: 12, borderRadius: 6 },
  missionBtn:    { borderBottomWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, alignItems: 'flex-end' },
  topBarActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  topChip:       { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  mapRow:        { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  logSidebar:    { width: 200 },
  hqHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1 },
  colorDot:      { width: 16, height: 16, borderRadius: 8 },
  hqPanel:       { borderTopWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 200 },
  modalSheet:    { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
  modalColorBar: { height: 4 },
  modalBody:     { padding: Spacing.lg, gap: Spacing.md },
  modalRow:      { flexDirection: 'row', gap: Spacing.sm },
  modalBtn:      { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
});
