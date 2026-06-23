import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface AnimatedCardProps extends ViewProps {
  children: React.ReactNode;
  /**
   * Delay before the entrance animation starts (ms).
   * Useful for staggering a list of cards.
   */
  delay?: number;
}

/**
 * Card with a Moti-powered fade-in + slide-up entrance animation.
 * Drop-in replacement for Card when you want motion.
 *
 * @example
 * <AnimatedCard delay={100}>
 *   <Text>Animated content</Text>
 * </AnimatedCard>
 */
export function AnimatedCard({ children, delay = 0, style, ...props }: AnimatedCardProps) {
  const { colors } = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350, delay }}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
      {...props}
    >
      {children}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
});
