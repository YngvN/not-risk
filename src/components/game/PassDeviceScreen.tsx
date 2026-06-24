import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';
import type { Player } from '../../engine/types';

interface PassDeviceScreenProps {
  visible: boolean;
  player: Player;
  onUnlock: () => void;
}

/**
 * Full-screen overlay shown when the active player changes in modes
 * where hidden information (missions, HQ) must stay private.
 * The new player taps to unlock their view.
 */
export function PassDeviceScreen({ visible, player, onUnlock }: PassDeviceScreenProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const playerColor = PLAYER_COLOR_HEX[player.color];

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={[styles.backdrop, { backgroundColor: colors.background }]}
        >
          <MotiView
            from={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 100 }}
            style={styles.content}
          >
            <View style={[styles.colorOrb, { backgroundColor: playerColor }]} />

            <Text variant="h2" style={{ color: colors.text, textAlign: 'center' }}>
              {t('game.passDevice')}
            </Text>
            <Text variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>
              {t('game.passDeviceSub').replace('{{name}}', player.name)}
            </Text>

            <Pressable
              onPress={onUnlock}
              style={[styles.unlockBtn, { backgroundColor: playerColor }]}
            >
              <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>
                {t('game.iAm').replace('{{name}}', player.name)}
              </Text>
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
    zIndex: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  colorOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  unlockBtn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
});
