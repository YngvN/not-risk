import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing } from '../../constants/spacing';
import type { GameEvent, Player, TerritoryId } from '../../engine/types';
import { ReinforcementLog, type ReinforcementEntry } from './ReinforcementLog';
import { EventLog } from './EventLog';

export const PANEL_WIDTH = 220;

export interface GameSidePanelProps {
  reinforcementEntries: ReinforcementEntry[];
  onRemoveReinforcement: (territoryId: TerritoryId) => void;
  events: GameEvent[];
  players: Player[];
  selectedEventId: string | null;
  onEventSelect: (eventId: string | null, territoryIds: TerritoryId[]) => void;
  onClose?: () => void;
}

/**
 * Unified side panel shown during play.
 * Top section: current-turn reinforcement placements (with individual × removal).
 * Bottom section: full game event history (clickable to highlight territories).
 */
export function GameSidePanel({
  reinforcementEntries,
  onRemoveReinforcement,
  events,
  players,
  selectedEventId,
  onEventSelect,
  onClose,
}: GameSidePanelProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('game.gameLogLabel')}
        </Text>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={10}>
            <Text variant="body" style={{ color: colors.textSecondary }}>✕</Text>
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Reinforcement placements — only shown when armies have been placed */}
        {reinforcementEntries.length > 0 && (
          <>
            <View style={[styles.sectionLabel, { borderColor: colors.border }]}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                {t('game.reinforcementLog')}
              </Text>
            </View>
            <ReinforcementLog entries={reinforcementEntries} onRemove={onRemoveReinforcement} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {/* Event history */}
        <View style={[styles.sectionLabel, { borderColor: colors.border }]}>
          <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
            {t('game.eventLogLabel')}
          </Text>
        </View>
        <EventLog
          events={events}
          players={players}
          selectedEventId={selectedEventId}
          onSelect={onEventSelect}
        />
      </ScrollView>
    </View>
  );
}

// ── Slide panel wrapper for small screens ────────────────────────────────────

interface GameSlidePanelProps extends GameSidePanelProps {
  visible: boolean;
}

/**
 * Wraps GameSidePanel in a spring-animated right-to-left overlay for narrow screens.
 */
export function GameSlidePanel({ visible, ...panelProps }: GameSlidePanelProps) {
  const { colors } = useTheme();
  return (
    <AnimatePresence>
      {visible && (
        <>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.scrim}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={panelProps.onClose} />
          </MotiView>

          <MotiView
            from={{ translateX: PANEL_WIDTH }}
            animate={{ translateX: 0 }}
            exit={{ translateX: PANEL_WIDTH }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            style={[styles.slidePanel, { borderColor: colors.border }]}
          >
            <GameSidePanel {...panelProps} />
          </MotiView>
        </>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderLeftWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  scroll: {
    paddingBottom: Spacing.lg,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 150,
  },
  slidePanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: PANEL_WIDTH,
    zIndex: 151,
    borderLeftWidth: 1,
  },
});
