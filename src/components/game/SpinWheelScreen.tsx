import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Text as SvgText, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import type { Player } from '../../engine/types';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Convert an angle (degrees clockwise from 12 o'clock) to SVG canvas coordinates. */
function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path for a pie slice from startDeg to endDeg (clockwise from top). */
function slicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const p1 = polarToCart(cx, cy, r, startDeg);
  const p2 = polarToCart(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

interface Props {
  players: Player[];
  /** The player who goes first (the one the wheel lands on). */
  firstPlayerId: string;
  onDone: () => void;
}

const SPIN_ROTATIONS = 6;
const SPIN_DURATION_MS = 4200;
const POINTER_SIZE = 20;

/**
 * Full-screen wheel-of-fortune overlay that reveals the starting player.
 * Players are placed in random visual positions on the wheel each time,
 * and the wheel lands on whoever was drawn as the first player.
 */
export function SpinWheelScreen({ players, firstPlayerId, onDone }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const { width, height } = useWindowDimensions();

  const WHEEL_SIZE = Math.min(width, height) * 0.72;
  const cx = WHEEL_SIZE / 2;
  const cy = WHEEL_SIZE / 2;
  const r = WHEEL_SIZE / 2 - 6;

  // Shuffle visual positions so the wheel looks different each game.
  const visualPlayers = useMemo(() => shuffle(players.filter(p => p.alive)), []);
  const winnerIndex = visualPlayers.findIndex(p => p.id === firstPlayerId);
  const winner = visualPlayers[winnerIndex] ?? visualPlayers[0];

  const N = visualPlayers.length;
  const segDeg = 360 / N;

  // After SPIN_ROTATIONS full turns, position winner's segment centre at the top pointer.
  // Derivation: clockwise rotation R puts the original angle (360 - R mod 360) at top.
  // Winner centre starts at (winnerIndex + 0.5) * segDeg.
  // Solve: 360 - R ≡ winnerCentre (mod 360)  →  R = 360*(n+1) - winnerCentre
  const winnerCentre = (winnerIndex + 0.5) * segDeg;
  const targetRotation = 360 * (SPIN_ROTATIONS + 1) - winnerCentre;

  const rotation = useSharedValue(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      rotation.value = withTiming(targetRotation, {
        duration: SPIN_DURATION_MS,
        easing: Easing.out(Easing.exp),
      }, () => runOnJS(setLanded)(true));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const winnerColor = PLAYER_COLOR_HEX[winner.color];

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <Text variant="h2" style={{ color: colors.text }}>{t('game.spinWheelTitle')}</Text>

      {/* Fixed pointer triangle at top of wheel */}
      <View style={styles.pointerWrap}>
        <View style={[styles.pointer, { borderTopColor: colors.text }]} />

        {/* Spinning wheel */}
        <Animated.View style={[{ width: WHEEL_SIZE, height: WHEEL_SIZE }, wheelStyle]}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            {visualPlayers.map((player, i) => {
              const startDeg = i * segDeg;
              const endDeg = (i + 1) * segDeg;
              const midDeg = (startDeg + endDeg) / 2;
              const labelPos = polarToCart(cx, cy, r * 0.62, midDeg);
              const color = PLAYER_COLOR_HEX[player.color];
              const label = player.name.length > 9 ? player.name.slice(0, 8) + '…' : player.name;
              // Rotate each label radially outward. Segments on the left half
              // (midDeg > 180°) get an extra 180° flip so they never read upside-down.
              const textRotation = midDeg > 180 ? midDeg + 90 : midDeg - 90;

              return (
                <React.Fragment key={player.id}>
                  <Path
                    d={slicePath(cx, cy, r, startDeg, endDeg)}
                    fill={color}
                    stroke={colors.background}
                    strokeWidth={2}
                  />
                  <SvgText
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="#fff"
                    fontSize={Math.max(10, Math.min(14, WHEEL_SIZE / (N * 2.8)))}
                    fontWeight="700"
                    transform={`rotate(${textRotation}, ${labelPos.x}, ${labelPos.y})`}
                  >
                    {label}
                  </SvgText>
                </React.Fragment>
              );
            })}
            {/* Hub cap */}
            <Circle cx={cx} cy={cy} r={20} fill={colors.card} stroke={colors.border} strokeWidth={2} />
          </Svg>
        </Animated.View>
      </View>

      {/* Reveal after landing */}
      <AnimatePresence>
        {landed && (
          <MotiView
            from={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 200 }}
            style={styles.reveal}
          >
            <View style={[styles.nameBadge, { backgroundColor: winnerColor }]}>
              <Text variant="h2" style={{ color: '#fff' }}>{winner.name}</Text>
            </View>
            <Text variant="body" style={{ color: colors.textSecondary }}>
              {t('game.spinWheelGoesFirst')}
            </Text>
            <Pressable
              onPress={onDone}
              style={[styles.continueBtn, { backgroundColor: colors.primary }]}
            >
              <Text variant="body" style={{ color: '#fff', fontWeight: '700' }}>
                {t('game.spinWheelLetsGo')}
              </Text>
            </Pressable>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    zIndex: 300,
    padding: 24,
  },
  pointerWrap: {
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: POINTER_SIZE / 2,
    borderRightWidth: POINTER_SIZE / 2,
    borderTopWidth: POINTER_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: 10,
    marginBottom: -POINTER_SIZE / 2,
  },
  reveal: {
    alignItems: 'center',
    gap: 10,
  },
  nameBadge: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
  },
  continueBtn: {
    marginTop: 6,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 32,
  },
});
