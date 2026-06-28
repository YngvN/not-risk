import React, { useState } from 'react';
import Svg, { G, Path, Text as SvgText, Circle, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { TERRITORIES, Territory, TerritoryId } from '../../constants/riskWorldTerritories';
import { RISK_BOARD_PATHS } from '../../assets/maps/riskBoardPaths';
import { RISK_BOARD_DASHED_PATHS } from '../../assets/maps/riskBoardDashedPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG    = Animated.createAnimatedComponent(G);

/** Reverse of SVG_ID_TO_TERRITORY — look up svgId from TerritoryId. */

/**
 * ViewBox trimmed to the content bounds of the 42 territory paths.
 * y starts at 60 instead of the content boundary (~130) to add empty sky above
 * northern territories (Greenland, Alaska, NW Territory) so they can be
 * properly centred when the map zooms in on them.
 * The SVG declared width/height (749×519) is smaller than the actual content
 * which extends to ~x=900 (Asia/Pacific wrapping right).
 */
const VIEWBOX = '191 60 714 614';
const VIEWBOX_ASPECT = 714 / 614;

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

/** Reverse of SVG_ID_TO_TERRITORY: TerritoryId → svgId. */
const SVG_ID_FOR_TERRITORY: Partial<Record<string, string>> = Object.fromEntries(
  Object.entries(SVG_ID_TO_TERRITORY).map(([svgId, terrId]) => [terrId, svgId]),
);

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

/**
 * TerritoryId → label centroid in Risk_board.svg SVG coordinate space.
 * ViewBox: 191 130 714 474 (x-range 191–905, y-range 130–604).
 * Used by PlayScreen to compute the zoom focal point when a territory is selected.
 */
export const TERRITORY_LABEL_POS: Partial<Record<string, { x: number; y: number }>> =
  Object.fromEntries(
    Object.entries(SVG_ID_TO_TERRITORY)
      .filter(([svgId]) => LABEL_POS[svgId] !== undefined)
      .map(([svgId, terrId]) => [terrId, LABEL_POS[svgId]]),
  );

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

// ── Map component ─────────────────────────────────────────────────────────────

export interface RiskBoardMapProps {
  showRiskLayer?: boolean;
  onTerritorySelect?: (territory: Territory | null) => void;
  /** Override fill color per TerritoryId (e.g. player color during a game). */
  territoryFills?: Partial<Record<string, string>>;
  /** Army count badge per TerritoryId. */
  armyCounts?: Partial<Record<string, number>>;
  /** Armies placed this turn (shown as a green "+N" badge beside the count). */
  armyDeltas?: Partial<Record<string, number>>;
  /** TerritoryIds that render with a highlighted border (valid attack targets, etc.). */
  highlightedIds?: ReadonlySet<string>;
  /** When provided, only these TerritoryIds respond to press; others are dimmed. */
  selectableIds?: ReadonlySet<string>;
  /**
   * TerritoryIds that fire onTerritorySelect when tapped but do NOT enter the
   * map's internal selected state (no hover lift). Used for the attack target
   * so it can be de-tapped to cancel without gaining the hover effect.
   */
  tappableIds?: ReadonlySet<string>;
  /**
   * TerritoryIds that always receive the hover/lift effect regardless of
   * selectability — used to keep the last claimed territory lifted.
   */
  forceLiftedIds?: ReadonlySet<string>;
  /**
   * When a tappable territory is de-tapped, restore selection (and hover) to
   * this TerritoryId instead of clearing it entirely. Used to keep the friendly
   * attacker hovered after the enemy target is deselected.
   */
  restoreSelectionId?: string;
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
  armyDeltas,
  highlightedIds,
  selectableIds,
  tappableIds,
  restoreSelectionId,
  forceLiftedIds,
}: RiskBoardMapProps) {
  const { colors } = useTheme();
  const [selectedSvgId,  setSelectedSvgId]  = useState<string | null>(null);
  // elevatedSvgId stays set until the spring-back animation completes so the
  // territory keeps rendering on top (last in SVG paint order) during deselection.
  const [elevatedSvgId, setElevatedSvgId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!showRiskLayer) { setSelectedSvgId(null); onTerritorySelect?.(null); }
  }, [showRiskLayer]);

  const handlePress = (svgId: string) => {
    if (!showRiskLayer) return;
    const territoryId = SVG_ID_TO_TERRITORY[svgId];

    if (selectableIds && territoryId && !selectableIds.has(territoryId)) {
      // Tappable-but-no-hover: fires callback without entering selected state.
      // Restores selection (and hover) to restoreSelectionId if provided so the
      // previously-active territory (e.g. the attacker) regains its hover effect.
      if (tappableIds && tappableIds.has(territoryId)) {
        const restoreSvgId = restoreSelectionId ? SVG_ID_FOR_TERRITORY[restoreSelectionId] : undefined;
        setSelectedSvgId(restoreSvgId ?? null);
        if (restoreSvgId) setElevatedSvgId(restoreSvgId);
        onTerritorySelect?.(TERRITORIES.find(t => t.id === territoryId) ?? null);
        return;
      }
      setSelectedSvgId(null);
      onTerritorySelect?.(null);
      return;
    }

    // Repeated tap on the already-selected territory: keep it selected and
    // fire the callback so the parent can react (e.g. place another army).
    if (selectedSvgId === svgId) {
      onTerritorySelect?.(
        territoryId ? TERRITORIES.find(t => t.id === territoryId) ?? null : null,
      );
      return;
    }

    setSelectedSvgId(svgId);
    setElevatedSvgId(svgId);
    onTerritorySelect?.(
      territoryId ? TERRITORIES.find(t => t.id === territoryId) ?? null : null,
    );
  };

  const handleBackgroundPress = () => {
    if (!showRiskLayer) return;
    setSelectedSvgId(null);
    onTerritorySelect?.(null);
  };

  return (
    <Svg viewBox={VIEWBOX} width="100%" style={{ aspectRatio: VIEWBOX_ASPECT }}>
      {/* Transparent hit-target covering the full viewBox — catches ocean taps to deselect. */}
      <Rect x={191} y={60} width={714} height={614} fill="transparent" onPress={handleBackgroundPress} />

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

      {/* Territory fills — elevated territory sorted last so it paints on top */}
      {(elevatedSvgId
        ? [
            ...Object.entries(RISK_BOARD_PATHS).filter(([id]) => id !== elevatedSvgId),
            ...Object.entries(RISK_BOARD_PATHS).filter(([id]) => id === elevatedSvgId),
          ]
        : Object.entries(RISK_BOARD_PATHS)
      ).map(([svgId, d]) => {
        const territoryId = SVG_ID_TO_TERRITORY[svgId];
        const territory = territoryId ? TERRITORIES.find(t => t.id === territoryId) : null;
        const isSelected = selectedSvgId === svgId;
        const isHighlighted = territoryId ? (highlightedIds?.has(territoryId) ?? false) : false;
        const isSelectable = !selectableIds || (territoryId ? selectableIds.has(territoryId) : false);

        // Priority: game override → theme color → surface
        const fill = (territoryFills && territoryId && territoryFills[territoryId])
          ?? (showRiskLayer && territory ? colors[territory.colorToken] : colors.surface);

        // Gold border = parent-controlled (highlightedIds): attacker, chosen target, etc.
        // Hover/lift = internal map tap (selectedSvgId) while still selectable.
        const stroke = isHighlighted
          ? colors.territorySelectedBorder
          : colors.territoryBorder;
        const isForceLifted = !!(forceLiftedIds && territoryId && forceLiftedIds.has(territoryId));
        const isLifted = (isSelected && isSelectable) || isForceLifted;

        const pos = LABEL_POS[svgId];
        const armyCount = armyCounts && territoryId ? armyCounts[territoryId] : undefined;
        const armyDelta = armyDeltas && territoryId ? armyDeltas[territoryId] : undefined;

        return (
          <TerritoryShape
            key={svgId}
            svgId={svgId}
            d={d}
            fill={fill}
            stroke={stroke}
            isSelected={isHighlighted}
            isLifted={isLifted}
            isSelectable={isSelectable}
            onPress={handlePress}
            showLabel={showRiskLayer}
            labelPos={pos}
            labelText={label(svgId)}
            textColor={colors.text}
            bgColor={colors.background}
            armyCount={armyCount}
            armyDelta={armyDelta}
            onLiftEnd={svgId === elevatedSvgId ? () => setElevatedSvgId(null) : undefined}
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
  /** True when this territory has the gold border (selected OR highlighted). */
  isSelected: boolean;
  /** True only when this exact territory was tapped — drives the hover/shadow effect. */
  isLifted: boolean;
  /** Called when the spring-back animation completes — used to restore z-order. */
  onLiftEnd?: () => void;
  isSelectable: boolean;
  onPress: (id: string) => void;
  showLabel: boolean;
  labelPos: { x: number; y: number } | undefined;
  labelText: string;
  textColor: string;
  bgColor: string;
  armyCount?: number;
  /** Armies placed this reinforce turn — shown as a green "+N" beside the count. */
  armyDelta?: number;
}

function TerritoryShape({
  svgId, d, fill, stroke, isSelected, isLifted, onLiftEnd, isSelectable, onPress,
  showLabel, labelPos, labelText, textColor, bgColor, armyCount, armyDelta,
}: TerritoryShapeProps) {
  const cx = labelPos?.x ?? 500;
  const cy = labelPos?.y ?? 300;

  // ── Lift / scale ─────────────────────────────────────────────────────────────
  const scaleVal = useSharedValue(1);

  const onLiftEndRef = React.useRef(onLiftEnd);
  onLiftEndRef.current = onLiftEnd;
  const notifyLiftEnd = React.useCallback(() => { onLiftEndRef.current?.(); }, []);

  React.useEffect(() => {
    if (isLifted) {
      scaleVal.value = withSpring(1.06, { damping: 12, stiffness: 180 });
    } else {
      scaleVal.value = withSpring(1, { damping: 12, stiffness: 180 }, (finished) => {
        'worklet';
        if (finished) runOnJS(notifyLiftEnd)();
      });
    }
  }, [isLifted]);

  // ── Selectable opacity — animates the dim effect smoothly ─────────────────────
  const groupOpacity = useSharedValue((isSelectable || isSelected) ? 1 : 0.35);

  React.useEffect(() => {
    const target = (isSelectable || isSelected) ? 1 : 0.35;
    groupOpacity.value = withTiming(target, { duration: 220, easing: Easing.inOut(Easing.ease) });
  }, [isSelectable, isSelected]);

  // ── Fill crossfade ─────────────────────────────────────────────────────────────
  const prevFillRef = React.useRef(fill);
  const [prevFillSnapshot, setPrevFillSnapshot] = useState<string | null>(null);
  const fillFade = useSharedValue(1);

  React.useEffect(() => {
    if (fill !== prevFillRef.current) {
      const old = prevFillRef.current;
      prevFillRef.current = fill;
      setPrevFillSnapshot(old);
      fillFade.value = 0;
      fillFade.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }, (done) => {
        'worklet';
        if (done) runOnJS(setPrevFillSnapshot)(null);
      });
    }
  }, [fill]);

  // ── Animated props ────────────────────────────────────────────────────────────
  const gProps = useAnimatedProps(() => {
    'worklet';
    const s = scaleVal.value;
    const tx = cx * (1 - s);
    const ty = cy * (1 - s);
    return {
      transform: `matrix(${s} 0 0 ${s} ${tx} ${ty})`,
      opacity: groupOpacity.value,
    };
  });

  const pathProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 2.5 : 0.8, { damping: 15, stiffness: 200 }),
    opacity: fillFade.value,
  }));

  return (
    <AnimatedG animatedProps={gProps} onPress={() => onPress(svgId)}>
      {/* Drop-shadow: offset copy rendered beneath the territory */}
      {isLifted && (
        <Path d={d} fill="black" opacity={0.28} transform="translate(2,5)" pointerEvents="none" />
      )}

      {/* Previous fill — sits below the crossfading new fill during color transitions */}
      {prevFillSnapshot && (
        <Path d={d} fill={prevFillSnapshot} stroke="none" pointerEvents="none" />
      )}

      {/* Current fill — fades in when fill changes, always carries the stroke */}
      <AnimatedPath d={d} fill={fill} stroke={stroke} animatedProps={pathProps} />

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

      {armyCount !== undefined && labelPos && (
        <>
          {/* Main count badge — shifted left when a delta badge sits beside it */}
          <Circle
            cx={armyDelta ? labelPos.x - 6.5 : labelPos.x}
            cy={labelPos.y + 8}
            r={5.5}
            fill="white" opacity={0.92}
            pointerEvents="none"
          />
          <SvgText
            x={armyDelta ? labelPos.x - 6.5 : labelPos.x}
            y={labelPos.y + 8}
            textAnchor="middle" alignmentBaseline="middle"
            fontSize={5.5} fontWeight="bold"
            fill="#000"
            pointerEvents="none"
          >
            {armyCount}
          </SvgText>

          {/* Delta badge — green "+N" for armies placed this turn */}
          {armyDelta !== undefined && armyDelta > 0 && (
            <>
              <Circle
                cx={labelPos.x + 6.5}
                cy={labelPos.y + 8}
                r={5.5}
                fill="#27AE60" opacity={0.95}
                pointerEvents="none"
              />
              <SvgText
                x={labelPos.x + 6.5}
                y={labelPos.y + 8}
                textAnchor="middle" alignmentBaseline="middle"
                fontSize={4.5} fontWeight="bold"
                fill="white"
                pointerEvents="none"
              >
                +{armyDelta}
              </SvgText>
            </>
          )}
        </>
      )}
    </AnimatedG>
  );
}
