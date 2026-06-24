import React, { useState } from 'react';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { TERRITORIES, Territory, TerritoryId } from '../../constants/riskWorldTerritories';
import { RISK_BOARD_PATHS } from '../../assets/maps/riskBoardPaths';
import { RISK_BOARD_DASHED_PATHS } from '../../assets/maps/riskBoardDashedPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * ViewBox trimmed to the content bounds of the 42 territory paths.
 * The SVG declared width/height (749×519) is smaller than the actual content
 * which extends to ~x=900 (Asia/Pacific wrapping right).
 */
const VIEWBOX = '191 130 714 474';
const VIEWBOX_ASPECT = 714 / 474;

/**
 * Maps Risk_board.svg path IDs → TerritoryId.
 * 'yakursk' is a typo in the source SVG for 'yakutsk'.
 */
const SVG_ID_TO_TERRITORY: Record<string, TerritoryId> = {
  alaska:                   'alaska',
  northwest_territory:      'northwest',
  alberta:                  'alberta',
  ontario:                  'ontario',
  quebec:                   'quebec',
  greenland:                'greenland',
  western_united_states:    'westernUS',
  eastern_united_states:    'easternUS',
  central_america:          'centralAmerica',
  venezuela:                'venezuela',
  peru:                     'peru',
  brazil:                   'brazil',
  argentina:                'argentina',
  iceland:                  'iceland',
  great_britain:            'greatBritain',
  northern_europe:          'northernEurope',
  scandinavia:              'scandinavia',
  western_europe:           'westernEurope',
  southern_europe:          'southernEurope',
  ukraine:                  'ukraine',
  north_africa:             'northAfrica',
  egypt:                    'egypt',
  east_africa:              'eastAfrica',
  congo:                    'congo',
  south_africa:             'southAfrica',
  madagascar:               'madagascar',
  ural:                     'ural',
  siberia:                  'siberia',
  yakursk:                  'yakutsk',
  irkutsk:                  'irkutsk',
  kamchatka:                'kamchatka',
  mongolia:                 'mongolia',
  japan:                    'japan',
  afghanistan:              'afghanistan',
  china:                    'china',
  middle_east:              'middleEast',
  india:                    'india',
  siam:                     'siam',
  indonesia:                'indonesia',
  new_guinea:               'newGuinea',
  western_australia:        'westernAustralia',
  eastern_australia:        'easternAustralia',
};

/** Label centroid per SVG path ID, computed from path bounding boxes. */
const LABEL_POS: Record<string, { x: number; y: number }> = {
  alaska:                { x: 226, y: 208 },
  northwest_territory:   { x: 306, y: 190 },
  alberta:               { x: 285, y: 240 },
  ontario:               { x: 340, y: 254 },
  quebec:                { x: 388, y: 249 },
  greenland:             { x: 424, y: 185 },
  western_united_states: { x: 292, y: 298 },
  eastern_united_states: { x: 348, y: 306 },
  central_america:       { x: 294, y: 360 },
  venezuela:             { x: 361, y: 404 },
  peru:                  { x: 354, y: 459 },
  brazil:                { x: 390, y: 462 },
  argentina:             { x: 370, y: 538 },
  iceland:               { x: 490, y: 224 },
  great_britain:         { x: 475, y: 275 },
  northern_europe:       { x: 543, y: 287 },
  scandinavia:           { x: 549, y: 222 },
  western_europe:        { x: 493, y: 341 },
  southern_europe:       { x: 549, y: 337 },
  ukraine:               { x: 614, y: 268 },
  north_africa:          { x: 524, y: 428 },
  egypt:                 { x: 574, y: 407 },
  east_africa:           { x: 612, y: 482 },
  congo:                 { x: 572, y: 492 },
  south_africa:          { x: 584, y: 553 },
  madagascar:            { x: 644, y: 554 },
  ural:                  { x: 689, y: 233 },
  siberia:               { x: 717, y: 220 },
  yakursk:               { x: 777, y: 190 },
  irkutsk:               { x: 770, y: 245 },
  kamchatka:             { x: 832, y: 229 },
  mongolia:              { x: 780, y: 290 },
  japan:                 { x: 844, y: 294 },
  afghanistan:           { x: 669, y: 308 },
  china:                 { x: 755, y: 336 },
  middle_east:           { x: 626, y: 394 },
  india:                 { x: 712, y: 393 },
  siam:                  { x: 771, y: 408 },
  indonesia:             { x: 779, y: 483 },
  new_guinea:            { x: 844, y: 465 },
  western_australia:     { x: 823, y: 553 },
  eastern_australia:     { x: 866, y: 548 },
};

const SHORT_LABELS: Partial<Record<string, string>> = {
  northwest_territory:   'NW Terr.',
  western_united_states: 'W.US',
  eastern_united_states: 'E.US',
  central_america:       'C.Am.',
  great_britain:         'GB',
  northern_europe:       'N.Eur.',
  western_europe:        'W.Eur.',
  southern_europe:       'S.Eur.',
  north_africa:          'N.Afr.',
  east_africa:           'E.Afr.',
  south_africa:          'S.Afr.',
  middle_east:           'M.East',
  afghanistan:           'Afghan.',
  western_australia:     'W.Aus.',
  eastern_australia:     'E.Aus.',
  new_guinea:            'N.Guin.',
};

function label(svgId: string): string {
  return SHORT_LABELS[svgId] ?? svgId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export interface RiskBoardMapProps {
  showRiskLayer?: boolean;
  onTerritorySelect?: (territory: Territory | null) => void;
  /** Override fill color per TerritoryId (e.g. player color during a game). */
  territoryFills?: Partial<Record<string, string>>;
  /** Army count badge per TerritoryId. */
  armyCounts?: Partial<Record<string, number>>;
  /** TerritoryIds that render with a highlighted border (valid attack targets, etc.). */
  highlightedIds?: ReadonlySet<string>;
  /** When provided, only these TerritoryIds respond to press; others are dimmed. */
  selectableIds?: ReadonlySet<string>;
}

/**
 * Interactive Risk board map using Risk_board.svg path data.
 * Each of the 42 classic territories is a native SVG path that exactly
 * matches the original Risk board artwork.
 *
 * @example
 * <RiskBoardMap showRiskLayer onTerritorySelect={t => console.log(t?.id)} />
 */
export function RiskBoardMap({
  showRiskLayer = true,
  onTerritorySelect,
  territoryFills,
  armyCounts,
  highlightedIds,
  selectableIds,
}: RiskBoardMapProps) {
  const { colors } = useTheme();
  const [selectedSvgId, setSelectedSvgId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!showRiskLayer) { setSelectedSvgId(null); onTerritorySelect?.(null); }
  }, [showRiskLayer]);

  const handlePress = (svgId: string) => {
    if (!showRiskLayer) return;
    const territoryId = SVG_ID_TO_TERRITORY[svgId];
    // Reject press if selectableIds is provided and this territory isn't in it
    if (selectableIds && territoryId && !selectableIds.has(territoryId)) return;
    const next = selectedSvgId === svgId ? null : svgId;
    setSelectedSvgId(next);
    onTerritorySelect?.(
      next && territoryId
        ? TERRITORIES.find(t => t.id === territoryId) ?? null
        : null,
    );
  };

  return (
    <Svg viewBox={VIEWBOX} width="100%" style={{ aspectRatio: VIEWBOX_ASPECT }}>
      {/* Dotted connection indicators — rendered BELOW territories so territory
          fills sit on top. fill="none" prevents enclosed areas from painting
          over map content; only the stroke/dot outlines are visible in ocean gaps. */}
      {RISK_BOARD_DASHED_PATHS.map((d, i) => (
        <Path
          key={`dash-${i}`}
          d={d}
          fill="none"
          stroke={colors.text}
          strokeWidth={0.8}
          strokeDasharray="3.5,1.5"
          pointerEvents="none"
        />
      ))}

      {/* Territory fills */}
      {Object.entries(RISK_BOARD_PATHS).map(([svgId, d]) => {
        const territoryId = SVG_ID_TO_TERRITORY[svgId];
        const territory = territoryId ? TERRITORIES.find(t => t.id === territoryId) : null;
        const isSelected = selectedSvgId === svgId;
        const isHighlighted = territoryId ? (highlightedIds?.has(territoryId) ?? false) : false;
        const isSelectable = !selectableIds || (territoryId ? selectableIds.has(territoryId) : false);

        // Priority: game override → theme color → surface
        const fill = (territoryFills && territoryId && territoryFills[territoryId])
          ?? (showRiskLayer && territory ? colors[territory.colorToken] : colors.surface);

        const stroke = (isSelected || isHighlighted)
          ? colors.territorySelectedBorder
          : colors.territoryBorder;

        const pos = LABEL_POS[svgId];
        const armyCount = armyCounts && territoryId ? armyCounts[territoryId] : undefined;

        return (
          <TerritoryShape
            key={svgId}
            svgId={svgId}
            d={d}
            fill={fill}
            stroke={stroke}
            isSelected={isSelected || isHighlighted}
            isSelectable={isSelectable}
            onPress={handlePress}
            showLabel={showRiskLayer}
            labelPos={pos}
            labelText={label(svgId)}
            textColor={colors.text}
            bgColor={colors.background}
            armyCount={armyCount}
          />
        );
      })}

    </Svg>
  );
}

// ── Internal shape renderer ──────────────────────────────────────────────────

interface TerritoryShapeProps {
  svgId: string;
  d: string;
  fill: string;
  stroke: string;
  isSelected: boolean;
  isSelectable: boolean;
  onPress: (id: string) => void;
  showLabel: boolean;
  labelPos: { x: number; y: number } | undefined;
  labelText: string;
  textColor: string;
  bgColor: string;
  armyCount?: number;
}

function TerritoryShape({
  svgId, d, fill, stroke, isSelected, isSelectable, onPress,
  showLabel, labelPos, labelText, textColor, bgColor, armyCount,
}: TerritoryShapeProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 2 : 0.8, { damping: 15, stiffness: 200 }),
  }));

  const opacity = isSelectable ? (isSelected ? 0.88 : 1) : 0.35;

  return (
    <G onPress={() => onPress(svgId)} opacity={opacity}>
      <AnimatedPath d={d} fill={fill} stroke={stroke} animatedProps={animatedProps} />
      {showLabel && labelPos && (
        <>
          <SvgText
            x={labelPos.x} y={labelPos.y}
            textAnchor="middle" alignmentBaseline="middle"
            fontSize={5} fontWeight="bold"
            fill="none" stroke={bgColor} strokeWidth={1.5}
            pointerEvents="none"
          >
            {labelText}
          </SvgText>
          <SvgText
            x={labelPos.x} y={labelPos.y}
            textAnchor="middle" alignmentBaseline="middle"
            fontSize={5} fontWeight="bold"
            fill={textColor}
            pointerEvents="none"
          >
            {labelText}
          </SvgText>
        </>
      )}
      {/* Army count badge — positioned below the label */}
      {armyCount !== undefined && labelPos && (
        <>
          <Circle
            cx={labelPos.x} cy={labelPos.y + 8}
            r={5.5}
            fill="white" opacity={0.92}
            pointerEvents="none"
          />
          <SvgText
            x={labelPos.x} y={labelPos.y + 8}
            textAnchor="middle" alignmentBaseline="middle"
            fontSize={5.5} fontWeight="bold"
            fill="#000"
            pointerEvents="none"
          >
            {armyCount}
          </SvgText>
        </>
      )}
    </G>
  );
}
