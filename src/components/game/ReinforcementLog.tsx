import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { TerritoryId } from '../../engine/types';
import { TERRITORIES } from '../../constants/riskWorldTerritories';

export interface ReinforcementEntry {
  territoryId: TerritoryId;
  armies: number;
}

interface ReinforcementLogProps {
  entries: ReinforcementEntry[];
  onRemove: (territoryId: TerritoryId) => void;
  /** When provided, renders a close button — used in the small-screen slide panel. */
  onClose?: () => void;
}

/**
 * Displays armies placed so far during the current reinforcement phase.
 * Each entry has an × to remove that territory's placements.
 * Rendered as a sidebar on wide screens and as a slide panel on small ones.
 */
export function ReinforcementLog({ entries, onRemove, onClose }: ReinforcementLogProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: colors.border }]}>
        <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('game.reinforcementLog')}
        </Text>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={8}>
            <Text variant="body" style={{ color: colors.textSecondary }}>✕</Text>
          </Pressable>
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {t('game.reinforcementLogEmpty')}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          <AnimatePresence>
            {entries.map(entry => {
              const terr = TERRITORIES.find(t => t.id === entry.territoryId);
              const name = terr ? t(terr.labelKey) : entry.territoryId;
              return (
                <MotiView
                  key={entry.territoryId}
                  from={{ opacity: 0, translateX: 12 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  exit={{ opacity: 0, translateX: 12 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 240 }}
                  style={[styles.entry, { borderColor: colors.border }]}
                >
                  <View style={styles.entryLeft}>
                    <Text variant="caption" style={{ color: colors.text, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>
                      {name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                        +{entry.armies}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => onRemove(entry.territoryId)}
                    hitSlop={8}
                    style={[styles.removeBtn, { backgroundColor: colors.surface }]}
                  >
                    <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>×</Text>
                  </Pressable>
                </MotiView>
              );
            })}
          </AnimatePresence>
        </ScrollView>
      )}
    </View>
  );
}

// ── Slide panel wrapper for small screens ────────────────────────────────────

interface SlidePanelProps extends ReinforcementLogProps {
  visible: boolean;
}

/**
 * Slide-from-right overlay panel wrapping ReinforcementLog for small screens.
 */
export function ReinforcementSlidePanel({ visible, ...logProps }: SlidePanelProps) {
  const { colors } = useTheme();
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Scrim */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={[styles.scrim]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={logProps.onClose} />
          </MotiView>

          {/* Panel */}
          <MotiView
            from={{ translateX: PANEL_WIDTH }}
            animate={{ translateX: 0 }}
            exit={{ translateX: PANEL_WIDTH }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            style={[styles.slidePanel, { borderColor: colors.border }]}
          >
            <ReinforcementLog {...logProps} />
          </MotiView>
        </>
      )}
    </AnimatePresence>
  );
}

const PANEL_WIDTH = 220;

const styles = StyleSheet.create({
  container: {
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
  empty: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  list: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
    gap: Spacing.xs,
  },
  entryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
