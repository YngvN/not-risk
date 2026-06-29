import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { BattleResult } from '../../engine/types';

// ── Animated die ──────────────────────────────────────────────────────────────

function AnimatedDie({ value, lost, delay }: { value: number; lost: boolean; delay: number }) {
  const { colors } = useTheme();
  return (
    <MotiView
      from={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 200, delay }}
    >
      <View style={[styles.die, { borderColor: lost ? colors.error : colors.success, backgroundColor: colors.surface }]}>
        <Text variant="h3" style={{ color: lost ? colors.error : colors.success }}>{value}</Text>
      </View>
    </MotiView>
  );
}

// ── Side card (attacker or defender) ─────────────────────────────────────────

interface SideProps {
  label: string;
  dice: number[];
  losses: number;
  /** Delay offset so defender dice animate after attacker dice finish. */
  baseDelay: number;
}

function Side({ label, dice, losses, baseDelay }: SideProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={styles.side}>
      <Text variant="caption" style={{ color: losses > 0 ? colors.error : colors.success, fontWeight: '700' }}>
        {t('game.losses').replace('{{n}}', String(losses))}
      </Text>
      <Text variant="body" style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
      <View style={styles.diceRow}>
        {dice.map((v, i) => (
          <AnimatedDie key={i} value={v} lost={i < losses} delay={baseDelay + i * 180} />
        ))}
      </View>
    </View>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  result: BattleResult | null;
  attackerName: string;
  defenderName: string;
  /** Whether the attacker still has ≥ 2 armies and can attack the same territory again. */
  canAttackAgain: boolean;
  /** Dismiss and keep the ATTACK_TO selection so the attack slider reappears. */
  onAttackAgain: () => void;
  onDismiss: () => void;
  /** Wide-screen layout: sides placed in a row instead of a column. */
  isWide: boolean;
}

/**
 * Inline battle result display — replaces the DiceModal.
 * Dice animate in one by one; attacker dice first, defender dice after.
 * Layout adapts: column on narrow screens, row on wide screens.
 */
export function BattleResultPanel({
  result, attackerName, defenderName,
  canAttackAgain, onAttackAgain, onDismiss,
  isWide,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {result && (
        <MotiView
          from={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 24 }}
          transition={{ type: 'spring', damping: 20, stiffness: 240 }}
          style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Two sides */}
          <View style={isWide ? styles.sidesRow : styles.sidesCol}>
            <Side
              label={attackerName}
              dice={result.attackerDice}
              losses={result.attackerLosses}
              baseDelay={0}
            />

            <View style={[
              isWide ? styles.vertDivider : styles.horizDivider,
              { backgroundColor: colors.border },
            ]} />

            <Side
              label={defenderName}
              dice={result.defenderDice}
              losses={result.defenderLosses}
              baseDelay={result.attackerDice.length * 180 + 120}
            />
          </View>

          {/* Captured banner */}
          {result.captured && (
            <Text variant="body" style={{ color: colors.success, textAlign: 'center', fontWeight: '700' }}>
              {t('game.captured')}
            </Text>
          )}

          {/* Buttons — no Skip; Attack Again only when applicable */}
          <View style={styles.btnRow}>
            {canAttackAgain && (
              <Pressable
                onPress={onAttackAgain}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>
                  {t('game.attackAgain')}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onDismiss}
              style={[styles.btn, { backgroundColor: canAttackAgain ? colors.surface : colors.primary, borderWidth: canAttackAgain ? 1 : 0, borderColor: colors.border }]}
            >
              <Text variant="body" style={{ color: canAttackAgain ? colors.text : '#fff', fontWeight: '700' }}>
                {t('common.ok')}
              </Text>
            </Pressable>
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sidesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sidesCol: {
    flexDirection: 'column',
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
  vertDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: Spacing.sm,
  },
  horizDivider: {
    height: 1,
    alignSelf: 'stretch',
    marginVertical: Spacing.xs,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
