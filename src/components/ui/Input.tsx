import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';
import { Spacing, BorderRadius, FontSize } from '../../constants/spacing';

interface InputProps extends TextInputProps {
  /** Label displayed above the input. */
  label?: string;
  /** Validation error message displayed below the input. */
  error?: string;
}

/**
 * Themed text input with optional label and error state.
 * Border color transitions on focus and turns error-red when `error` is set.
 *
 * @example
 * <Input label="Email" placeholder="you@example.com" />
 * <Input label="Password" error="Password is required" secureTextEntry />
 */
export function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && (
        <Text variant="caption" style={{ color: colors.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    minHeight: 44,
  },
});
