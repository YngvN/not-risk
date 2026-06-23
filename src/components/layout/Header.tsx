import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../ui/Text';
import { Spacing } from '../../constants/spacing';

interface HeaderProps {
  title: string;
  /** Optional element anchored to the right side (e.g. an icon button). */
  right?: React.ReactNode;
  /** Optional element anchored to the left side (e.g. a back button). */
  left?: React.ReactNode;
}

/**
 * In-screen page header with an optional left and right slot.
 *
 * @example
 * <Header title="Settings" right={<Button label="Done" variant="ghost" />} />
 */
export function Header({ title, right, left }: HeaderProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <View style={styles.slot}>{left ?? null}</View>
      <Text variant="h3" style={styles.title}>{title}</Text>
      <View style={styles.slot}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  slot: {
    minWidth: 48,
    alignItems: 'center',
  },
});
