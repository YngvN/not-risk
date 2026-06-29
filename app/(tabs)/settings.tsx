import { StyleSheet, Switch, TouchableOpacity, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useTesting } from '../../src/context/TestingContext';
import { useLabelPositions } from '../../src/hooks/useLabelPositions';
import { Spacing } from '../../src/constants/spacing';

/** Settings tab — controls for theme, language, and testing preferences. */
export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const { showAllMissions, setShowAllMissions, allowMapEditing, setAllowMapEditing } = useTesting();
  const { restore: restoreLabels } = useLabelPositions();
  const router = useRouter();

  return (
    <Screen scrollable padded>
      <Text variant="h1" style={styles.pageTitle}>
        {t('settings.title')}
      </Text>

      {/* ── Appearance ──────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('settings.appearance')}
      </Text>
      <Card>
        <View style={styles.row}>
          <Text>{t('settings.theme')}</Text>
          <View style={styles.themeRow}>
            <Text variant="caption" secondary>
              {isDark ? t('settings.themeDark') : t('settings.themeLight')}
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel={t('settings.theme')}
            />
          </View>
        </View>
      </Card>

      {/* ── Language ────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('settings.language')}
      </Text>
      <Card>
        <Text variant="label" secondary style={styles.languageHint}>
          {t('settings.languageSelect')}
        </Text>
        {availableLanguages.map((lang, index) => {
          const isLast = index === availableLanguages.length - 1;
          const isActive = language === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageRow,
                !isLast && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => setLanguage(lang.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
            >
              <Text>{lang.label}</Text>
              {isActive && (
                <Text style={{ color: colors.primary }}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </Card>
      {/* ── Testing ─────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('settings.testing')}
      </Text>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text>{t('settings.showAllMissions')}</Text>
            <Text variant="caption" secondary>{t('settings.showAllMissionsHint')}</Text>
          </View>
          <Switch
            value={showAllMissions}
            onValueChange={setShowAllMissions}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.divider, { borderTopColor: colors.border }]} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text>{t('settings.allowMapEditing')}</Text>
            <Text variant="caption" secondary>{t('settings.allowMapEditingHint')}</Text>
          </View>
          <Switch
            value={allowMapEditing}
            onValueChange={setAllowMapEditing}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.divider, { borderTopColor: colors.border }]} />
        <Pressable style={styles.row} onPress={restoreLabels}>
          <Text>{t('settings.restoreLabelPositions')}</Text>
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        </Pressable>
        <View style={[styles.divider, { borderTopColor: colors.border }]} />
        <Pressable style={styles.row} onPress={() => router.navigate('/components' as never)}>
          <Text>{t('settings.viewComponents')}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  languageHint: {
    marginBottom: Spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: Spacing.sm,
  },
});
