import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { Spacing, BorderRadius } from '../../constants/spacing';
import type { GameEvent, Player, TerritoryId } from '../../engine/types';
import { TERRITORIES } from '../../constants/riskWorldTerritories';
import { PLAYER_COLOR_HEX } from '../../context/GameContext';
import type { TranslationKey } from '../../locales';

// ── Event formatting ─────────────────────────────────────────────────────────

function terrName(id: TerritoryId, t: (k: TranslationKey) => string): string {
  const terr = TERRITORIES.find(tr => tr.id === id);
  return terr ? t(terr.labelKey) : id;
}

interface Parsed {
  text: string;
  territories: TerritoryId[];
}

function parseEvent(
  event: GameEvent,
  players: Player[],
  t: (k: TranslationKey) => string,
): Parsed | null {
  const actor = players.find(p => p.id === event.actorId);
  const name = actor?.name ?? '?';
  const tn = (id: TerritoryId) => terrName(id, t);

  switch (event.type) {
    case 'TURN_ENDED':
    case 'TERRITORY_CLAIMED':
      return null;

    case 'ARMY_PLACED': {
      if (event.payload.phase === 'SETUP') return null;
      const tid = event.payload.territoryId as TerritoryId;
      const count = (event.payload.count as number) ?? 1;
      return { text: `${name}  +${count} → ${tn(tid)}`, territories: [tid] };
    }

    case 'CARDS_TRADED':
      return { text: `${name} traded cards (+${event.payload.armies} armies)`, territories: [] };

    case 'TERRITORY_BONUS_CLAIMED': {
      const tid = event.payload.territoryId as TerritoryId;
      return { text: `${name}  +2 bonus → ${tn(tid)}`, territories: [tid] };
    }

    case 'ATTACK_RESOLVED': {
      const from = event.payload.from as TerritoryId;
      const to = event.payload.to as TerritoryId;
      const captured = event.payload.captured as boolean;
      const atk = (event.payload.attackerDiceValues as number[])?.join(',') ?? '';
      const def = (event.payload.defenderDiceValues as number[])?.join(',') ?? '';
      return {
        text: `${name}: ${tn(from)} → ${tn(to)}  [${atk} vs ${def}]${captured ? '  ✓' : ''}`,
        territories: [from, to],
      };
    }

    case 'TERRITORY_CAPTURED': {
      const from = event.payload.from as TerritoryId;
      const to = event.payload.to as TerritoryId;
      const prevOwner = players.find(p => p.id === event.payload.previousOwner);
      return {
        text: `${name} seized ${tn(to)}${prevOwner ? ` from ${prevOwner.name}` : ''}`,
        territories: [from, to],
      };
    }

    case 'PLAYER_ELIMINATED': {
      const victim = players.find(p => p.id === event.payload.eliminatedId);
      return { text: `${name} eliminated ${victim?.name ?? '?'}!`, territories: [] };
    }

    case 'CARD_DRAWN':
      return { text: `${name} drew a card`, territories: [] };

    case 'ARMIES_FORTIFIED': {
      const from = event.payload.from as TerritoryId;
      const to = event.payload.to as TerritoryId;
      return {
        text: `${name} moved ${event.payload.armies}  ${tn(from)} → ${tn(to)}`,
        territories: [from, to],
      };
    }

    case 'HQ_CAPTURED': {
      const target = players.find(p => p.id === event.payload.target);
      return {
        text: `${name} captured ${target?.name ?? '?'}'s HQ!`,
        territories: [event.payload.territory as TerritoryId],
      };
    }

    case 'GAME_OVER': {
      const winner = players.find(p => p.id === event.payload.winner);
      return { text: `${winner?.name ?? name} wins!`, territories: [] };
    }

    default:
      return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export interface EventLogProps {
  events: GameEvent[];
  players: Player[];
  selectedEventId: string | null;
  onSelect: (eventId: string | null, territoryIds: TerritoryId[]) => void;
}

/**
 * Scrollable game history. Entries with territory associations show a map-pin
 * indicator and highlight those territories on the board when tapped.
 */
export function EventLog({ events, players, selectedEventId, onSelect }: EventLogProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const items = [...events]
    .reverse()
    .map(event => {
      const parsed = parseEvent(event, players, t);
      return parsed ? { event, ...parsed } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 80);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" style={{ color: colors.textSecondary, textAlign: 'center' }}>
          {t('game.eventLogEmpty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map(({ event, text, territories }) => {
        const actor = players.find(p => p.id === event.actorId);
        const isSelected = selectedEventId === event.id;
        const hasPin = territories.length > 0;

        return (
          <Pressable
            key={event.id}
            onPress={() => isSelected ? onSelect(null, []) : onSelect(event.id, territories)}
            style={[
              styles.entry,
              {
                backgroundColor: isSelected ? colors.primary + '1A' : 'transparent',
                borderColor: isSelected ? colors.primary : 'transparent',
              },
            ]}
          >
            {actor ? (
              <View style={[styles.dot, { backgroundColor: PLAYER_COLOR_HEX[actor.color] }]} />
            ) : (
              <View style={styles.dotPlaceholder} />
            )}
            <Text
              variant="caption"
              style={{ flex: 1, color: isSelected ? colors.text : colors.textSecondary, fontWeight: isSelected ? '600' : '400', lineHeight: 16 }}
              numberOfLines={3}
            >
              {text}
            </Text>
            {hasPin && (
              <Text style={{ fontSize: 10, color: isSelected ? colors.primary : colors.border }}>⌖</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty:  { padding: Spacing.md, alignItems: 'center' },
  list:   { paddingVertical: Spacing.xs },
  entry:  {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginHorizontal: Spacing.xs,
    marginBottom: 2,
  },
  dot:              { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  dotPlaceholder:   { width: 7, flexShrink: 0 },
});
