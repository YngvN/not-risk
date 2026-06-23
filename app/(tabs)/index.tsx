import { StyleSheet } from 'react-native';
import { Screen, Text, Card } from '../../src/components';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing } from '../../src/constants/spacing';

/** Home tab — landing screen of the app. */
export default function HomeScreen() {
  const { t } = useLanguage();

  return (
    <Screen scrollable padded>
      <Text variant="h1" style={styles.title}>
        {t('home.welcome')}
      </Text>
      <Card>
        <Text>{t('home.description')}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.lg,
  },
});
