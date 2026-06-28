import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useGame, PLAYER_COLOR_HEX } from '../../context/GameContext';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { TERRITORIES } from '../../constants/riskWorldTerritories';
import { CONTINENT_BONUSES } from '../../engine/board';
import type { TerritoryId, ContinentId } from '../../constants/riskWorldTerritories';
import type { TranslationKey } from '../../locales';

const CONTINENT_ORDER: ContinentId[] = ['na', 'sa', 'eu', 'af', 'as', 'au'];

const CONTINENT_LABEL_KEY: Record<ContinentId, TranslationKey> = {
  na: 'game.continentNA',
  sa: 'game.continentSA',
  eu: 'game.continentEU',
  af: 'game.continentAF',
  as: 'game.continentAS',
  au: 'game.continentAU',
};

/**
 * Compact collapsible legend shown on the lower-left of the map.
 * Groups all 42 territories by continent, shows each continent's army bonus,
 * and colours territory names by the controlling player.
 *
 * Subscribes directly to GameContext so it stays live while expanded,
 * regardless of how the parent component renders.
 */
export function ContinentLegend() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { state } = useGame();
  const [expanded, setExpanded] = useState(false);

  if (!state) return null;

  const { territories, players } = state;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Toggle pill */}
      <Pressable
        onPress={() => setExpanded(v => !v)}
        style={[styles.toggle, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 10 }}>
          {expanded ? '▾ Legend' : '▸ Legend'}
        </Text>
      </Pressable>

      <AnimatePresence>
        {expanded && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 8 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {CONTINENT_ORDER.map(continentId => {
                const bonus = CONTINENT_BONUSES[continentId];
                const continentTerritories = TERRITORIES.filter(terr => terr.continent === continentId);

                return (
                  <View key={continentId} style={styles.group}>
                    {/* Continent header */}
                    <View style={[styles.continentHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.continentName, { color: colors.text }]}>
                        {t(CONTINENT_LABEL_KEY[continentId])}
                      </Text>
                      <Text style={[styles.bonusBadge, { color: colors.primary }]}>
                        +{bonus}
                      </Text>
                    </View>

                    {/* Territory rows */}
                    {continentTerritories.map(terr => {
                      const ts = territories[terr.id];
                      const owner = ts?.owner ? players.find(p => p.id === ts.owner) : null;
                      const nameColor = owner ? PLAYER_COLOR_HEX[owner.color] : colors.textSecondary;

                      return (
                        <View key={terr.id} style={styles.row}>
                          {owner
                            ? <View style={[styles.dot, { backgroundColor: PLAYER_COLOR_HEX[owner.color] }]} />
                            : <View style={styles.dotEmpty} />
                          }
                          <Text style={[styles.terrName, { color: nameColor }]} numberOfLines={1}>
                            {t(terr.labelKey)}
                          </Text>
                          {ts?.armies != null && ts.armies > 0 && (
                            <Text style={[styles.armyCount, { color: nameColor }]}>
                              {ts.armies}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    alignItems: 'flex-start',
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
    width: 170,
    maxHeight: 340,
    overflow: 'hidden',
  },
  scroll: {
    padding: Spacing.xs,
  },
  group: {
    marginBottom: Spacing.xs,
  },
  continentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  continentName: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
  bonusBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    flexShrink: 0,
  },
  dotEmpty: {
    width: 5,
    height: 5,
    flexShrink: 0,
  },
  terrName: {
    fontSize: 10,
    flex: 1,
  },
  armyCount: {
    fontSize: 9,
    fontWeight: '700',
    minWidth: 12,
    textAlign: 'right',
  },
});
