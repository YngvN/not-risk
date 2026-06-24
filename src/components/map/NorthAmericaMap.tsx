import React, { useState } from 'react';
import Svg, { G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import {
  NORTH_AMERICA_TERRITORIES,
  Territory,
  TerritoryId,
} from '../../constants/riskTerritories';
import { TerritoryPolygon } from './TerritoryPolygon';

/** ViewBox matches the north-america.svg source dimensions. */
const VIEWBOX = '0 0 1000 902';
const VIEWBOX_ASPECT = 1000 / 902;

/**
 * Greenland polygon in the SVG coordinate space (0 0 1000 902).
 * Greenland is not present in the SVG source so it is drawn as an overlay.
 * Coordinates are approximated to match a Mercator-style projection.
 */
const GREENLAND_POINTS = '930,20 990,40 1000,100 980,180 950,210 920,200 895,160 900,80';

export interface NorthAmericaMapProps {
  /** Called whenever the selected territory changes. Passes null on deselect. */
  onTerritorySelect?: (territory: Territory | null) => void;
}

/**
 * Interactive SVG map of the 9 North American Risk territories.
 * Paths come from the north-america.svg source via northAmericaPaths.ts.
 * Tap a territory to select it; tap again to deselect.
 *
 * @example
 * <NorthAmericaMap onTerritorySelect={t => console.log(t?.id)} />
 */
export function NorthAmericaMap({ onTerritorySelect }: NorthAmericaMapProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<TerritoryId | null>(null);

  const handlePress = (id: TerritoryId) => {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    onTerritorySelect?.(
      next ? NORTH_AMERICA_TERRITORIES.find(terr => terr.id === next) ?? null : null,
    );
  };

  const greenland = NORTH_AMERICA_TERRITORIES.find(t => t.id === 'greenland')!;
  const isGreenlandSelected = selectedId === 'greenland';

  return (
    <Svg
      viewBox={VIEWBOX}
      width="100%"
      style={{ aspectRatio: VIEWBOX_ASPECT }}
    >
      {NORTH_AMERICA_TERRITORIES.filter(t => t.svgIds.length > 0).map(territory => (
        <TerritoryPolygon
          key={territory.id}
          territory={territory}
          isSelected={selectedId === territory.id}
          onPress={handlePress}
        />
      ))}

      {/* Greenland — polygon overlay since it's not in the SVG source */}
      <G onPress={() => handlePress('greenland')} opacity={isGreenlandSelected ? 0.88 : 1}>
        <Polygon
          points={GREENLAND_POINTS}
          fill={colors[greenland.colorToken]}
          stroke={isGreenlandSelected ? colors.territorySelectedBorder : colors.territoryBorder}
          strokeWidth={isGreenlandSelected ? 2.5 : 0.5}
        />
        <SvgText
          x={greenland.labelPosition.x}
          y={greenland.labelPosition.y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={14}
          fontWeight="bold"
          fill="none"
          stroke={colors.background}
          strokeWidth={3}
          pointerEvents="none"
        >
          Greenland
        </SvgText>
        <SvgText
          x={greenland.labelPosition.x}
          y={greenland.labelPosition.y}
          textAnchor="middle"
          alignmentBaseline="middle"
          fontSize={14}
          fontWeight="bold"
          fill={colors.text}
          pointerEvents="none"
        >
          Greenland
        </SvgText>
      </G>

      {/* Alaska → Kamchatka cross-map connection marker */}
      <G>
        <Line
          x1={80}
          y1={190}
          x2={30}
          y2={190}
          stroke={colors.territoryBorder}
          strokeWidth={1.5}
          strokeDasharray="6,3"
        />
        <SvgText
          x={85}
          y={178}
          fontSize={10}
          fill={colors.textSecondary}
          fontStyle="italic"
        >
          {t('map.kamchatkaNote')}
        </SvgText>
      </G>
    </Svg>
  );
}
