import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import { Slider } from '../ui/Slider';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { GameState, GameAction, TerritoryId } from '../../engine/types';
import { detectSets } from '../../engine/cards';
import { TERRITORIES } from '../../constants/riskWorldTerritories';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';

export type SelectionMode =
  | { phase: 'none' }
  | { phase: 'ATTACK_FROM'; from: TerritoryId }
  | { phase: 'ATTACK_TO'; from: TerritoryId; to: TerritoryId }
  | { phase: 'FORTIFY_FROM'; from: TerritoryId }
  | { phase: 'FORTIFY_TO'; from: TerritoryId; to: TerritoryId };

interface ActionPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
  selection: SelectionMode;
  onSelectionChange: (s: SelectionMode) => void;
  onOpenCards: () => void;
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const bg = disabled ? colors.border : variant === 'secondary' ? colors.surface : colors.primary;
  const fg = variant === 'secondary' && !disabled ? colors.text : '#fff';
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, { backgroundColor: bg }]}>
      <Text variant="body" style={{ color: fg, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Wrapper that gives every phase panel a consistent container:
 * thick top border in the player's colour, small name label at the top.
 */
function Panel({
  playerColor,
  playerName,
  children,
}: {
  playerColor: string;
  playerName: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderTopColor: playerColor }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 0.2 }}>
        {playerName}
      </Text>
      {children}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Context-sensitive bottom panel.
 * The top border colour matches the active player; their name is shown small above the controls.
 */
export function ActionPanel({ state, dispatch, selection, onSelectionChange, onOpenCards }: ActionPanelProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [fortifyArmies, setFortifyArmies] = useState(1);
  const [occupyArmies, setOccupyArmies] = useState(1);

  const activePlayer = state.players.find(p => p.id === state.activePlayerId)!;
  const playerColor = PLAYER_COLOR_HEX[activePlayer.color];
  const name = activePlayer.name;

  React.useEffect(() => {
    if (state.captureContext) setOccupyArmies(state.captureContext.minArmies);
  }, [state.captureContext?.from, state.captureContext?.to]);

  React.useEffect(() => {
    setFortifyArmies(1);
  }, [selection.phase === 'FORTIFY_TO' ? (selection as { to: TerritoryId }).to : null]);

  // ── Territory bonus pending ──────────────────────────────────────────────────
  if (state.pendingTerritoryBonus) {
    return (
      <Panel playerColor={playerColor} playerName={name}>
        <Text variant="body" style={{ color: colors.success, fontWeight: '700' }}>
          {t('game.territoryBonus')}
        </Text>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {t('game.pickBonusTerritory')}
        </Text>
        <View style={styles.row}>
          {state.pendingTerritoryBonus.map(id => {
            const terr = TERRITORIES.find(tr => tr.id === id);
            return (
              <Btn
                key={id}
                label={`+2 ${terr ? t(terr.labelKey) : id}`}
                onPress={() => dispatch({ type: 'CLAIM_TERRITORY_BONUS', territoryId: id })}
              />
            );
          })}
        </View>
      </Panel>
    );
  }

  // ── Occupy (capture pending) ─────────────────────────────────────────────────
  if (state.captureContext) {
    const { minArmies, maxArmies } = state.captureContext;
    return (
      <Panel playerColor={playerColor} playerName={name}>
        <View style={styles.labelRow}>
          <Text variant="body" style={{ color: colors.text, fontWeight: '700' }}>
            {t('game.occupyTitle')}
          </Text>
          <Text variant="h3" style={{ color: colors.primary }}>{occupyArmies}</Text>
        </View>
        <Slider value={occupyArmies} min={minArmies} max={maxArmies} onChange={setOccupyArmies} />
        <Btn
          label={t('game.occupyMove').replace('{{n}}', String(occupyArmies))}
          onPress={() => dispatch({ type: 'OCCUPY', armies: occupyArmies })}
        />
      </Panel>
    );
  }

  // ── Must trade cards ─────────────────────────────────────────────────────────
  if (state.mustTradeCards) {
    return (
      <Panel playerColor={playerColor} playerName={name}>
        <Text variant="body" style={{ color: colors.warning, fontWeight: '700' }}>
          {t('game.mustTrade')}
        </Text>
        <Btn label={`${t('game.tradeCards')}  (${activePlayer.hand.length})`} onPress={onOpenCards} />
      </Panel>
    );
  }

  // ── REINFORCE ────────────────────────────────────────────────────────────────
  if (state.phase === 'REINFORCE') {
    const hasSet = detectSets(activePlayer.hand).length > 0;
    const canEnd = state.reinforcementsRemaining === 0;
    const canUndo = state.rules.allowReinforceUndo &&
      state.reinforceSnapshot !== null &&
      state.reinforcementsRemaining < state.reinforceSnapshot.total;
    return (
      <Panel playerColor={playerColor} playerName={name}>
        <View style={styles.labelRow}>
          <Text variant="caption" style={{ color: colors.textSecondary }}>
            {t('game.armiesRemaining').replace('{{n}}', String(state.reinforcementsRemaining))}
            {'  ·  '}
            {t('game.setsTraded').replace('{{n}}', String(state.setsTraded))}
          </Text>
          {activePlayer.hand.length > 0 && (
            <Pressable
              onPress={onOpenCards}
              style={[styles.cardChip, { backgroundColor: hasSet ? colors.success : colors.surface, borderColor: colors.border }]}
            >
              <Text variant="caption" style={{ color: hasSet ? '#fff' : colors.textSecondary, fontWeight: '700' }}>
                {t('game.cardCount').replace('{{n}}', String(activePlayer.hand.length))}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={styles.row}>
          {canUndo && (
            <Btn label={t('game.undoReinforce')} variant="secondary" onPress={() => dispatch({ type: 'UNDO_REINFORCE' })} />
          )}
          <Btn label={t('game.endReinforce')} onPress={() => dispatch({ type: 'END_REINFORCE' })} disabled={!canEnd} />
        </View>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {t('game.tapToPlace')}
        </Text>
      </Panel>
    );
  }

  // ── ATTACK ───────────────────────────────────────────────────────────────────
  if (state.phase === 'ATTACK') {
    if (selection.phase === 'ATTACK_TO') {
      const { from, to } = selection;
      const maxDice = Math.min(3, state.territories[from].armies - 1);
      return (
        <Panel playerColor={playerColor} playerName={name}>
          <Text variant="body" style={{ color: colors.text, fontWeight: '700' }}>
            {t('game.phaseAttack')}
          </Text>
          <View style={styles.row}>
            {[1, 2, 3].filter(n => n <= maxDice).map(n => (
              <Btn
                key={n}
                label={t('game.attackWith').replace('{{n}}', String(n))}
                onPress={() => {
                  dispatch({ type: 'ATTACK', from, to, attackerDice: n });
                  onSelectionChange({ phase: 'none' });
                }}
              />
            ))}
          </View>
          <Btn label={t('common.cancel')} variant="secondary" onPress={() => onSelectionChange({ phase: 'none' })} />
        </Panel>
      );
    }

    return (
      <Panel playerColor={playerColor} playerName={name}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {selection.phase === 'ATTACK_FROM'
            ? t('game.tapEnemyToAttack')
            : t('game.tapOwnToAttackFrom')}
        </Text>
        <Btn label={t('game.endAttack')} variant="secondary" onPress={() => dispatch({ type: 'END_ATTACK' })} />
      </Panel>
    );
  }

  // ── FORTIFY ──────────────────────────────────────────────────────────────────
  if (state.phase === 'FORTIFY') {
    if (selection.phase === 'FORTIFY_TO') {
      const { from, to } = selection;
      const maxMove = state.territories[from].armies - 1;
      return (
        <Panel playerColor={playerColor} playerName={name}>
          <View style={styles.labelRow}>
            <Text variant="body" style={{ color: colors.text, fontWeight: '700' }}>
              {t('game.phaseFortify')}
            </Text>
            <Text variant="h3" style={{ color: colors.primary }}>{fortifyArmies}</Text>
          </View>
          <Slider value={fortifyArmies} min={1} max={maxMove} onChange={setFortifyArmies} />
          <View style={styles.row}>
            <Btn
              label={t('game.endFortify')}
              variant="secondary"
              onPress={() => { onSelectionChange({ phase: 'none' }); dispatch({ type: 'END_FORTIFY' }); }}
            />
            <Btn
              label={`${t('game.move')} ${fortifyArmies}`}
              onPress={() => {
                dispatch({ type: 'FORTIFY', from, to, armies: fortifyArmies });
                onSelectionChange({ phase: 'none' });
                setFortifyArmies(1);
              }}
            />
          </View>
        </Panel>
      );
    }

    return (
      <Panel playerColor={playerColor} playerName={name}>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          {selection.phase === 'FORTIFY_FROM'
            ? t('game.tapConnectedToFortify')
            : t('game.tapOwnToFortifyFrom')}
        </Text>
        <Btn label={t('game.endFortify')} variant="secondary" onPress={() => dispatch({ type: 'END_FORTIFY' })} />
      </Panel>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  panel: {
    borderTopWidth: 3,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minWidth: 80,
  },
  cardChip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
});
