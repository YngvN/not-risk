import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';

const THUMB = 26;

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

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = thumbX.value;
    })
    .onUpdate(e => {
      'worklet';
      const range = max - min;
      if (trackWidth.value <= 0 || range <= 0) return;

      const raw = Math.max(0, Math.min(trackWidth.value, startX.value + e.translationX));
      thumbX.value = raw;

      const rawValue = min + (raw / trackWidth.value) * range;
      const snapped = Math.max(min, Math.min(max, Math.round((rawValue - min) / step) * step + min));
      runOnJS(onChange)(snapped);
    });

  const thumbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB / 2 }],
  }));
  const fillAnimStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  return (
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
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.thumb,
            thumbAnimStyle,
            { backgroundColor: colors.primary, borderColor: colors.background },
          ]}
        />
      </GestureDetector>
    </View>
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
    borderWidth: 3,
    top: 0,
  },
});
