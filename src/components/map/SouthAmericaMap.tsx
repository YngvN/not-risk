import React, { useState } from 'react';
import Svg, { G, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import {
  SOUTH_AMERICA_TERRITORIES,
  SATerritory,
  SATerritoryId,
} from '../../constants/riskSouthAmericaTerritories';
import { SA_POLYLINES } from '../../assets/maps/southAmericaPaths';

const VIEWBOX = '0 0 81.08 117.70';
const VIEWBOX_ASPECT = 81.08 / 117.70;

export interface SouthAmericaMapProps {
  onTerritorySelect?: (territory: SATerritory | null) => void;
}

/**
 * Interactive SVG map of the 4 South American Risk territories.
 * Filled territory polygons are drawn first; country border polylines
 * from south-america.svg are overlaid to show internal boundaries.
 *
 * @example
 * <SouthAmericaMap onTerritorySelect={t => console.log(t?.id)} />
 */
export function SouthAmericaMap({ onTerritorySelect }: SouthAmericaMapProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<SATerritoryId | null>(null);

  const handlePress = (id: SATerritoryId) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    onTerritorySelect?.(
      next ? SOUTH_AMERICA_TERRITORIES.find(terr => terr.id === next) ?? null : null,
    );
  };

  return (
    <Svg
      viewBox={VIEWBOX}
      width="100%"
      style={{ aspectRatio: VIEWBOX_ASPECT }}
    >
      {/* Filled territory polygons */}
      {SOUTH_AMERICA_TERRITORIES.map(territory => {
        const isSelected = selectedId === territory.id;
        const { x, y } = territory.labelPosition;
        const label = territory.id.charAt(0).toUpperCase() + territory.id.slice(1);

        return (
          <G
            key={territory.id}
            onPress={() => handlePress(territory.id)}
            opacity={isSelected ? 0.88 : 1}
          >
            <Polygon
              points={territory.polygonPoints}
              fill={colors[territory.colorToken]}
              stroke={isSelected ? colors.territorySelectedBorder : colors.territoryBorder}
              strokeWidth={isSelected ? 0.5 : 0.2}
            />
            {/* Two-pass text: stroke outline then fill */}
            <SvgText x={x} y={y} textAnchor="middle" alignmentBaseline="middle"
              fontSize={4} fontWeight="bold" fill="none"
              stroke={colors.background} strokeWidth={1} pointerEvents="none">
              {label}
            </SvgText>
            <SvgText x={x} y={y} textAnchor="middle" alignmentBaseline="middle"
              fontSize={4} fontWeight="bold" fill={colors.text} pointerEvents="none">
              {label}
            </SvgText>
          </G>
        );
      })}

      {/* Country border polylines overlaid on top */}
      {Object.entries(SA_POLYLINES).map(([id, points]) => (
        <Polyline
          key={id}
          points={points}
          stroke={colors.territoryBorder}
          strokeWidth={0.25}
          fill="none"
          pointerEvents="none"
        />
      ))}
    </Svg>
  );
}
