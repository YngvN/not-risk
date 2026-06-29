import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../constants/spacing';

interface ScreenProps {
  children: React.ReactNode;
  /** Wraps content in a ScrollView when true. */
  scrollable?: boolean;
  /** Applies horizontal and vertical padding. Defaults to true. */
  padded?: boolean;
  /**
   * Play a fade + slide-up entrance animation every time this screen
   * gains focus (tab switch or stack push). Defaults to true.
   */
  animated?: boolean;
}

/**
 * Root wrapper for all screens.
 * Handles safe area insets, status bar style, background color, and a
 * focus-driven entrance animation via react-native-reanimated.
 *
 * @example
 * export default function MyScreen() {
 *   return (
 *     <Screen scrollable padded>
 *       <Text variant="h1">Hello</Text>
 *     </Screen>
 *   );
 * }
 */
export function Screen({ children, scrollable = false, padded = true, animated = true }: ScreenProps) {
  const { colors, isDark } = useTheme();

  const opacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 6 : 0);

  // Re-animate every time this screen gains focus so tab switches feel alive.
  // useFocusEffect is a no-op for screens not inside a navigator.
  useFocusEffect(
    useCallback(() => {
      if (!animated) return;
      opacity.value = 0;
      translateY.value = 6;
      opacity.value = withTiming(1, { duration: 220 });
      translateY.value = withTiming(0, { duration: 220 });
    }, [animated, opacity, translateY]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Animated.View style={animatedStyle}>
        {scrollable ? (
          // contentContainerStyle must NOT have flex:1 — prevents scrolling on web
          <ScrollView
            style={styles.flex}
            contentContainerStyle={padded ? styles.padded : undefined}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            pinchGestureEnabled={false}
            maximumZoomScale={1}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padded && styles.padded]}>{children}</View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  padded: {
    padding: Spacing.md,
  },
});
