import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { Modal } from '../ui/Modal';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useGame } from '../../context/GameContext';

const FAB_SIZE = 52;
const MARGIN   = 16;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabDef {
  path: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
  labelKey: Parameters<ReturnType<typeof useLanguage>['t']>[0];
}

const TABS: TabDef[] = [
  { path: '/',         icon: 'home-outline',            activeIcon: 'home',            labelKey: 'home.title'    },
  { path: '/game',     icon: 'game-controller-outline', activeIcon: 'game-controller', labelKey: 'game.tabLabel' },
  { path: '/lobby',    icon: 'wifi-outline',            activeIcon: 'wifi',            labelKey: 'lobby.tabLabel'},
  { path: '/settings', icon: 'settings-outline',        activeIcon: 'settings',        labelKey: 'settings.title'},
];

/**
 * Floating 3-dot navigation button.
 * Tapping opens a panel that slides in from the bottom; tapping again or
 * selecting a tab slides the panel back out.
 *
 * When a game is active, the Game row shows an ✕ button. Tapping it opens
 * a confirmation modal before calling resetGame().
 */
export function FloatingTabBar() {
  const [open, setOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t }      = useLanguage();
  const { state, resetGame } = useGame();

  const isHome    = pathname === '/' || pathname === '';
  const isInGame  = pathname.startsWith('/game');
  const hasGame   = state !== null;

  if (isHome) return null;

  const fabBottom   = insets.bottom + MARGIN;
  const fabTop      = insets.top + MARGIN;
  const panelBottom = fabBottom + FAB_SIZE + MARGIN;
  const panelTop    = fabTop + FAB_SIZE + MARGIN;

  const navigate = (path: string) => {
    setOpen(false);
    router.navigate(path as never);
  };

  const handleExitConfirm = () => {
    setConfirmExit(false);
    setOpen(false);
    resetGame();
    router.navigate('/' as never);
  };

  return (
    <>
      {/* Dim backdrop */}
      <AnimatePresence>
        {open && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          </MotiView>
        )}
      </AnimatePresence>

      {/* Nav panel — slides up from bottom or down from top depending on FAB position */}
      <AnimatePresence>
        {open && (
          <MotiView
            from={{ translateY: isInGame ? -320 : 320 }}
            animate={{ translateY: 0 }}
            exit={{ translateY: isInGame ? -420 : 420 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            style={[
              styles.panel,
              isInGame
                ? { top: panelTop, left: MARGIN }
                : { bottom: panelBottom, left: MARGIN },
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {TABS.map(tab => {
              const isActive = tab.path === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(tab.path);
              const isGame = tab.path === '/game';

              return (
                <Pressable
                  key={tab.path}
                  onPress={() => navigate(tab.path)}
                  style={[styles.item, isActive && { backgroundColor: colors.primary + '18' }]}
                >
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={20}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    variant="body"
                    style={{ color: isActive ? colors.primary : colors.text, fontWeight: isActive ? '700' : '400', flex: 1 }}
                  >
                    {t(tab.labelKey)}
                  </Text>

                  {/* Exit button — only on the Game row when a game is active */}
                  {isGame && hasGame && (
                    <Pressable
                      onPress={e => { e.stopPropagation?.(); setConfirmExit(true); }}
                      hitSlop={8}
                      style={[styles.exitBtn, { backgroundColor: colors.error + '22' }]}
                    >
                      <Ionicons name="close" size={14} color={colors.error} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </MotiView>
        )}
      </AnimatePresence>

      {/* FAB — top-left in-game, bottom-left elsewhere */}
      <Pressable
        onPress={() => setOpen(v => !v)}
        style={[
          styles.fab,
          isInGame ? { top: fabTop, left: MARGIN } : { bottom: fabBottom, left: MARGIN },
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Ionicons name={open ? 'close' : 'ellipsis-horizontal'} size={22} color={colors.text} />
      </Pressable>

      {/* Exit-game confirmation */}
      <Modal visible={confirmExit} onClose={() => setConfirmExit(false)}>
        <View style={styles.confirm}>
          <Text variant="h3" style={{ color: colors.text, textAlign: 'center' }}>
            {t('nav.exitGameTitle')}
          </Text>
          <View style={styles.confirmBtns}>
            <Pressable
              onPress={() => setConfirmExit(false)}
              style={[styles.confirmBtn, { backgroundColor: colors.error }]}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handleExitConfirm}
              style={[styles.confirmBtn, { backgroundColor: colors.success }]}
            >
              <Ionicons name="checkmark" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 100,
  },
  panel: {
    position: 'absolute',
    zIndex: 101,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  exitBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    zIndex: 102,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  confirm: {
    gap: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 20,
  },
  confirmBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
