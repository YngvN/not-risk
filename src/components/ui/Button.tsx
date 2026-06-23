import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';
import { Spacing, BorderRadius } from '../../constants/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** Visual style of the button. Defaults to 'primary'. */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Replaces the label with an activity spinner. */
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Themed, accessible button with four style variants.
 *
 * @example
 * <Button label="Save" onPress={handleSave} />
 * <Button label="Cancel" variant="outline" onPress={handleCancel} />
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const isInteractive = !disabled && !loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    variant === 'primary' && { backgroundColor: colors.primary },
    variant === 'secondary' && { backgroundColor: colors.surface },
    variant === 'outline' && {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    !isInteractive && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const labelColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'ghost'
      ? colors.textSecondary
      : colors.primary;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={{ color: labelColor, fontWeight: '600' }}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
});
