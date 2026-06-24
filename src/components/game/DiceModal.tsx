import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { BattleResult } from '../../engine/types';

interface DiceModalProps {
  result: BattleResult | null;
  onDismiss: () => void;
}

function DieFace({ value, lost }: { value: number; lost: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.die, { borderColor: lost ? colors.error : colors.success, backgroundColor: colors.surface }]}>
      <Text variant="h3" style={{ color: lost ? colors.error : colors.success }}>{value}</Text>
    </View>
  );
}

/**
 * Overlay sheet that displays battle dice results.
 * Rendered over the game screen whenever lastBattleResult is set.
 */
export function DiceModal({ result, onDismiss }: DiceModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {result && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={[styles.backdrop]}
        >
          <MotiView
            from={{ translateY: 60, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text variant="h3" style={{ color: colors.text, textAlign: 'center' }}>
              {t('game.diceResult')}
            </Text>

            <View style={styles.sidesRow}>
              <View style={styles.side}>
                <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  {t('game.attacker')}
                </Text>
                <View style={styles.diceRow}>
                  {result.attackerDice.map((v, i) => (
                    <DieFace key={i} value={v} lost={i < result.attackerLosses} />
                  ))}
                </View>
                <Text variant="caption" style={{ color: colors.error }}>
                  {t('game.losses').replace('{{n}}', String(result.attackerLosses))}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.side}>
                <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  {t('game.defender')}
                </Text>
                <View style={styles.diceRow}>
                  {result.defenderDice.map((v, i) => (
                    <DieFace key={i} value={v} lost={i < result.defenderLosses} />
                  ))}
                </View>
                <Text variant="caption" style={{ color: colors.error }}>
                  {t('game.losses').replace('{{n}}', String(result.defenderLosses))}
                </Text>
              </View>
            </View>

            {result.captured && (
              <Text variant="body" style={{ color: colors.success, textAlign: 'center', fontWeight: '700' }}>
                {t('game.captured')}
              </Text>
            )}

            <Pressable
              onPress={onDismiss}
              style={[styles.dismissBtn, { backgroundColor: colors.primary }]}
            >
              <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>{t('common.ok')}</Text>
            </Pressable>
          </MotiView>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sidesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  diceRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  die: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.xs,
  },
  dismissBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
