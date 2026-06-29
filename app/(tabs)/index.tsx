import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useGame } from '../../src/context/GameContext';
import { Spacing, BorderRadius } from '../../src/constants/spacing';

/** Home tab — app entry point with main navigation actions. */
export default function HomeScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { hasSavedGame, resumeGame, resetGame } = useGame();

  const handleContinue = async () => {
    await resumeGame();
    router.navigate('/game' as never);
  };

  const handleNewGame = () => {
    resetGame();
    router.navigate('/game' as never);
  };

  const handleLanGame = () => {
    router.navigate('/lobby' as never);
  };

  const handleViewMaps = () => {
    router.navigate('/map' as never);
  };

  const handleSettings = () => {
    router.navigate('/settings' as never);
  };

  return (
    <Screen>
      <View style={styles.root}>
        {/* Logo */}
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.header}
        >
          <View style={[styles.iconRing, { borderColor: colors.primary }]}>
            <Ionicons name="earth" size={52} color={colors.primary} />
          </View>
          {/* fRISKy logotype — lowercase f, uppercase RISK, lowercase y */}
          <View style={styles.logoRow}>
            <Text style={[styles.logoLower, { color: colors.text }]}>f</Text>
            <Text style={[styles.logoUpper, { color: colors.primary }]}>RISK</Text>
            <Text style={[styles.logoLower, { color: colors.text }]}>y</Text>
          </View>
          <Text variant="body" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('home.welcome')}
          </Text>
        </MotiView>

        {/* Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 120 }}
          style={styles.actions}
        >
          {hasSavedGame && (
            <Pressable
              onPress={handleContinue}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
            >
              <Text variant="body" style={styles.btnTextPrimary}>
                {t('game.resumeGame')}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleNewGame}
            style={[
              styles.btn,
              hasSavedGame ? styles.btnSecondary : styles.btnPrimary,
              {
                backgroundColor: hasSavedGame ? colors.surface : colors.primary,
                borderColor: hasSavedGame ? colors.border : 'transparent',
                borderWidth: hasSavedGame ? 1 : 0,
              },
            ]}
          >
            <Text
              variant="body"
              style={[
                hasSavedGame ? styles.btnTextSecondary : styles.btnTextPrimary,
                { color: hasSavedGame ? colors.text : '#fff' },
              ]}
            >
              {t('game.newGame')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLanGame}
            style={[styles.btn, styles.btnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          >
            <View style={styles.btnRow}>
              <Ionicons name="wifi-outline" size={18} color={colors.text} />
              <Text variant="body" style={[styles.btnTextSecondary, { color: colors.text }]}>
                {t('home.findLanGame')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleViewMaps}
            style={[styles.btn, styles.btnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          >
            <View style={styles.btnRow}>
              <Ionicons name="map-outline" size={18} color={colors.text} />
              <Text variant="body" style={[styles.btnTextSecondary, { color: colors.text }]}>
                {t('home.viewMaps')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleSettings}
            style={[styles.btn, styles.btnSecondary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Text variant="body" style={[styles.btnTextSecondary, { color: colors.text }]}>
              {t('settings.title')}
            </Text>
          </Pressable>
        </MotiView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoLower: {
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: -1,
  },
  logoUpper: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 2,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.md,
  },
  btn: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  btnPrimary: {},
  btnSecondary: {},
  btnTextPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
  btnTextSecondary: {
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
