import React, { useState, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { ZoomableMap, type ZoomableMapRef } from '../../src/components/map/ZoomableMap';
import { RiskBoardMap, TERRITORY_LABEL_POS } from '../../src/components/map/RiskBoardMap';
import {
  DiceModal, ActionPanel, CardHandModal,
  PassDeviceScreen, MissionCard, GameSidePanel, GameSlidePanel,
  type SelectionMode,
} from '../../src/components/game';
import { useGame, PLAYER_COLOR_HEX } from '../../src/context/GameContext';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing, BorderRadius } from '../../src/constants/spacing';
import type { PlayerColor, TerritoryId, GameMode, GameRules } from '../../src/engine/types';
import { DEFAULT_RULES } from '../../src/engine/types';
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
function useTerritoryFills(st: ReturnType<typeof useGame>['state']) {
  const { colors } = useTheme();
  return useMemo(() => {
    if (!st) return {};
    const fills: Record<string, string> = {};
    for (const ts of Object.values(st.territories)) {
      fills[ts.id] = ts.owner
        ? PLAYER_COLOR_HEX[st.players.find(p => p.id === ts.owner)!.color]
        : colors.territoryNeutral;
    }
    return fills;
  }, [st?.territories, st?.players, colors.territoryNeutral]);
}

function useArmyCounts(st: ReturnType<typeof useGame>['state']) {
  return useMemo(() => {
    if (!st) return {};
    const counts: Record<string, number> = {};
    for (const ts of Object.values(st.territories)) {
      if (ts.armies > 0) counts[ts.id] = ts.armies;
    }
    return counts;
  }, [st?.territories]);
}

// ── Setup screen ─────────────────────────────────────────────────────────────

function SetupScreen() {
  const { startGame, hasSavedGame, resumeGame } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [selectedColors, setSelectedColors] = useState<PlayerColor[]>(['red', 'blue', 'green', 'yellow', 'black', 'pink']);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [randomDeal, setRandomDeal] = useState(false);
  const [randomPlacement, setRandomPlacement] = useState(false);
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);

  const toggleRule = <K extends keyof GameRules>(key: K, value: GameRules[K]) =>
    setRules(r => ({ ...r, [key]: value }));

  const handleStart = () => {
    const configs: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
      name: names[i] || `Player ${i + 1}`,
      color: selectedColors[i],
    }));
    startGame(configs, gameMode, randomDeal ? 'random' : 'claim', randomPlacement, rules);
  };

  const pickColor = (playerIdx: number, color: PlayerColor) => {
    setSelectedColors(prev => { const n = [...prev]; n[playerIdx] = color; return n; });
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

      {/* Player count */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>{t('game.playerCount')}</Text>
      <View style={[styles.countRow, { marginBottom: Spacing.lg }]}>
        {[2, 3, 4, 5, 6].map(n => (
          <Pressable key={n} onPress={() => setPlayerCount(n)} style={[styles.countBtn, { backgroundColor: playerCount === n ? colors.primary : colors.surface, borderColor: colors.border }]}>
            <Text variant="body" style={{ color: playerCount === n ? '#fff' : colors.text }}>{n}</Text>
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
      {Array.from({ length: playerCount }, (_, i) => (
        <View key={i} style={[styles.playerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.playerColorDot, { backgroundColor: PLAYER_COLOR_HEX[selectedColors[i]] }]} />
          <View style={{ flex: 1, gap: Spacing.xs }}>
            <TextInput
              value={names[i]}
              onChangeText={text => setNames(prev => { const n = [...prev]; n[i] = text; return n; })}
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={`Player ${i + 1}`}
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.colorPicker}>
              {ALL_COLORS.filter(c => !selectedColors.includes(c) || selectedColors[i] === c).map(color => (
                <Pressable key={color} onPress={() => pickColor(i, color)} style={[styles.colorSwatch, { backgroundColor: PLAYER_COLOR_HEX[color], borderWidth: selectedColors[i] === color ? 2 : 0, borderColor: colors.text }]} />
              ))}
            </View>
          </View>
        </View>
      ))}

      <Pressable onPress={handleStart} style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}>
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

  if (!deviceUnlocked && !allChosen) {
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
  return (
    <Screen>
      <View style={styles.center}>
        {winner && <View style={[styles.winnerDot, { backgroundColor: PLAYER_COLOR_HEX[winner.color] }]} />}
        <Text variant="h2" style={{ color: colors.text, textAlign: 'center' }}>
          {winner ? t('game.winner').replace('{{name}}', winner.name) : 'Game Over'}
        </Text>
        {winner?.mission && (
          <View style={[styles.missionBadge, { backgroundColor: colors.success }]}>
            <Text variant="caption" style={{ color: '#fff', textAlign: 'center' }}>{winner.mission.type}</Text>
          </View>
        )}
        <Pressable onPress={resetGame} style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}>
          <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.playAgain')}</Text>
        </Pressable>
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
  const [showMission, setShowMission] = useState(false);
  const [passDeviceVisible, setPassDeviceVisible] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [logHighlightedIds, setLogHighlightedIds] = useState<Set<string>>(new Set());
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

  React.useEffect(() => {
    if (state?.lastBattleResult) setShowDice(true);
  }, [state?.lastBattleResult]);

  // Show pass-device screen when the active player changes (mission mode only)
  React.useEffect(() => {
    if (st.mode === 'mission' && st.phase === 'REINFORCE') {
      if (prevActivePlayer.current !== null && prevActivePlayer.current !== activePlayerId) {
        setPassDeviceVisible(true);
        setSelection({ phase: 'none' });
      }
    }
    prevActivePlayer.current = activePlayerId;
  }, [activePlayerId, st.phase]);

  const territoryFills = useTerritoryFills(st);
  const armyCounts = useArmyCounts(st);

  // HQ highlights for capital mode
  const hqHighlights = useMemo(() => {
    if (st.mode !== 'capital' || !st.hqsRevealed) return new Set<string>();
    const s = new Set<string>();
    for (const p of st.players) {
      if (p.hqTerritoryId) s.add(p.hqTerritoryId);
    }
    return s;
  }, [st.mode, st.hqsRevealed, st.players]);

  const { selectableIds, highlightedIds } = useMemo(() => {
    const selectable = new Set<string>();
    const highlighted = new Set<string>(hqHighlights);

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
          highlighted.add(selection.from);
          for (const adjId of (TERRITORIES.find(t => t.id === selection.from)?.adjacentTo ?? [])) {
            const adjT = st.territories[adjId as TerritoryId];
            if (adjT?.owner && adjT.owner !== activePlayerId) { selectable.add(adjId); highlighted.add(adjId); }
          }
          for (const ts of Object.values(st.territories)) { if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id); }
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
      if (st.setupSubPhase === 'CLAIMING') dispatch({ type: 'CLAIM_TERRITORY', territoryId: id });
      else dispatch({ type: 'PLACE_SETUP_ARMY', territoryId: id });
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
        <ZoomableMap ref={zoomMapRef}>
          <RiskBoardMap
            showRiskLayer
            onTerritorySelect={handleTerritorySelect}
            territoryFills={territoryFills}
            armyCounts={armyCounts}
            highlightedIds={allHighlightedIds}
            selectableIds={selectableIds}
          />
        </ZoomableMap>

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

      <ActionPanel state={st} dispatch={dispatch} selection={selection} onSelectionChange={setSelection} onOpenCards={() => setShowCards(true)} />

      <DiceModal result={showDice ? st.lastBattleResult : null} onDismiss={() => setShowDice(false)} />

      <CardHandModal
        visible={showCards}
        hand={activePlayer.hand}
        setsTraded={st.setsTraded}
        onTrade={cardIds => dispatch({ type: 'TRADE_IN_CARDS', cardIds })}
        onClose={() => setShowCards(false)}
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
  countBtn:      { width: 44, height: 44, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modeBtn:       { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center' },
  checkboxRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkboxBox:   { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playerCard:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md },
  playerColorDot:{ width: 24, height: 24, borderRadius: 12 },
  nameInput:     { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: 16 },
  colorPicker:   { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  colorSwatch:   { width: 24, height: 24, borderRadius: 12 },
  startBtn:      { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  resumeBtn:     { borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, marginBottom: Spacing.md },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  winnerDot:     { width: 64, height: 64, borderRadius: 32, marginBottom: Spacing.md },
  missionBadge:  { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  missionBtn:    { borderBottomWidth: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, alignItems: 'flex-end' },
  topBarActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  topChip:       { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  mapRow:        { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  logSidebar:    { width: 200 },
  hqHeader:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1 },
  colorDot:      { width: 16, height: 16, borderRadius: 8 },
  hqPanel:       { borderTopWidth: 1, padding: Spacing.md, gap: Spacing.sm },
});
