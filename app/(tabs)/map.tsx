import React, { useState } from 'react';
import { View, Switch, Pressable, StyleSheet } from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { WorldMap, AfricaWorldMap, RiskBoardMap, ZoomableMap } from '../../src/components/map';
import { Territory, TERRITORIES } from '../../src/constants/riskWorldTerritories';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { Spacing, BorderRadius } from '../../src/constants/spacing';

type MapView = 'pacific' | 'africa' | 'board';

/**
 * Map screen — two projections (Pacific / Africa) each with a Risk territory toggle.
 * In base mode, tapping a country highlights it and shows its name.
 */
export default function MapScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [view, setView] = useState<MapView>('pacific');
  const [pacificRisk, setPacificRisk] = useState(true);
  const [africaRisk, setAfricaRisk] = useState(true);
  const [boardRisk, setBoardRisk] = useState(true);

  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const showRisk = view === 'pacific' ? pacificRisk : view === 'africa' ? africaRisk : boardRisk;
  const setRisk = view === 'pacific' ? setPacificRisk : view === 'africa' ? setAfricaRisk : setBoardRisk;

  const switchView = (v: MapView) => {
    setView(v);
    setSelectedTerritory(null);
    setSelectedCountry(null);
  };

  const adjacentLabels = selectedTerritory?.adjacentTo
    .map(id => TERRITORIES.find(terr => terr.id === id))
    .filter((terr): terr is Territory => terr !== undefined)
    .map(terr => t(terr.labelKey))
    .join(', ');

  return (
    <Screen padded={false} scrollable={false}>
      {/* View selector */}
      <View style={[styles.selector, { borderColor: colors.border }]}>
        <Pressable
          style={[styles.selectorTab, view === 'pacific' && { backgroundColor: colors.primary }]}
          onPress={() => switchView('pacific')}
        >
          <Text variant="caption" style={{ color: view === 'pacific' ? '#fff' : colors.textSecondary }}>
            Pacific
          </Text>
        </Pressable>
        <Pressable
          style={[styles.selectorTab, view === 'africa' && { backgroundColor: colors.primary }]}
          onPress={() => switchView('africa')}
        >
          <Text variant="caption" style={{ color: view === 'africa' ? '#fff' : colors.textSecondary }}>
            Africa
          </Text>
        </Pressable>
        <Pressable
          style={[styles.selectorTab, view === 'board' && { backgroundColor: colors.primary }]}
          onPress={() => switchView('board')}
        >
          <Text variant="caption" style={{ color: view === 'board' ? '#fff' : colors.textSecondary }}>
            {t('map.board')}
          </Text>
        </Pressable>
      </View>

      {/* Map — wrapped in zoom/pan container */}
      <ZoomableMap>
        {view === 'pacific' ? (
          <WorldMap
            showRiskLayer={pacificRisk}
            onTerritorySelect={t => { setSelectedTerritory(t); setSelectedCountry(null); }}
            onCountrySelect={n => { setSelectedCountry(n); setSelectedTerritory(null); }}
          />
        ) : view === 'africa' ? (
          <AfricaWorldMap
            showRiskLayer={africaRisk}
            onTerritorySelect={t => { setSelectedTerritory(t); setSelectedCountry(null); }}
            onCountrySelect={n => { setSelectedCountry(n); setSelectedTerritory(null); }}
          />
        ) : (
          <RiskBoardMap
            showRiskLayer={boardRisk}
            onTerritorySelect={t => { setSelectedTerritory(t); setSelectedCountry(null); }}
          />
        )}
      </ZoomableMap>

      {/* Risk layer toggle */}
      <View style={[styles.toggleRow, { borderColor: colors.border }]}>
        <Text variant="body" style={{ color: colors.text }}>Risk territories</Text>
        <Switch
          value={showRisk}
          onValueChange={v => {
            setRisk(v);
            setSelectedTerritory(null);
            setSelectedCountry(null);
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={showRisk ? colors.primary : colors.surface}
        />
      </View>

      {/* Info panel */}
      <AnimatePresence>
        {(selectedTerritory || selectedCountry) && (
          <MotiView
            key={selectedTerritory?.id ?? selectedCountry ?? ''}
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 8 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[
              styles.infoPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {selectedTerritory ? (
              <>
                <Text variant="h3">{t(selectedTerritory.labelKey)}</Text>
                {adjacentLabels ? (
                  <Text variant="caption" style={{ color: colors.textSecondary }}>
                    {t('world.adjacentLabel')}: {adjacentLabels}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="h3" style={{ color: colors.text }}>{selectedCountry}</Text>
            )}
          </MotiView>
        )}
      </AnimatePresence>
    </Screen>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  selectorTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  infoPanel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
});
