import type { MissionCard, MissionType, PlayerColor, Player, PlayerId, GameState } from './types';
import type { ContinentId } from '../constants/riskWorldTerritories';
import { getOwnedContinents, getTerritoryCount } from './board';

// ── The 12 mission cards ──────────────────────────────────────────────────────

/** Six territory/conquest missions. */
const CONQUEST_MISSIONS: MissionCard[] = [
  { id: 'm_na_eu',    type: 'TWO_CONTINENTS',          continents: ['na', 'eu'] },
  { id: 'm_na_au',    type: 'TWO_CONTINENTS',          continents: ['na', 'au'] },
  { id: 'm_as_af',    type: 'TWO_CONTINENTS',          continents: ['as', 'af'] },
  { id: 'm_as_sa',    type: 'TWO_CONTINENTS',          continents: ['as', 'sa'] },
  { id: 'm_eu_sa_x',  type: 'TWO_CONTINENTS_PLUS_ONE', continents: ['eu', 'sa'] },
  { id: 'm_eu_au_x',  type: 'TWO_CONTINENTS_PLUS_ONE', continents: ['eu', 'au'] },
];

/** One destroy mission per player color (6 total). */
const DESTROY_MISSIONS: MissionCard[] = (
  ['red', 'blue', 'green', 'yellow', 'black', 'pink'] as PlayerColor[]
).map(color => ({ id: `m_destroy_${color}`, type: 'DESTROY_PLAYER' as MissionType, targetColor: color }));

/** All 12 mission cards. */
export const MISSION_CARDS: MissionCard[] = [...CONQUEST_MISSIONS, ...DESTROY_MISSIONS];

// ── Dealing ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deals one mission card face-down to each player.
 * Destroy missions for colors not in play are removed first (E7.1).
 * If a player would receive their own color's destroy mission, they get the
 * next available card instead (the "destroy yourself" card goes back).
 */
export function dealMissions(players: Player[]): Player[] {
  const inPlayColors = new Set(players.map(p => p.color));

  const eligible = shuffle(
    MISSION_CARDS.filter(m =>
      m.type !== 'DESTROY_PLAYER' || inPlayColors.has(m.targetColor!),
    ),
  );

  return players.map((player, i) => {
    // Find first card that isn't "destroy yourself"
    const idx = eligible.findIndex(
      m => !(m.type === 'DESTROY_PLAYER' && m.targetColor === player.color),
    );
    const mission = idx >= 0 ? eligible.splice(idx, 1)[0] : eligible.shift()!;
    return { ...player, mission: mission ?? null };
  });
}

// ── Predicate evaluation ──────────────────────────────────────────────────────

/**
 * Returns true if `playerId` has completed their secret mission.
 * Pure function — evaluates against the current game state snapshot.
 */
export function checkMission(
  playerId: PlayerId,
  mission: MissionCard,
  state: GameState,
): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.alive) return false;

  switch (mission.type) {
    case 'TWO_CONTINENTS': {
      const owned = getOwnedContinents(state.territories, playerId);
      const [c1, c2] = mission.continents!;
      return owned.includes(c1) && owned.includes(c2);
    }

    case 'TWO_CONTINENTS_PLUS_ONE': {
      const owned = getOwnedContinents(state.territories, playerId);
      const [c1, c2] = mission.continents!;
      return owned.includes(c1) && owned.includes(c2) && owned.length >= 3;
    }

    case 'HOLD_24':
      return getTerritoryCount(state.territories, playerId) >= 24;

    case 'HOLD_18_TWO_ARMIES': {
      const qualifying = Object.values(state.territories).filter(
        t => t.owner === playerId && t.armies >= 2,
      );
      return qualifying.length >= 18;
    }

    case 'DESTROY_PLAYER': {
      const target = state.players.find(p => p.color === mission.targetColor);
      if (!target) return false;
      // If the holder IS the target color, substitute: must hold 24 territories
      if (target.id === playerId) {
        return getTerritoryCount(state.territories, playerId) >= 24;
      }
      return !target.alive;
    }
  }
}

// ── Display label ─────────────────────────────────────────────────────────────

const CONTINENT_NAMES: Record<ContinentId, string> = {
  na: 'North America', sa: 'South America', eu: 'Europe',
  af: 'Africa', as: 'Asia', au: 'Australia',
};

/** Human-readable mission description (English). Used for display and reveal. */
export function missionDescription(mission: MissionCard): string {
  switch (mission.type) {
    case 'TWO_CONTINENTS': {
      const [c1, c2] = mission.continents!;
      return `Conquer ${CONTINENT_NAMES[c1]} and ${CONTINENT_NAMES[c2]}`;
    }
    case 'TWO_CONTINENTS_PLUS_ONE': {
      const [c1, c2] = mission.continents!;
      return `Conquer ${CONTINENT_NAMES[c1]}, ${CONTINENT_NAMES[c2]}, and any one more continent`;
    }
    case 'HOLD_24':
      return 'Conquer 24 territories';
    case 'HOLD_18_TWO_ARMIES':
      return 'Occupy 18 territories, each with at least 2 armies';
    case 'DESTROY_PLAYER':
      return `Destroy all of ${mission.targetColor}'s armies`;
  }
}
