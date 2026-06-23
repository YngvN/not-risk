import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Screen, Text, Card } from '../../src/components';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing } from '../../src/constants/spacing';

/** Settings tab — controls for theme and language preferences. */
export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLanguage();

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
});
