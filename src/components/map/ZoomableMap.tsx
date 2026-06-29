import React, { useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  clamp,
} from 'react-native-reanimated';

import type { SharedValue } from 'react-native-reanimated';

/** Imperative handle for programmatic zoom control. */
export interface ZoomableMapRef {
  /**
   * Animate the map to center on a content point with the given scale.
   * @param px  X offset from the content's top-left, in container pixels.
   * @param py  Y offset from the content's top-left, in container pixels.
   * @param targetScale  Zoom level (1 = fit, MAX_SCALE = 5).
   */
  zoomToPoint(px: number, py: number, targetScale: number): void;
  resetZoom(): void;
  /**
   * Explicitly tells the map its content height so the clamp can allow
   * panning to content that overflows the container even at scale=1, and
   * immediately centers the content vertically if it overflows.
   */
  setContentHeight(h: number): void;
  /** Returns the live transform and size shared values for external overlays. */
  getTransform(): {
    scale: SharedValue<number>;
    tx: SharedValue<number>;
    ty: SharedValue<number>;
    containerHeight: SharedValue<number>;
    contentHeight: SharedValue<number>;
  };
}
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';
import { useTesting } from '../../context/TestingContext';
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
export const ZoomableMap = forwardRef<ZoomableMapRef, { children: React.ReactNode }>(
function ZoomableMap({ children }, ref) {
  const { colors } = useTheme();
  const { showTestBorders } = useTesting();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const cw = useSharedValue(0);
  const ch = useSharedValue(0);
  // Natural (unscaled) content dimensions — may differ from container when
  // the SVG's aspect ratio makes it taller than the visible area.
  const contentW = useSharedValue(0);
  const contentH = useSharedValue(0);

  const containerRef = useRef<View>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    cw.value = e.nativeEvent.layout.width;
    ch.value = e.nativeEvent.layout.height;
  }, [cw, ch]);

  const onContentLayout = useCallback((e: LayoutChangeEvent) => {
    contentW.value = e.nativeEvent.layout.width;
    contentH.value = e.nativeEvent.layout.height;
  }, [contentW, contentH]);

  // ── Clamp helpers ──────────────────────────────────────────────────────────
  // Uses actual content size so overflowing content (e.g. a tall SVG on a
  // wide screen) is always reachable by panning even at scale = 1.
  const clampTx = (v: number, s: number) => {
    const w = contentW.value > 0 ? contentW.value : cw.value;
    const max = Math.max(0, (w * s - cw.value) / 2);
    return Math.max(-max, Math.min(max, v));
  };
  const clampTy = (v: number, s: number) => {
    const h = contentH.value > 0 ? contentH.value : ch.value;
    const max = Math.max(0, (h * s - ch.value) / 2);
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
      const _w = contentW.value > 0 ? contentW.value : cw.value;
      const _h = contentH.value > 0 ? contentH.value : ch.value;
      const maxX = Math.max(0, (_w * scale.value - cw.value) / 2);
      const maxY = Math.max(0, (_h * scale.value - ch.value) / 2);
      tx.value = clamp(savedTx.value + e.translationX, -maxX, maxX);
      ty.value = clamp(savedTy.value + e.translationY, -maxY, maxY);
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
        // Two-finger trackpad scroll without pinch → pan
        // Allow pan even at MIN_SCALE when content overflows the container.
        const _w = contentW.value > 0 ? contentW.value : cw.value;
        const _h = contentH.value > 0 ? contentH.value : ch.value;
        const canPan = scale.value > MIN_SCALE || _w > cw.value || _h > ch.value;
        if (!canPan) return;
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

  useImperativeHandle(ref, () => ({
    zoomToPoint(px: number, py: number, targetScale: number) {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
      // Center on (px, py): tx = cw/2 - px, ty = ch/2 - py, then clamp
      const newTx = clampTx(cw.value / 2 - px, s);
      const newTy = clampTy(ch.value / 2 - py, s);
      scale.value = withSpring(s, SPRING);
      savedScale.value = s;
      tx.value = withSpring(newTx, SPRING);
      ty.value = withSpring(newTy, SPRING);
      savedTx.value = newTx;
      savedTy.value = newTy;
    },
    resetZoom() {
      scale.value = withSpring(MIN_SCALE, SPRING);
      savedScale.value = MIN_SCALE;
      tx.value = withSpring(0, SPRING);
      ty.value = withSpring(0, SPRING);
      savedTx.value = 0;
      savedTy.value = 0;
    },
    setContentHeight(h: number) {
      contentH.value = h;
      // With justifyContent:center in the content style, the SVG is already
      // visually centred at ty=0 — no translation needed.
      ty.value = 0;
      savedTy.value = 0;
    },
    getTransform() {
      return { scale, tx, ty, containerHeight: ch, contentHeight: contentH };
    },
  }));

  return (
    <View
      ref={containerRef}
      style={[styles.container, showTestBorders && { borderWidth: 3, borderColor: '#ff0000' }]}
      onLayout={onLayout}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.content, animatedStyle, showTestBorders && { borderWidth: 3, borderColor: '#0088ff' }]}>
          <View onLayout={onContentLayout}>
            {children}
          </View>
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    // Center content so the scale transform (anchored at the container centre)
    // is also anchored at the content centre. Without this, zooming pushes the
    // top of a short SVG off-screen on phones.
    justifyContent: 'center',
    alignItems: 'center',
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
