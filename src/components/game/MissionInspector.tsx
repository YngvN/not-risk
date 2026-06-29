import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useGame, PLAYER_COLOR_HEX } from '../../context/GameContext';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { missionProgress, missionDescription } from '../../engine/missions';

/**
 * Testing-mode overlay: a pill button that expands into a panel showing
 * every player's secret mission and their percentage progress toward winning.
 * Styled and positioned identically to ContinentLegend but on the right side.
 * Only rendered when the testing toggle is enabled in Settings.
 */
export function MissionInspector() {
  const { colors } = useTheme();
  const { state } = useGame();
  const [expanded, setExpanded] = useState(false);

  if (!state || state.mode !== 'mission') return null;

  const { players } = state;
  const activePlayers = players.filter(p => p.alive && p.mission);

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <AnimatePresence>
        {expanded && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 8 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {activePlayers.map(player => {
              const pct = player.mission
                ? Math.round(missionProgress(player.id, player.mission, state) * 100)
                : 0;
              const playerColor = PLAYER_COLOR_HEX[player.color];
              const isComplete = pct >= 100;

              return (
                <View key={player.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                  {/* Color swatch + name */}
                  <View style={styles.header}>
                    <View style={[styles.dot, { backgroundColor: playerColor }]} />
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={[styles.pct, { color: isComplete ? colors.success : colors.primary }]}>
                      {pct}%
                    </Text>
                  </View>

                  {/* Mission description */}
                  {player.mission && (
                    <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {missionDescription(player.mission)}
                    </Text>
                  )}

                  {/* Progress bar */}
                  <View style={[styles.track, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${pct}%` as `${number}%`,
                          backgroundColor: isComplete ? colors.success : playerColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </MotiView>
        )}
      </AnimatePresence>

      {/* Toggle pill */}
      <Pressable
        onPress={() => setExpanded(v => !v)}
        style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 10 }}>
          {expanded ? '▾ Missions' : '▸ Missions'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'flex-end',
    zIndex: 10,
    padding: Spacing.xs,
    gap: 4,
  },
  toggle: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  panel: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: 190,
    overflow: 'hidden',
  },
  row: {
    padding: Spacing.xs,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  name: {
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  pct: {
    fontSize: 10,
    fontWeight: '700',
  },
  desc: {
    fontSize: 9,
    lineHeight: 12,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
