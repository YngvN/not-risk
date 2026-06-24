import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { MissionCard as MissionCardType, GameState } from '../../engine/types';
import { missionDescription, checkMission } from '../../engine/missions';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';

interface MissionCardProps {
  visible: boolean;
  mission: MissionCardType;
  playerId: string;
  state: GameState;
  onClose: () => void;
}

/**
 * Bottom-sheet that reveals a player's secret mission card.
 * Shown when the player explicitly requests to view it (after passing device).
 */
export function MissionCard({ visible, mission, playerId, state, onClose }: MissionCardProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const isComplete = checkMission(playerId, mission, state);
  const description = missionDescription(mission);

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <MotiView
            from={{ translateY: 60, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: isComplete ? colors.success : colors.border }]}
          >
            {/* Card header */}
            <View style={[styles.headerBand, { backgroundColor: isComplete ? colors.success : colors.primary }]}>
              <Text variant="caption" style={{ color: '#fff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                {t('game.secretMission')}
              </Text>
              {isComplete && (
                <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
                  {' '}✓ {t('game.missionComplete')}
                </Text>
              )}
            </View>

            {/* Mission description */}
            <View style={styles.body}>
              <Text variant="h3" style={{ color: colors.text, textAlign: 'center', lineHeight: 28 }}>
                {description}
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

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Text variant="body" style={{ color: colors.textSecondary }}>{t('game.hideMission')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 250,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  headerBand: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  body: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  targetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  closeBtn: {
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
