import React, { useCallback } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../ui/Text';
import { Spacing, BorderRadius } from '../../constants/spacing';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.5;
const SPRING = { damping: 20, stiffness: 220 };

/**
 * Wraps a map SVG in a pinch-to-zoom + pan container.
 * +/− buttons provide programmatic zoom. The tab bar and controls
 * rendered outside this component are unaffected by zoom.
 */
export function ZoomableMap({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const cw = useSharedValue(0); // container width
  const ch = useSharedValue(0); // container height

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    cw.value = e.nativeEvent.layout.width;
    ch.value = e.nativeEvent.layout.height;
  }, [cw, ch]);

  // ── Pinch gesture ──────────────────────────────────────────────────────────
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        tx.value = withSpring(0, SPRING);
        ty.value = withSpring(0, SPRING);
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  // ── Pan gesture (only moves content when zoomed) ───────────────────────────
  const pan = Gesture.Pan()
    .averageTouches(true)
    .minDistance(5)
    .onUpdate((e) => {
      const maxTx = (cw.value * (scale.value - 1)) / 2;
      const maxTy = (ch.value * (scale.value - 1)) / 2;
      tx.value = clamp(savedTx.value + e.translationX, -maxTx, maxTx);
      ty.value = clamp(savedTy.value + e.translationY, -maxTy, maxTy);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  // ── Programmatic zoom (called from JS thread) ──────────────────────────────
  const applyZoom = (next: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    scale.value = withSpring(clamped, SPRING);
    savedScale.value = clamped;

    if (clamped <= MIN_SCALE) {
      tx.value = withSpring(0, SPRING);
      ty.value = withSpring(0, SPRING);
      savedTx.value = 0;
      savedTy.value = 0;
    } else {
      const maxTx = (cw.value * (clamped - 1)) / 2;
      const maxTy = (ch.value * (clamped - 1)) / 2;
      const cx = Math.max(-maxTx, Math.min(maxTx, tx.value));
      const cy = Math.max(-maxTy, Math.min(maxTy, ty.value));
      tx.value = withSpring(cx, SPRING);
      ty.value = withSpring(cy, SPRING);
      savedTx.value = cx;
      savedTy.value = cy;
    }
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* +/− overlay buttons (bottom-right, outside gesture area) */}
      <View
        style={[
          styles.zoomButtons,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.zoomBtn,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => applyZoom(scale.value + ZOOM_STEP)}
          hitSlop={8}
        >
          <Text style={[styles.zoomBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.6 }]}
          onPress={() => applyZoom(scale.value - ZOOM_STEP)}
          hitSlop={8}
        >
          <Text style={[styles.zoomBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  zoomButtons: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '300',
  },
});
