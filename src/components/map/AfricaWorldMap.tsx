import React, { useState } from 'react';
import Svg, { G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { TERRITORIES, Territory, TerritoryId } from '../../constants/riskWorldTerritories';
import { AFRICA_POLYGONS, AFRICA_LABELS } from '../../constants/riskAfricaOverrides';
import { WORLD_AFRICA_PATHS } from '../../assets/maps/worldAfricaPaths';
import { WORLD_AFRICA_ALL_PATHS } from '../../assets/maps/worldAfricaAllPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const VIEWBOX = '0 0 2000 857';
const VIEWBOX_ASPECT = 2000 / 857;

const SHORT: Partial<Record<TerritoryId, string>> = {
  northwest: 'NW', westernUS: 'W.US', easternUS: 'E.US',
  centralAmerica: 'C.Am.', northernEurope: 'N.Eur.', westernEurope: 'W.Eur.',
  southernEurope: 'S.Eur.', greatBritain: 'GB', northAfrica: 'N.Afr.',
  eastAfrica: 'E.Afr.', southAfrica: 'S.Afr.', middleEast: 'M.East',
  afghanistan: 'Afghan.', indonesia: 'Indon.', newGuinea: 'N.Guin.',
  westernAustralia: 'W.Aus.', easternAustralia: 'E.Aus.',
};

function shortLabel(id: TerritoryId): string {
  return SHORT[id] ?? (id.charAt(0).toUpperCase() + id.slice(1));
}

export interface AfricaWorldMapProps {
  showRiskLayer?: boolean;
  onTerritorySelect?: (territory: Territory | null) => void;
  onCountrySelect?: (name: string | null) => void;
}

/**
 * Atlantic-centered (Africa-centered) world map (world.svg, viewBox 0 0 2000 857).
 * Base mode: all 470 country paths (id-based + class-based), tappable with name on press.
 * Risk mode: 42 Risk territories with Africa-specific polygon overlays.
 */
export function AfricaWorldMap({ showRiskLayer = true, onTerritorySelect, onCountrySelect }: AfricaWorldMapProps) {
  const { colors } = useTheme();
  const [selectedRiskId, setSelectedRiskId] = useState<TerritoryId | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  React.useEffect(() => {
    if (!showRiskLayer) { setSelectedRiskId(null); onTerritorySelect?.(null); }
    else { setSelectedIdx(null); onCountrySelect?.(null); }
  }, [showRiskLayer]);

  if (!showRiskLayer) {
    const handlePress = (idx: number) => {
      const next = selectedIdx === idx ? null : idx;
      setSelectedIdx(next);
      const name = next !== null ? WORLD_AFRICA_ALL_PATHS[next].name || null : null;
      onCountrySelect?.(name);
    };

    return (
      <Svg viewBox={VIEWBOX} width="100%" style={{ aspectRatio: VIEWBOX_ASPECT }}>
        {WORLD_AFRICA_ALL_PATHS.map((entry, i) => {
          const isSelected = selectedIdx === i;
          return (
            <Path
              key={i}
              d={entry.d}
              fill={colors.surface}
              stroke={isSelected ? colors.primary : colors.border}
              strokeWidth={isSelected ? 1.2 : 0.4}
              onPress={() => handlePress(i)}
            />
          );
        })}
      </Svg>
    );
  }

  const handleRiskPress = (id: TerritoryId) => {
    const next = selectedRiskId === id ? null : id;
    setSelectedRiskId(next);
    onTerritorySelect?.(next ? TERRITORIES.find(t => t.id === next) ?? null : null);
  };

  return (
    <Svg viewBox={VIEWBOX} width="100%" style={{ aspectRatio: VIEWBOX_ASPECT }}>
      {TERRITORIES.map(territory => {
        const polygonPoints = AFRICA_POLYGONS[territory.id] ?? territory.polygonPoints;
        const labelPos = AFRICA_LABELS[territory.id];
        const isSelected = selectedRiskId === territory.id;
        const fill = colors[territory.colorToken];
        const stroke = isSelected ? colors.territorySelectedBorder : colors.territoryBorder;
        const { x, y } = labelPos;
        const label = shortLabel(territory.id);

        return (
          <AfricaTerritoryGroup
            key={territory.id}
            territoryId={territory.id}
            svgIds={territory.svgIds}
            polygonPoints={polygonPoints}
            isSelected={isSelected}
            onPress={handleRiskPress}
            fill={fill}
            stroke={stroke}
            labelX={x} labelY={y} label={label}
            textColor={colors.text}
            bgColor={colors.background}
          />
        );
      })}
    </Svg>
  );
}

interface AfricaTerritoryGroupProps {
  territoryId: TerritoryId;
  svgIds: string[];
  polygonPoints?: string;
  isSelected: boolean;
  onPress: (id: TerritoryId) => void;
  fill: string; stroke: string;
  labelX: number; labelY: number; label: string;
  textColor: string; bgColor: string;
}

function AfricaTerritoryGroup({
  territoryId, svgIds, polygonPoints, isSelected, onPress,
  fill, stroke, labelX, labelY, label, textColor, bgColor,
}: AfricaTerritoryGroupProps) {
  const pathProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 1.5 : 0.4, { damping: 15, stiffness: 200 }),
  }));
  const polyProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 1.5 : 0.4, { damping: 15, stiffness: 200 }),
  }));

  return (
    <G onPress={() => onPress(territoryId)} opacity={isSelected ? 0.88 : 1}>
      {svgIds.map(id => {
        const d = WORLD_AFRICA_PATHS[id];
        if (!d) return null;
        return <AnimatedPath key={id} d={d} fill={fill} stroke={stroke} animatedProps={pathProps} />;
      })}
      {polygonPoints && (
        <AnimatedPolygon points={polygonPoints} fill={fill} stroke={stroke} animatedProps={polyProps} />
      )}
      <SvgText x={labelX} y={labelY} textAnchor="middle" alignmentBaseline="middle"
        fontSize={7} fontWeight="bold" fill="none" stroke={bgColor} strokeWidth={2}
        pointerEvents="none">{label}</SvgText>
      <SvgText x={labelX} y={labelY} textAnchor="middle" alignmentBaseline="middle"
        fontSize={7} fontWeight="bold" fill={textColor}
        pointerEvents="none">{label}</SvgText>
    </G>
  );
}
