import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useTheme';

const THUMB = 22;

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Snap interval — defaults to 1. */
  step?: number;
  /** Hide the min/max buttons on either side (e.g. for dice selection). */
  hideSideButtons?: boolean;
}

/**
 * Horizontal slider built with Reanimated + GestureHandler.
 * The track occupies the centre 50 % of the row; optional ‹min› and ›max›
 * buttons flank it to jump the thumb to either extreme.
 *
 * @example
 * <Slider value={armies} min={1} max={10} onChange={setArmies} />
 * <Slider value={dice} min={1} max={3} onChange={setDice} hideSideButtons />
 */
export function Slider({ value, min, max, onChange, step = 1, hideSideButtons = false }: SliderProps) {
  const { colors } = useTheme();

  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const startX = useSharedValue(0);

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

  const sideBtn = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={[styles.sideBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {!hideSideButtons && sideBtn(String(min), () => onChange(min))}

      {/* Track occupies 50 % of the row */}
      <GestureDetector gesture={pan}>
        <View
          style={styles.trackArea}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            trackWidth.value = w;
            if (max > min) thumbX.value = ((value - min) / (max - min)) * w;
          }}
        >
          <View style={[styles.track, { backgroundColor: colors.border }]}>
            <Animated.View style={[styles.fill, fillAnimStyle, { backgroundColor: colors.primary }]} />
          </View>
          <Animated.View
            style={[
              styles.thumb,
              thumbAnimStyle,
              { backgroundColor: colors.primary, borderColor: colors.background },
            ]}
          />
        </View>
      </GestureDetector>

      {!hideSideButtons && sideBtn(String(max), () => onChange(max))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackArea: {
    flex: 0.5,        // 50 % of the available row space
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
