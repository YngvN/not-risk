import React, { useCallback, useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
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
 * Wraps a map SVG in a pinch-zoom + pan container.
 *
 * Input methods handled:
 *   - Native: pinch-to-zoom + pan (react-native-gesture-handler)
 *   - Web touchpad pinch: ctrl+wheel event (prevents browser page zoom)
 *   - Web trackpad two-finger scroll: wheel event without ctrlKey → pan
 *   - Scroll wheel: ctrl+scroll → zoom
 *   - +/− buttons: programmatic zoom with spring animation
 *
 * The tab bar and controls rendered outside this component are unaffected.
 */
export function ZoomableMap({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const cw = useSharedValue(0);
  const ch = useSharedValue(0);

  const containerRef = useRef<View>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    cw.value = e.nativeEvent.layout.width;
    ch.value = e.nativeEvent.layout.height;
  }, [cw, ch]);

  // ── Clamp helpers ──────────────────────────────────────────────────────────
  const clampTx = (v: number, s: number) => {
    const max = (cw.value * (s - 1)) / 2;
    return Math.max(-max, Math.min(max, v));
  };
  const clampTy = (v: number, s: number) => {
    const max = (ch.value * (s - 1)) / 2;
    return Math.max(-max, Math.min(max, v));
  };

  // ── Native pinch gesture ───────────────────────────────────────────────────
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

  // ── Native pan gesture ─────────────────────────────────────────────────────
  const pan = Gesture.Pan()
    .averageTouches(true)
    .minDistance(5)
    .onUpdate((e) => {
      tx.value = clamp(savedTx.value + e.translationX, -(cw.value * (scale.value - 1)) / 2, (cw.value * (scale.value - 1)) / 2);
      ty.value = clamp(savedTy.value + e.translationY, -(ch.value * (scale.value - 1)) / 2, (ch.value * (scale.value - 1)) / 2);
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

  // ── Web: intercept wheel events ────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const el = containerRef.current as unknown as HTMLElement | null;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // always prevent — we handle both zoom and pan ourselves

      if (e.ctrlKey) {
        // Touchpad pinch or Ctrl+scroll → zoom around the focal point (cursor position)
        const oldScale = scale.value;
        // Use exponential scaling for natural feel: 300px scroll ≈ 2× zoom
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * Math.pow(2, -e.deltaY / 300)));

        if (newScale === oldScale) return;

        // Keep the point under the cursor fixed in content space
        const rect = el.getBoundingClientRect();
        const focalX = e.clientX - rect.left - rect.width / 2;
        const focalY = e.clientY - rect.top - rect.height / 2;
        const ratio = newScale / oldScale;

        const newTx = clampTx(focalX - (focalX - tx.value) * ratio, newScale);
        const newTy = clampTy(focalY - (focalY - ty.value) * ratio, newScale);

        scale.value = newScale;
        savedScale.value = newScale;
        tx.value = newTx;
        ty.value = newTy;
        savedTx.value = newTx;
        savedTy.value = newTy;

        if (newScale <= MIN_SCALE) {
          tx.value = 0;
          ty.value = 0;
          savedTx.value = 0;
          savedTy.value = 0;
        }
      } else {
        // Two-finger trackpad scroll without pinch → pan (only when zoomed)
        if (scale.value <= MIN_SCALE) return;
        const newTx = clampTx(tx.value - e.deltaX, scale.value);
        const newTy = clampTy(ty.value - e.deltaY, scale.value);
        tx.value = newTx;
        ty.value = newTy;
        savedTx.value = newTx;
        savedTy.value = newTy;
      }
    };

    // { passive: false } is required to call preventDefault() on wheel events
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []); // shared values have stable references — safe to omit from deps

  // ── Programmatic zoom (buttons) ────────────────────────────────────────────
  const applyZoom = (next: number) => {
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    scale.value = withSpring(s, SPRING);
    savedScale.value = s;

    if (s <= MIN_SCALE) {
      tx.value = withSpring(0, SPRING);
      ty.value = withSpring(0, SPRING);
      savedTx.value = 0;
      savedTy.value = 0;
    } else {
      const cx = clampTx(tx.value, s);
      const cy = clampTy(ty.value, s);
      tx.value = withSpring(cx, SPRING);
      ty.value = withSpring(cy, SPRING);
      savedTx.value = cx;
      savedTy.value = cy;
    }
  };

  return (
    <View ref={containerRef} style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* +/− buttons — outside GestureDetector, not affected by map gestures */}
      <View
        style={[styles.zoomButtons, { backgroundColor: colors.card, borderColor: colors.border }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.zoomBtn,
            { borderBottomWidth: 1, borderBottomColor: colors.border },
            pressed && { opacity: 0.55 },
          ]}
          onPress={() => applyZoom(scale.value + ZOOM_STEP)}
          hitSlop={8}
        >
          <Text style={[styles.zoomBtnText, { color: colors.text }]}>+</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.zoomBtn, pressed && { opacity: 0.55 }]}
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
