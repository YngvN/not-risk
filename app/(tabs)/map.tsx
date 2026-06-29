import React, { useState } from 'react';
import { View, Switch, Pressable, StyleSheet } from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import { Screen } from '../../src/components/layout/Screen';
import { Text } from '../../src/components/ui/Text';
import { WorldMap, AfricaWorldMap, RiskBoardMap, ZoomableMap, type ZoomableMapRef } from '../../src/components/map';
import { LabelEditor } from '../../src/components/map/LabelEditor';
import { Territory, TERRITORIES } from '../../src/constants/riskWorldTerritories';
import { useTheme } from '../../src/hooks/useTheme';
import { useLanguage } from '../../src/hooks/useLanguage';
import { useTesting } from '../../src/context/TestingContext';
import { useLabelPositions } from '../../src/hooks/useLabelPositions';
import { Spacing, BorderRadius } from '../../src/constants/spacing';

type MapView = 'pacific' | 'africa' | 'board';
type EditMode = 'none' | 'placement' | 'connections';

export default function MapScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { allowMapEditing } = useTesting();
  const labelPositions = useLabelPositions();

  const [view, setView]           = useState<MapView>('pacific');
  const [pacificRisk, setPacificRisk] = useState(true);
  const [africaRisk, setAfricaRisk]   = useState(true);
  const [boardRisk, setBoardRisk]     = useState(true);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [selectedCountry, setSelectedCountry]     = useState<string | null>(null);
  const [editMode, setEditMode]     = useState<EditMode>('none');
  const [mapWidth, setMapWidth]     = useState(0);
  const editMapRef  = React.useRef<ZoomableMapRef>(null);
  const editInitialized = React.useRef(false);
  // Shared values exposed by ZoomableMap so the LabelEditor overlay can
  // mirror the same transform without living inside the gesture handler.
  const [editTransform, setEditTransform] = useState<{
    scale: import('react-native-reanimated').SharedValue<number>;
    tx: import('react-native-reanimated').SharedValue<number>;
    ty: import('react-native-reanimated').SharedValue<number>;
    containerHeight: import('react-native-reanimated').SharedValue<number>;
    contentHeight: import('react-native-reanimated').SharedValue<number>;
  } | null>(null);

  const showRisk = view === 'pacific' ? pacificRisk : view === 'africa' ? africaRisk : boardRisk;
  const setRisk  = view === 'pacific' ? setPacificRisk : view === 'africa' ? setAfricaRisk : setBoardRisk;

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

  const startEditPlacement = () => {
    if (view !== 'board') switchView('board');
    editInitialized.current = false;
    setEditMode('placement');
  };

  // Once mapWidth is known, tell ZoomableMap the real content height so it
  // can clamp correctly and center the SVG vertically.
  React.useEffect(() => {
    if (editMode !== 'placement' || mapWidth === 0 || editInitialized.current) return;
    editInitialized.current = true;
    const svgH = mapWidth * (614 / 914);
    editMapRef.current?.setContentHeight(svgH);
    setEditTransform(editMapRef.current?.getTransform() ?? null);
  }, [editMode, mapWidth]);

  React.useEffect(() => {
    if (editMode !== 'placement') {
      setEditTransform(null);
      editInitialized.current = false;
    }
  }, [editMode]);

  const cancelEdit = () => setEditMode('none');

  const saveEdit = async () => {
    await labelPositions.save();
    setEditMode('none');
  };

  const resetEdit = async () => {
    await labelPositions.restore();
  };

  const isEditing = editMode !== 'none';

  return (
    <Screen padded={false} scrollable={false}>

      {/* Editing toolbar — replaces selector in edit mode */}
      {isEditing ? (
        <View style={[styles.editBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text variant="caption" style={{ color: colors.primary, fontWeight: '700', flex: 1 }}>
            {editMode === 'placement' ? t('settings.editLabelPlacement') : t('settings.editConnections')}
          </Text>
          {editMode === 'placement' && (
            <Pressable onPress={resetEdit} style={[styles.editBtn, { borderColor: colors.border }]}>
              <Text variant="caption" style={{ color: colors.textSecondary }}>{t('settings.resetPositions')}</Text>
            </Pressable>
          )}
          <Pressable onPress={cancelEdit} style={[styles.editBtn, { borderColor: colors.border }]}>
            <Text variant="caption" style={{ color: colors.textSecondary }}>{t('settings.cancelEditing')}</Text>
          </Pressable>
          <Pressable onPress={saveEdit} style={[styles.editBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
            <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>{t('settings.savePositions')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.selector, { borderColor: colors.border }]}>
          {(['pacific', 'africa', 'board'] as MapView[]).map((v, i) => {
            const label = v === 'pacific' ? 'Pacific' : v === 'africa' ? 'Africa' : t('map.board');
            return (
              <Pressable
                key={v}
                style={[styles.selectorTab, view === v && { backgroundColor: colors.primary }]}
                onPress={() => switchView(v)}
              >
                <Text variant="caption" style={{ color: view === v ? '#fff' : colors.textSecondary }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Map */}
      <View style={{ flex: 1 }}>
        {isEditing && editMode === 'placement' ? (
          // LabelEditor lives OUTSIDE ZoomableMap to avoid gesture conflicts.
          // It mirrors the same transform via shared values from editMapRef.
          <>
            <ZoomableMap ref={editMapRef}>
              <View onLayout={e => setMapWidth(e.nativeEvent.layout.width)}>
                <RiskBoardMap
                  showRiskLayer={boardRisk}
                  labelOverrides={labelPositions.positions}
                />
              </View>
            </ZoomableMap>
            {editTransform && mapWidth > 0 && (
              <LabelEditor
                positions={labelPositions.positions}
                mapWidth={mapWidth}
                transform={editTransform}
                onUpdate={labelPositions.update}
              />
            )}
          </>
        ) : (
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
                labelOverrides={labelPositions.positions}
                onTerritorySelect={t => { setSelectedTerritory(t); setSelectedCountry(null); }}
              />
            )}
          </ZoomableMap>
        )}
      </View>

      {/* Risk layer toggle */}
      {!isEditing && (
        <View style={[styles.toggleRow, { borderColor: colors.border }]}>
          <Text variant="body" style={{ color: colors.text }}>Risk territories</Text>
          <Switch
            value={showRisk}
            onValueChange={v => { setRisk(v); setSelectedTerritory(null); setSelectedCountry(null); }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={showRisk ? colors.primary : colors.surface}
          />
        </View>
      )}

      {/* Map editing buttons — shown when allowMapEditing is on and not currently editing */}
      {allowMapEditing && !isEditing && (
        <View style={[styles.editBtnsRow, { borderColor: colors.border }]}>
          <Pressable
            onPress={startEditPlacement}
            style={[styles.editActionBtn, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          >
            <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              {t('settings.editLabelPlacement')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.editActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            disabled
          >
            <Text variant="caption" style={{ color: colors.textSecondary }}>
              {t('settings.editConnections')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Info panel */}
      {!isEditing && (
        <AnimatePresence>
          {(selectedTerritory || selectedCountry) && (
            <MotiView
              key={selectedTerritory?.id ?? selectedCountry ?? ''}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 8 }}
              transition={{ type: 'timing', duration: 180 }}
              style={[styles.infoPanel, { backgroundColor: colors.card, borderColor: colors.border }]}
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
      )}
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
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  editBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  editBtnsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  editActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
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
