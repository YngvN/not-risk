import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing } from '../../constants/spacing';
import type { GameState, Phase } from '../../engine/types';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';

interface PhaseBarProps {
  state: GameState;
}

function phaseLabel(phase: Phase, setupSubPhase: GameState['setupSubPhase']): string {
  if (phase === 'SETUP') return setupSubPhase === 'CLAIMING' ? 'game.phaseSetupClaiming' : 'game.phaseSetupPlacing';
  if (phase === 'REINFORCE') return 'game.phaseReinforce';
  if (phase === 'ATTACK') return 'game.phaseAttack';
  if (phase === 'FORTIFY') return 'game.phaseFortify';
  return 'game.phaseReinforce';
}

/**
 * Single-line strip: colour dot · phase label · armies remaining · player name (small, right).
 */
export function PhaseBar({ state }: PhaseBarProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const activePlayer = state.players.find(p => p.id === state.activePlayerId);
  if (!activePlayer) return null;

  const playerColor = PLAYER_COLOR_HEX[activePlayer.color];
  const labelKey = phaseLabel(state.phase, state.setupSubPhase) as Parameters<typeof t>[0];

  const showArmies =
    (state.phase === 'REINFORCE' && state.reinforcementsRemaining > 0) ||
    (state.phase === 'SETUP' && (state.setupArmiesRemaining[activePlayer.id] ?? 0) > 0);

  const armyCount =
    state.phase === 'REINFORCE'
      ? state.reinforcementsRemaining
      : state.setupArmiesRemaining[activePlayer.id] ?? 0;

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: playerColor }]} />

      <Text variant="body" style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
        {t(labelKey)}
        {showArmies
          ? <Text variant="body" style={{ color: colors.textSecondary }}>
              {`  ·  ${t('game.armiesRemaining').replace('{{n}}', String(armyCount))}`}
            </Text>
          : null}
      </Text>

      <Text variant="caption" style={{ color: colors.textSecondary }}>
        {activePlayer.name}
      </Text>

      {state.mustTradeCards && (
        <View style={[styles.badge, { backgroundColor: colors.warning }]}>
          <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
