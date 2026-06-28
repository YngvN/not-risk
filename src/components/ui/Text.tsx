import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FontSize, FontWeight } from '../../constants/spacing';

/** Visual scale applied per variant. */
export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption';

const variantStyles: Record<TextVariant, { fontSize: number; fontWeight: TextStyle['fontWeight'] }> = {
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  h2: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
  h3: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  body: { fontSize: FontSize.md, fontWeight: FontWeight.regular },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  caption: { fontSize: FontSize.xs, fontWeight: FontWeight.regular },
};

interface TextProps extends RNTextProps {
  /** Typography scale. Defaults to 'body'. */
  variant?: TextVariant;
  /** Use the secondary (muted) text color. */
  secondary?: boolean;
}

/**
 * Themed text component.
 * Always sourced from theme colors — never use raw color values.
 *
 * @example
 * <Text variant="h2">Hello</Text>
 * <Text secondary>Muted detail</Text>
 */
export function Text({ variant = 'body', secondary, style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[
        variantStyles[variant],
        { color: secondary ? colors.textSecondary : colors.text },
        style,
      ]}
      {...props}
    />
  );
}
