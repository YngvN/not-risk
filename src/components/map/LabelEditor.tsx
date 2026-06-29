import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

// The RiskBoardMap SVG viewBox starts at x=91, y=60 and spans 914×614 units.
// (100 SVG units of ocean padding added on each side.)
const VB_X = 91;
const VB_Y = 60;
const VB_W = 914;

interface Transform {
  scale: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  containerHeight: SharedValue<number>;
  contentHeight: SharedValue<number>;
}

interface Props {
  /** Current label positions keyed by svgId. */
  positions: Record<string, { x: number; y: number }>;
  /** Pixel width of the SVG at natural (1×) zoom. */
  mapWidth: number;
  /** Live transform shared values from the ZoomableMap. */
  transform: Transform;
  onUpdate: (svgId: string, x: number, y: number) => void;
}

/**
 * Absolute overlay rendered OUTSIDE the ZoomableMap so handle gestures
 * never compete with the map's pan/pinch gestures.
 * The same transform as the ZoomableMap content is applied to keep handles
 * visually in sync with the SVG labels underneath.
 */
export function LabelEditor({ positions, mapWidth, transform, onUpdate }: Props) {
  const naturalScale = mapWidth / VB_W;

  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transform.tx.value },
      { translateY: transform.ty.value },
      { scale: transform.scale.value },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, outerStyle]} pointerEvents="box-none">
      {Object.entries(positions).map(([svgId, pos]) => (
        <Handle
          key={svgId}
          svgId={svgId}
          svgX={pos.x}
          svgY={pos.y}
          naturalScale={naturalScale}
          zoomScale={transform.scale}
          containerHeight={transform.containerHeight}
          contentHeight={transform.contentHeight}
          onDragEnd={onUpdate}
        />
      ))}
    </Animated.View>
  );
}

// ── Individual draggable handle ────────────────────────────────────────────────

interface HandleProps {
  svgId: string;
  svgX: number;
  svgY: number;
  /** mapWidth / 714 — converts SVG units to natural-zoom pixels. */
  naturalScale: number;
  /** Current ZoomableMap zoom — corrects drag delta sensitivity. */
  zoomScale: SharedValue<number>;
  /** ZoomableMap container height — used to compute vertical centering offset. */
  containerHeight: SharedValue<number>;
  /** SVG natural height within ZoomableMap — used to compute vertical centering offset. */
  contentHeight: SharedValue<number>;
  onDragEnd: (svgId: string, x: number, y: number) => void;
}

function Handle({ svgId, svgX, svgY, naturalScale, zoomScale, containerHeight, contentHeight, onDragEnd }: HandleProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const currentX = useSharedValue(svgX);
  const currentY = useSharedValue(svgY);

  React.useEffect(() => {
    currentX.value = svgX;
    currentY.value = svgY;
  }, [svgX, svgY]);

  const pan = Gesture.Pan()
    .onUpdate(e => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(e => {
      // Divide by both the natural pixel scale AND the current zoom so
      // 1 screen pixel always equals the same SVG unit regardless of zoom.
      const effectiveScale = naturalScale * zoomScale.value;
      const newX = currentX.value + e.translationX / effectiveScale;
      const newY = currentY.value + e.translationY / effectiveScale;
      tx.value = 0;
      ty.value = 0;
      runOnJS(onDragEnd)(svgId, newX, newY);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  // When the SVG is shorter than the ZoomableMap container, justifyContent:center
  // offsets the SVG down by (containerHeight - contentHeight) / 2 within the
  // Animated.View. Handles must include this offset so they align with the labels.
  const verticalOffset = Math.max(0, (containerHeight.value - contentHeight.value) / 2);

  // Natural-zoom screen position of the handle centre (within the absoluteFill overlay)
  const screenX = (svgX - VB_X) * naturalScale;
  const screenY = verticalOffset + (svgY - VB_Y) * naturalScale;

  return (
    <Animated.View
      style={[
        styles.handleWrap,
        { left: screenX - HANDLE_R, top: screenY - HANDLE_R },
        animStyle,
      ]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={styles.handle}>
          <Text style={styles.label} numberOfLines={1}>
            {svgId.replace(/_/g, ' ')}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const HANDLE_R = 14;

const styles = StyleSheet.create({
  overlay: {
    zIndex: 20,
  },
  handleWrap: {
    position: 'absolute',
    width: HANDLE_R * 2,
    height: HANDLE_R * 2,
  },
  handle: {
    width: HANDLE_R * 2,
    height: HANDLE_R * 2,
    borderRadius: HANDLE_R,
    backgroundColor: 'rgba(255, 80, 0, 0.75)',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  label: {
    position: 'absolute',
    top: HANDLE_R * 2 + 2,
    fontSize: 7,
    color: '#ff5000',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 3,
    borderRadius: 3,
    width: 60,
    textAlign: 'center',
  },
});
