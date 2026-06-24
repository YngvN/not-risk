import React from 'react';
import { G, Path, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Territory, TerritoryId } from '../../constants/riskTerritories';
import { NA_PATHS } from '../../assets/maps/northAmericaPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const SHORT_LABELS: Record<string, string> = {
  northwest: 'NW Terr.',
  westernUS: 'W. USA',
  easternUS: 'E. USA',
  centralAmerica: 'C. America',
};

interface TerritoryPolygonProps {
  territory: Territory;
  isSelected: boolean;
  onPress: (id: TerritoryId) => void;
}

/**
 * Renders all SVG sub-regions (states/provinces) that form a single Risk territory.
 * Animates stroke width on selection using react-native-reanimated.
 *
 * @example
 * <TerritoryPolygon territory={t} isSelected={false} onPress={handlePress} />
 */
export function TerritoryPolygon({ territory, isSelected, onPress }: TerritoryPolygonProps) {
  const { colors } = useTheme();

  const animatedProps = useAnimatedProps(() => ({
    strokeWidth: withSpring(isSelected ? 2.5 : 0.5, { damping: 15, stiffness: 200 }),
  }));

  const fill = colors[territory.colorToken];
  const stroke = isSelected ? colors.territorySelectedBorder : colors.territoryBorder;
  const label = SHORT_LABELS[territory.id] ??
    (territory.id.charAt(0).toUpperCase() + territory.id.slice(1));

  const { x, y } = territory.labelPosition;

  return (
    <G onPress={() => onPress(territory.id)} opacity={isSelected ? 0.88 : 1}>
      {territory.svgIds.map(svgId => {
        const d = NA_PATHS[svgId];
        if (!d) return null;
        return (
          <AnimatedPath
            key={svgId}
            d={d}
            fill={fill}
            stroke={stroke}
            animatedProps={animatedProps}
          />
        );
      })}

      {/* Two-pass text rendering: stroke outline first, then fill on top */}
      <SvgText
        x={x}
        y={y}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={14}
        fontWeight="bold"
        fill="none"
        stroke={colors.background}
        strokeWidth={3}
        pointerEvents="none"
      >
        {label}
      </SvgText>
      <SvgText
        x={x}
        y={y}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={14}
        fontWeight="bold"
        fill={colors.text}
        pointerEvents="none"
      >
        {label}
      </SvgText>
    </G>
  );
}
