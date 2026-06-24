import React, { useState } from 'react';
import Svg, { G, Path, Polygon, Text as SvgText, Defs, ClipPath, Rect } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { TERRITORIES, Territory, TerritoryId } from '../../constants/riskWorldTerritories';
import { AFRICA_POLYGONS, AFRICA_LABELS, AFRICA_CLASS_PATH_NAMES, AFRICA_CLIP_IDS } from '../../constants/riskAfricaOverrides';
import { WORLD_AFRICA_PATHS } from '../../assets/maps/worldAfricaPaths';
import { WORLD_AFRICA_ALL_PATHS } from '../../assets/maps/worldAfricaAllPaths';
import { WORLD_AFRICA_CLASS_PATHS } from '../../assets/maps/worldAfricaClassPaths';

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
              fill={colors.text}
              stroke={isSelected ? colors.primary : colors.textSecondary}
              strokeWidth={isSelected ? 1.2 : 0.3}
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
      <Defs>
        {/* Canada splits: bbox x:348-778, y:3-232.
            60°N ≈ y=158 (linear: 232 - 11*6.74 ≈ 158).
            97°W ≈ x=561. 80°W ≈ x=643. */}
        <ClipPath id="ca-north">
          <Rect x={0} y={0} width={2000} height={158} />
        </ClipPath>
        <ClipPath id="ca-alberta">
          <Rect x={0} y={158} width={561} height={699} />
        </ClipPath>
        <ClipPath id="ca-ontario">
          <Rect x={561} y={158} width={82} height={699} />
        </ClipPath>
        <ClipPath id="ca-quebec">
          <Rect x={643} y={158} width={857} height={699} />
        </ClipPath>
        {/* Australia splits: 135°E = x≈1729. Tasmania (x:1735+) falls in the east clip. */}
        <ClipPath id="au-west">
          <Rect x={0} y={0} width={1729} height={857} />
        </ClipPath>
        <ClipPath id="au-east">
          <Rect x={1729} y={0} width={271} height={857} />
        </ClipPath>
      </Defs>

      {TERRITORIES.map(territory => {
        // Only fall back to the Pacific polygon if this territory has no Africa-specific
        // polygon AND no class paths — otherwise the Pacific rectangles appear on the wrong map.
        const classNames = AFRICA_CLASS_PATH_NAMES[territory.id];
        const polygonPoints = AFRICA_POLYGONS[territory.id] ??
          (classNames?.length ? undefined : territory.polygonPoints);
        const labelPos = AFRICA_LABELS[territory.id];
        const isSelected = selectedRiskId === territory.id;
        const fill = colors[territory.colorToken];
        const stroke = isSelected ? colors.territorySelectedBorder : colors.territoryBorder;
        const { x, y } = labelPos;
        const label = shortLabel(territory.id);
        const clipId = AFRICA_CLIP_IDS[territory.id];

        return (
          <AfricaTerritoryGroup
            key={territory.id}
            territoryId={territory.id}
            svgIds={territory.svgIds}
            classPathNames={classNames}
            clipPathId={clipId}
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
  classPathNames?: string[];
  /** If set, class-based paths are clipped to this SVG clip-path id. */
  clipPathId?: string;
  polygonPoints?: string;
  isSelected: boolean;
  onPress: (id: TerritoryId) => void;
  fill: string; stroke: string;
  labelX: number; labelY: number; label: string;
  textColor: string; bgColor: string;
}

function AfricaTerritoryGroup({
  territoryId, svgIds, classPathNames, clipPathId, polygonPoints,
  isSelected, onPress, fill, stroke, labelX, labelY, label, textColor, bgColor,
}: AfricaTerritoryGroupProps) {
  const sharedProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 1.5 : 0.4, { damping: 15, stiffness: 200 }),
  }));

  const clip = clipPathId ? `url(#${clipPathId})` : undefined;

  return (
    <G onPress={() => onPress(territoryId)} opacity={isSelected ? 0.88 : 1}>
      {/* id-based paths (169 named countries) */}
      {svgIds.map(id => {
        const d = WORLD_AFRICA_PATHS[id];
        if (!d) return null;
        return <AnimatedPath key={id} d={d} fill={fill} stroke={stroke} animatedProps={sharedProps} />;
      })}
      {/* class-based paths, optionally clipped (e.g. Australia split) */}
      {classPathNames?.map(name => {
        const d = WORLD_AFRICA_CLASS_PATHS[name];
        if (!d) return null;
        return (
          <AnimatedPath
            key={`class-${name}`}
            d={d}
            fill={fill}
            stroke={stroke}
            clipPath={clip}
            animatedProps={sharedProps}
          />
        );
      })}
      {/* polygon fallback */}
      {polygonPoints && (
        <AnimatedPolygon points={polygonPoints} fill={fill} stroke={stroke} animatedProps={sharedProps} />
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
