import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

/**
 * Themed surface container with rounded corners and a subtle border.
 *
 * @example
 * <Card>
 *   <Text>Card content</Text>
 * </Card>
 */
export function Card({ children, style, ...props }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
});
