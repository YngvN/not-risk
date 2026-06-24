import React, { useState } from 'react';
import Svg, { G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { TERRITORIES, Territory, TerritoryId } from '../../constants/riskWorldTerritories';
import { WORLD_PATHS } from '../../assets/maps/worldPaths';
import { WORLD_COUNTRY_NAMES } from '../../assets/maps/worldCountryNames';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

const VIEWBOX = '0 0 2000 868';
const VIEWBOX_ASPECT = 2000 / 868;

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

export interface WorldMapProps {
  showRiskLayer?: boolean;
  onTerritorySelect?: (territory: Territory | null) => void;
  /** Called in base mode when a country is tapped. Passes name or null on deselect. */
  onCountrySelect?: (name: string | null) => void;
}

/**
 * Pacific-centered world map (world-pacific.svg, viewBox 0 0 2000 868).
 * Base mode: all 221 country outlines, tappable with name on press.
 * Risk mode: 42 Risk territory groups with colour and selection.
 */
export function WorldMap({ showRiskLayer = true, onTerritorySelect, onCountrySelect }: WorldMapProps) {
  const { colors } = useTheme();
  const [selectedRiskId, setSelectedRiskId] = useState<TerritoryId | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  React.useEffect(() => {
    if (!showRiskLayer) { setSelectedRiskId(null); onTerritorySelect?.(null); }
    else { setSelectedIso(null); onCountrySelect?.(null); }
  }, [showRiskLayer]);

  if (!showRiskLayer) {
    const handleCountryPress = (iso: string) => {
      const next = selectedIso === iso ? null : iso;
      setSelectedIso(next);
      onCountrySelect?.(next ? (WORLD_COUNTRY_NAMES[next] ?? next) : null);
    };

    return (
      <Svg viewBox={VIEWBOX} width="100%" style={{ aspectRatio: VIEWBOX_ASPECT }}>
        {Object.entries(WORLD_PATHS).map(([iso, d]) => {
          const isSelected = selectedIso === iso;
          return (
            <Path
              key={iso}
              d={d}
              fill={colors.surface}
              stroke={isSelected ? colors.primary : colors.border}
              strokeWidth={isSelected ? 1.2 : 0.4}
              onPress={() => handleCountryPress(iso)}
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
      {TERRITORIES.map(territory => (
        <TerritoryGroup
          key={territory.id}
          territory={territory}
          isSelected={selectedRiskId === territory.id}
          onPress={handleRiskPress}
          fill={colors[territory.colorToken]}
          stroke={selectedRiskId === territory.id ? colors.territorySelectedBorder : colors.territoryBorder}
          textColor={colors.text}
          bgColor={colors.background}
        />
      ))}
    </Svg>
  );
}

interface TerritoryGroupProps {
  territory: Territory;
  isSelected: boolean;
  onPress: (id: TerritoryId) => void;
  fill: string; stroke: string; textColor: string; bgColor: string;
}

function TerritoryGroup({ territory, isSelected, onPress, fill, stroke, textColor, bgColor }: TerritoryGroupProps) {
  const pathProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 1.5 : 0.4, { damping: 15, stiffness: 200 }),
  }));
  const polyProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 1.5 : 0.4, { damping: 15, stiffness: 200 }),
  }));
  const { x, y } = territory.labelPosition;
  const label = shortLabel(territory.id);

  return (
    <G onPress={() => onPress(territory.id)} opacity={isSelected ? 0.88 : 1}>
      {territory.svgIds.map(id => {
        const d = WORLD_PATHS[id];
        if (!d) return null;
        return <AnimatedPath key={id} d={d} fill={fill} stroke={stroke} animatedProps={pathProps} />;
      })}
      {territory.polygonPoints && (
        <AnimatedPolygon points={territory.polygonPoints} fill={fill} stroke={stroke} animatedProps={polyProps} />
      )}
      <SvgText x={x} y={y} textAnchor="middle" alignmentBaseline="middle"
        fontSize={7} fontWeight="bold" fill="none" stroke={bgColor} strokeWidth={2}
        pointerEvents="none">{label}</SvgText>
      <SvgText x={x} y={y} textAnchor="middle" alignmentBaseline="middle"
        fontSize={7} fontWeight="bold" fill={textColor}
        pointerEvents="none">{label}</SvgText>
    </G>
  );
}
