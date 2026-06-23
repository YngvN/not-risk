import React, { useState } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Scale factor when pressed. Defaults to 0.96. */
  scale?: number;
}

/**
 * Wraps any content in a pressable that scales down slightly on press.
 * Works on both mobile (touch) and web (mouse).
 *
 * @example
 * <PressableScale onPress={handlePress}>
 *   <Card>Tap me</Card>
 * </PressableScale>
 */
export function PressableScale({ children, onPress, style, scale = 0.96 }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={style}
    >
      <MotiView
        animate={{ scale: pressed ? scale : 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        {children}
      </MotiView>
    </Pressable>
  );
}
