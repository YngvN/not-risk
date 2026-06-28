import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { RiskCard, CardSymbol, GameAction } from '../../engine/types';
import { isValidSet, tradeInValue, detectSets } from '../../engine/cards';
import { TERRITORIES } from '../../constants/riskWorldTerritories';
import type { TranslationKey } from '../../locales';

// ── Symbol display helpers ───────────────────────────────────────────────────

const SYMBOL_LABEL: Record<CardSymbol, string> = {
  infantry:  'INF',
  cavalry:   'CAV',
  artillery: 'ART',
  wild:      'WILD',
};

function useSymbolColor(symbol: CardSymbol): string {
  const { colors } = useTheme();
  return {
    infantry:  colors.playerBlue,
    cavalry:   colors.playerGreen,
    artillery: colors.playerRed,
    wild:      colors.playerYellow,
  }[symbol];
}

function territoryLabel(card: RiskCard, t: (k: TranslationKey) => string): string {
  if (!card.territoryId) return t('game.cardWild');
  const terr = TERRITORIES.find(tr => tr.id === card.territoryId);
  return terr ? t(terr.labelKey) : card.territoryId;
}

// ── Card tile ────────────────────────────────────────────────────────────────

interface CardTileProps {
  card: RiskCard;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}

function CardTile({ card, selected, disabled, onPress }: CardTileProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const symbolColor = useSymbolColor(card.symbol);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled && !selected}
      style={[
        styles.tile,
        {
          backgroundColor: colors.card,
          borderColor: selected ? symbolColor : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: disabled && !selected ? 0.4 : 1,
        },
      ]}
    >
      {/* Symbol badge */}
      <View style={[styles.symbolBadge, { backgroundColor: symbolColor }]}>
        <Text variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 10 }}>
          {SYMBOL_LABEL[card.symbol]}
        </Text>
      </View>

      {/* Territory name */}
      <Text
        variant="caption"
        style={{ color: colors.text, textAlign: 'center', marginTop: Spacing.xs, fontSize: 11 }}
        numberOfLines={2}
      >
        {territoryLabel(card, t)}
      </Text>

      {/* Selection tick */}
      {selected && (
        <View style={[styles.tick, { backgroundColor: symbolColor }]}>
          <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

export interface CardHandModalProps {
  visible: boolean;
  hand: RiskCard[];
  setsTraded: number;
  onTrade: (cardIds: [string, string, string]) => void;
  onClose: () => void;
  /** When true, disables trading — used to let a human view their own hand during an AI turn. */
  readOnly?: boolean;
  /** Override the modal title (defaults to game.yourCards). */
  title?: string;
}

/**
 * Bottom-sheet modal that displays a player's Risk card hand.
 * Pass readOnly to disable trading (e.g. viewing during an opponent's turn).
 */
export function CardHandModal({ visible, hand, setsTraded, onTrade, onClose, readOnly, title }: CardHandModalProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);

  // Clear selection when the modal re-opens or hand changes
  React.useEffect(() => {
    if (visible) setSelected([]);
  }, [visible]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const selectedCards = hand.filter(c => selected.includes(c.id));
  const isValid =
    selectedCards.length === 3 &&
    isValidSet(selectedCards as [RiskCard, RiskCard, RiskCard]);

  const maxSelected = selected.length >= 3;
  const nextValue = tradeInValue(setsTraded);

  // Hint: show which sets exist if none selected yet
  const availableSets = detectSets(hand);
  const hasAnySets = availableSets.length > 0;

  const handleTrade = () => {
    if (!isValid) return;
    onTrade(selectedCards.map(c => c.id) as [string, string, string]);
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <MotiView
            from={{ translateY: 80, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text variant="h3" style={{ color: colors.text }}>
                  {title ?? t('game.yourCards')}
                </Text>
                <Text variant="caption" style={{ color: colors.textSecondary }}>
                  {t('game.cardCount').replace('{{n}}', String(hand.length))}
                  {!readOnly && `  ·  ${t('game.nextSetValue').replace('{{n}}', String(nextValue))}`}
                </Text>
              </View>
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
                <Text variant="body" style={{ color: colors.textSecondary }}>✕</Text>
              </Pressable>
            </View>

            {/* Instruction (hidden in read-only mode) */}
            {!readOnly && (
              <Text variant="caption" style={{ color: colors.textSecondary, marginBottom: Spacing.xs }}>
                {!hasAnySets
                  ? t('game.noValidSets')
                  : isValid
                    ? t('game.validSetSelected')
                    : t('game.selectToTrade')}
              </Text>
            )}

            {/* Card grid */}
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            >
              {hand.map(card => (
                <CardTile
                  key={card.id}
                  card={card}
                  selected={!readOnly && selected.includes(card.id)}
                  disabled={readOnly || maxSelected}
                  onPress={() => !readOnly && toggle(card.id)}
                />
              ))}
            </ScrollView>

            {/* Trade button — hidden in read-only mode */}
            {!readOnly && (
              <Pressable
                onPress={handleTrade}
                disabled={!isValid}
                style={[
                  styles.tradeBtn,
                  { backgroundColor: isValid ? colors.primary : colors.border },
                ]}
              >
                <Text variant="body" style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                  {isValid
                    ? t('game.tradeForArmies').replace('{{n}}', String(nextValue))
                    : t('game.selectToTrade')}
                </Text>
              </Pressable>
            )}
          </MotiView>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const TILE_SIZE = 80;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: Spacing.md,
    maxHeight: '75%',
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tile: {
    width: TILE_SIZE,
    minHeight: TILE_SIZE,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    alignItems: 'center',
    position: 'relative',
  },
  symbolBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  tick: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
});
