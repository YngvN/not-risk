import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, TextInput } from 'react-native';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { ZoomableMap } from '../../src/components/map/ZoomableMap';
import { RiskBoardMap } from '../../src/components/map/RiskBoardMap';
import { PhaseBar, DiceModal, ActionPanel, CardHandModal, type SelectionMode } from '../../src/components/game';
import { useGame, PLAYER_COLOR_HEX } from '../../src/context/GameContext';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing, BorderRadius } from '../../src/constants/spacing';
import type { PlayerColor, TerritoryId } from '../../src/engine/types';
import { TERRITORIES, type Territory } from '../../src/constants/riskWorldTerritories';
import { areAdjacent, getConnectedOwned } from '../../src/engine/board';
import type { PlayerConfig, SetupMode } from '../../src/engine/setup';

// ── Setup screen ─────────────────────────────────────────────────────────────

const ALL_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'black', 'pink'];
const DEFAULT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank'];

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <View style={[
        styles.checkboxBox,
        { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.surface },
      ]}>
        {checked && <Text variant="caption" style={{ color: '#fff', fontWeight: '700', lineHeight: 16 }}>✓</Text>}
      </View>
      <Text variant="body" style={{ color: colors.text, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

function SetupScreen() {
  const { startGame } = useGame();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [selectedColors, setSelectedColors] = useState<PlayerColor[]>(['red', 'blue', 'green', 'yellow', 'black', 'pink']);
  const [randomDeal, setRandomDeal] = useState(false);
  const [randomPlacement, setRandomPlacement] = useState(false);

  const handleStart = () => {
    const configs: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
      name: names[i] || `Player ${i + 1}`,
      color: selectedColors[i],
    }));
    startGame(configs, randomDeal ? 'random' : 'claim', randomPlacement);
  };

  const pickColor = (playerIdx: number, color: PlayerColor) => {
    setSelectedColors(prev => {
      const next = [...prev];
      next[playerIdx] = color;
      return next;
    });
  };

  return (
    <Screen scrollable>
      <Text variant="h2" style={{ color: colors.text, marginBottom: Spacing.md }}>
        {t('game.newGame')}
      </Text>

      {/* Player count */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>
        {t('game.playerCount')}
      </Text>
      <View style={[styles.countRow, { marginBottom: Spacing.lg }]}>
        {[2, 3, 4, 5, 6].map(n => (
          <Pressable
            key={n}
            onPress={() => setPlayerCount(n)}
            style={[
              styles.countBtn,
              {
                backgroundColor: playerCount === n ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text variant="body" style={{ color: playerCount === n ? '#fff' : colors.text }}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {/* Setup options */}
      <Text variant="body" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>
        {t('game.setupModeLabel')}
      </Text>
      <View style={{ marginBottom: Spacing.lg, gap: Spacing.sm }}>
        <Checkbox
          checked={randomDeal}
          onToggle={() => setRandomDeal(v => !v)}
          label={t('game.setupModeRandom')}
        />
        <Checkbox
          checked={randomPlacement}
          onToggle={() => setRandomPlacement(v => !v)}
          label={t('game.setupModeRandomPlacement')}
        />
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
                <Pressable
                  key={color}
                  onPress={() => pickColor(i, color)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: PLAYER_COLOR_HEX[color],
                      borderWidth: selectedColors[i] === color ? 2 : 0,
                      borderColor: colors.text,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      ))}

      <Pressable
        onPress={handleStart}
        style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}
      >
        <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.startGame')}</Text>
      </Pressable>
    </Screen>
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
        {winner && (
          <View style={[styles.winnerDot, { backgroundColor: PLAYER_COLOR_HEX[winner.color] }]} />
        )}
        <Text variant="h2" style={{ color: colors.text, textAlign: 'center' }}>
          {winner ? t('game.winner').replace('{{name}}', winner.name) : 'Game Over'}
        </Text>
        <Pressable
          onPress={resetGame}
          style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: Spacing.lg }]}
        >
          <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('game.playAgain')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ── Main play screen ──────────────────────────────────────────────────────────

function PlayScreen() {
  const { state, dispatch } = useGame();
  const { colors } = useTheme();
  const [selection, setSelection] = useState<SelectionMode>({ phase: 'none' });
  const [showDice, setShowDice] = useState(false);
  const [showCards, setShowCards] = useState(false);

  // Show dice modal when a new battle result arrives
  React.useEffect(() => {
    if (state?.lastBattleResult) setShowDice(true);
  }, [state?.lastBattleResult]);

  const st = state!;
  const activePlayerId = st.activePlayerId;

  // Build territory fill overrides from game state
  const territoryFills = useMemo(() => {
    const fills: Record<string, string> = {};
    for (const ts of Object.values(st.territories)) {
      if (ts.owner) {
        const player = st.players.find(p => p.id === ts.owner);
        if (player) fills[ts.id] = PLAYER_COLOR_HEX[player.color];
      } else {
        fills[ts.id] = colors.territoryNeutral;
      }
    }
    return fills;
  }, [st.territories, st.players, colors.territoryNeutral]);

  // Build army counts map
  const armyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ts of Object.values(st.territories)) {
      if (ts.armies > 0) counts[ts.id] = ts.armies;
    }
    return counts;
  }, [st.territories]);

  // Compute selectable + highlighted territory IDs based on phase and selection
  const { selectableIds, highlightedIds } = useMemo(() => {
    const selectable = new Set<string>();
    const highlighted = new Set<string>();

    if (st.phase === 'SETUP') {
      if (st.setupSubPhase === 'CLAIMING') {
        // Can tap any unclaimed territory
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === null) selectable.add(ts.id);
        }
      } else {
        // PLACING — tap own territories
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === activePlayerId) selectable.add(ts.id);
        }
      }
    } else if (st.phase === 'REINFORCE') {
      for (const ts of Object.values(st.territories)) {
        if (ts.owner === activePlayerId) selectable.add(ts.id);
      }
    } else if (st.phase === 'ATTACK') {
      if (st.captureContext) {
        // Nothing selectable while capture is pending
      } else if (selection.phase === 'ATTACK_FROM') {
        const { from } = selection;
        highlighted.add(from);
        // Adjacent enemy territories
        const fromT = st.territories[from];
        for (const adjId of (TERRITORIES.find(t => t.id === from)?.adjacentTo ?? [])) {
          const adjT = st.territories[adjId as TerritoryId];
          if (adjT?.owner && adjT.owner !== activePlayerId) {
            selectable.add(adjId);
            highlighted.add(adjId);
          }
        }
        // Also allow re-selecting own territories to change attacker
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id);
        }
      } else {
        // No selection — allow picking attacker
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id);
        }
      }
    } else if (st.phase === 'FORTIFY') {
      if (selection.phase === 'FORTIFY_FROM') {
        const { from } = selection;
        highlighted.add(from);
        const targets = getConnectedOwned(from, activePlayerId, st.territories);
        targets.delete(from as TerritoryId);
        for (const id of targets) {
          selectable.add(id);
          highlighted.add(id);
        }
        // Still allow re-picking fortify source
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id);
        }
      } else {
        for (const ts of Object.values(st.territories)) {
          if (ts.owner === activePlayerId && ts.armies >= 2) selectable.add(ts.id);
        }
      }
    }

    return { selectableIds: selectable, highlightedIds: highlighted };
  }, [st, activePlayerId, selection]);

  const handleTerritorySelect = (territory: Territory | null) => {
    if (!territory) return;
    const id = territory.id as TerritoryId;
    const ts = st.territories[id];

    if (st.phase === 'SETUP') {
      if (st.setupSubPhase === 'CLAIMING') {
        dispatch({ type: 'CLAIM_TERRITORY', territoryId: id });
      } else {
        dispatch({ type: 'PLACE_SETUP_ARMY', territoryId: id });
      }
      return;
    }

    if (st.phase === 'REINFORCE') {
      if (ts?.owner === activePlayerId && st.reinforcementsRemaining > 0 && !st.mustTradeCards) {
        dispatch({ type: 'REINFORCE', territoryId: id, count: 1 });
      }
      return;
    }

    if (st.phase === 'ATTACK') {
      if (st.captureContext) return;
      if (selection.phase === 'ATTACK_FROM') {
        if (ts?.owner === activePlayerId && ts.armies >= 2) {
          // Switch attacker
          setSelection({ phase: 'ATTACK_FROM', from: id });
        } else if (ts?.owner && ts.owner !== activePlayerId && areAdjacent(selection.from, id)) {
          // Picked target
          setSelection({ phase: 'ATTACK_TO', from: selection.from, to: id });
        }
      } else {
        if (ts?.owner === activePlayerId && ts.armies >= 2) {
          setSelection({ phase: 'ATTACK_FROM', from: id });
        }
      }
      return;
    }

    if (st.phase === 'FORTIFY') {
      if (selection.phase === 'FORTIFY_FROM') {
        const connected = getConnectedOwned(selection.from, activePlayerId, st.territories);
        if (id === selection.from) {
          setSelection({ phase: 'none' });
        } else if (connected.has(id) && id !== selection.from) {
          setSelection({ phase: 'FORTIFY_TO', from: selection.from, to: id });
        } else if (ts?.owner === activePlayerId && ts.armies >= 2) {
          setSelection({ phase: 'FORTIFY_FROM', from: id });
        }
      } else {
        if (ts?.owner === activePlayerId && ts.armies >= 2) {
          setSelection({ phase: 'FORTIFY_FROM', from: id });
        }
      }
      return;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PhaseBar state={st} />

      <ZoomableMap>
        <RiskBoardMap
          showRiskLayer
          onTerritorySelect={handleTerritorySelect}
          territoryFills={territoryFills}
          armyCounts={armyCounts}
          highlightedIds={highlightedIds}
          selectableIds={selectableIds}
        />
      </ZoomableMap>

      <ActionPanel
        state={st}
        dispatch={dispatch}
        selection={selection}
        onSelectionChange={setSelection}
        onOpenCards={() => setShowCards(true)}
      />

      <DiceModal
        result={showDice ? st.lastBattleResult : null}
        onDismiss={() => setShowDice(false)}
      />

      <CardHandModal
        visible={showCards}
        hand={st.players.find(p => p.id === st.activePlayerId)?.hand ?? []}
        setsTraded={st.setsTraded}
        onTrade={cardIds => dispatch({ type: 'TRADE_IN_CARDS', cardIds })}
        onClose={() => setShowCards(false)}
      />
    </View>
  );
}

// ── Tab entry point ───────────────────────────────────────────────────────────

export default function GameScreen() {
  const { state } = useGame();

  if (!state) return <SetupScreen />;
  if (state.phase === 'GAME_OVER') return <GameOverScreen />;
  return <PlayScreen />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  countRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  playerColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 16,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  startBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  winnerDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.md,
  },
});
