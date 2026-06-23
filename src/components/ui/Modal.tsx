import React, { useEffect, useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../hooks/useTheme';
import { Text } from './Text';
import { Spacing, BorderRadius } from '../../constants/spacing';

/** How long to wait (ms) for the exit animation before unmounting the RNModal. */
const CLOSE_DELAY_MS = 320;

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional title rendered at the top of the sheet. */
  title?: string;
  children: React.ReactNode;
}

/**
 * Animated bottom-sheet modal.
 *
 * - Backdrop fades in/out (200 ms timing).
 * - Sheet springs up from the bottom (spring: damping 22, stiffness 250).
 * - Works on iOS, Android, and web.
 * - Closes on backdrop tap or Android back button.
 *
 * The RNModal stays mounted for CLOSE_DELAY_MS after `visible` turns false
 * so the exit animation has time to complete before the native modal is torn down.
 *
 * @example
 * const [open, setOpen] = useState(false);
 *
 * <Button label="Open" onPress={() => setOpen(true)} />
 * <Modal visible={open} onClose={() => setOpen(false)} title="Confirm">
 *   <Text>Modal content goes here.</Text>
 *   <Button label="Close" onPress={() => setOpen(false)} />
 * </Modal>
 */
export function Modal({ visible, onClose, title, children }: ModalProps) {
  const { colors } = useTheme();

  // Stay mounted while the exit animation plays
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
    } else {
      const t = setTimeout(() => setIsMounted(false), CLOSE_DELAY_MS);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!isMounted) return null;

  return (
    <RNModal
      transparent
      visible={isMounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — fades in/out independently of the sheet */}
      <MotiView
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ type: 'timing', duration: 200 }}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </MotiView>

      {/* Sheet — springs up from the bottom */}
      <MotiView
        from={{ translateY: 500 }}
        animate={{ translateY: visible ? 0 : 500 }}
        transition={{ type: 'spring', damping: 22, stiffness: 250 }}
        style={[styles.sheet, { backgroundColor: colors.card }]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {title && (
          <Text variant="h3" style={styles.title}>
            {title}
          </Text>
        )}

        {children}
      </MotiView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.lg * 2,
    borderTopRightRadius: BorderRadius.lg * 2,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.md,
  },
});
