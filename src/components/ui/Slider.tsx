import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';

const THUMB = 13;

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Snap interval — defaults to 1. */
  step?: number;
}

/**
 * Horizontal slider built with Reanimated + GestureHandler.
 * Runs entirely on the UI thread; calls onChange on the JS thread via runOnJS.
 *
 * @example
 * <Slider value={armies} min={1} max={10} onChange={setArmies} />
 */
export function Slider({ value, min, max, onChange, step = 1 }: SliderProps) {
  const { colors } = useTheme();

  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const startX = useSharedValue(0);

  // Recompute thumb position when value or bounds change (JS thread).
  React.useEffect(() => {
    if (trackWidth.value > 0 && max > min) {
      thumbX.value = ((value - min) / (max - min)) * trackWidth.value;
    }
  }, [value, min, max]);

  const snapTo = (x: number): number => {
    'worklet';
    const range = max - min;
    if (trackWidth.value <= 0 || range <= 0) return min;
    const clamped = Math.max(0, Math.min(trackWidth.value, x));
    const rawValue = min + (clamped / trackWidth.value) * range;
    return Math.max(min, Math.min(max, Math.round((rawValue - min) / step) * step + min));
  };

  const pan = Gesture.Pan()
    .onBegin(e => {
      'worklet';
      // Jump to wherever the user touched on the track, then track from there
      const snapped = snapTo(e.x);
      thumbX.value = ((snapped - min) / (max - min)) * trackWidth.value;
      startX.value = thumbX.value;
      runOnJS(onChange)(snapped);
    })
    .onUpdate(e => {
      'worklet';
      if (max <= min) return;
      const snapped = snapTo(startX.value + e.translationX);
      thumbX.value = ((snapped - min) / (max - min)) * trackWidth.value;
      runOnJS(onChange)(snapped);
    });

  const thumbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB / 2 }],
  }));
  const fillAnimStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.container}
        onLayout={e => {
          const w = e.nativeEvent.layout.width;
          trackWidth.value = w;
          if (max > min) thumbX.value = ((value - min) / (max - min)) * w;
        }}
      >
        {/* Track */}
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.fill, fillAnimStyle, { backgroundColor: colors.primary }]} />
        </View>

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            thumbAnimStyle,
            { backgroundColor: colors.primary, borderColor: colors.background },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
    top: 0,
  },
});
