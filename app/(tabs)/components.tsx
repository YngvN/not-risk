import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import {
  Screen,
  Text,
  Button,
  Card,
  Input,
  AnimatedCard,
  PressableScale,
  Modal,
} from '../../src/components';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useTheme } from '../../src/hooks/useTheme';
import { Spacing } from '../../src/constants/spacing';

/**
 * Components tab — live gallery of every UI component in the design system.
 * Add a new section here whenever a new component is created.
 */
export default function ComponentsScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <Screen scrollable padded>
      <Text variant="h1" style={styles.pageTitle}>
        {t('components.title')}
      </Text>
      <Text secondary style={styles.pageDescription}>
        {t('components.description')}
      </Text>

      {/* ── Buttons ─────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.buttons')}
      </Text>
      <View style={styles.group}>
        <Button label="Primary" variant="primary" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Outline" variant="outline" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Loading…" loading onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
      </View>

      {/* ── Typography ──────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.typography')}
      </Text>
      <Card>
        <Text variant="h1">Heading 1</Text>
        <Text variant="h2">Heading 2</Text>
        <Text variant="h3">Heading 3</Text>
        <Text variant="body">Body text</Text>
        <Text variant="label">Label</Text>
        <Text variant="caption">Caption</Text>
        <Text secondary>Secondary / muted</Text>
      </Card>

      {/* ── Inputs ──────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.inputs')}
      </Text>
      <View style={styles.group}>
        <Input label="Default" placeholder="Enter text…" />
        <Input
          label="With error"
          placeholder="Enter text…"
          error="This field is required"
        />
      </View>

      {/* ── Cards ───────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.cards')}
      </Text>
      <Card>
        <Text variant="h3">Card title</Text>
        <Text secondary style={styles.gap}>
          Card description or body content goes here.
        </Text>
      </Card>

      {/* ── Modal ───────────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.modals')}
      </Text>
      <Card style={styles.gap}>
        <Text secondary style={styles.gap}>
          Animated bottom sheet. Backdrop fades, sheet springs up. Tap outside or
          press Close to dismiss with an animated exit.
        </Text>
        <Button
          label={t('modal.open')}
          onPress={() => setModalVisible(true)}
        />
      </Card>

      {/* ── NativeWind ──────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        NativeWind (Tailwind)
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        <View className="bg-blue-500 dark:bg-blue-400 rounded-lg px-3 py-2">
          <Text className="text-white font-semibold text-sm">primary</Text>
        </View>
        <View className="bg-green-500 dark:bg-green-400 rounded-lg px-3 py-2">
          <Text className="text-white font-semibold text-sm">success</Text>
        </View>
        <View className="bg-red-500 dark:bg-red-400 rounded-lg px-3 py-2">
          <Text className="text-white font-semibold text-sm">error</Text>
        </View>
        <View className="bg-yellow-500 dark:bg-yellow-400 rounded-lg px-3 py-2">
          <Text className="text-white font-semibold text-sm">warning</Text>
        </View>
      </View>
      <View className="mt-3 rounded-xl p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <Text className="font-semibold mb-1">NativeWind card</Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm">
          Styled with Tailwind classes. Switches with dark: prefix when theme toggles.
        </Text>
      </View>

      {/* ── Animations ──────────────────────────────── */}
      <Text variant="h3" style={styles.sectionTitle}>
        {t('components.animations')}
      </Text>

      <AnimatedCard delay={0} style={styles.gap}>
        <Text variant="label">AnimatedCard — fade + slide entrance</Text>
        <Text secondary style={styles.gap}>
          Entrance animation plays on mount. Use the delay prop to stagger lists.
        </Text>
      </AnimatedCard>

      <Text variant="label" secondary style={styles.label}>
        Staggered list
      </Text>
      <View style={styles.group}>
        {['First item', 'Second item', 'Third item'].map((item, i) => (
          <AnimatedCard key={item} delay={i * 100}>
            <Text>{item}</Text>
          </AnimatedCard>
        ))}
      </View>

      <Text variant="label" secondary style={styles.label}>
        PressableScale
      </Text>
      <PressableScale onPress={() => {}}>
        <Card>
          <Text>Tap or click me — I scale on press</Text>
        </Card>
      </PressableScale>

      <Text variant="label" secondary style={styles.label}>
        Infinite loop (pulse)
      </Text>
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: true }}
        style={[styles.pulse, { backgroundColor: colors.primary }]}
      />

      {/* Modal rendered outside scroll content to overlay full screen */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={t('modal.exampleTitle')}
      >
        <Text secondary style={styles.gap}>
          {t('modal.exampleContent')}
        </Text>
        <Button
          label={t('modal.close')}
          variant="outline"
          onPress={() => setModalVisible(false)}
          style={styles.gap}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    marginBottom: Spacing.xs,
  },
  pageDescription: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  label: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  group: {
    gap: Spacing.sm,
  },
  gap: {
    marginTop: Spacing.xs,
  },
  pulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: Spacing.sm,
  },
});
