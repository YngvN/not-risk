import type { MissionCard, MissionType, PlayerColor, Player, PlayerId, GameState } from './types';
import type { ContinentId } from '../constants/riskWorldTerritories';
import { getOwnedContinents, getTerritoryCount, getContinentTerritories } from './board';

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

// ── Progress helpers ──────────────────────────────────────────────────────────

/** 0–1 fraction of a continent's territories owned by the player. */
function continentFraction(state: GameState, playerId: PlayerId, continent: ContinentId): number {
  const ids = getContinentTerritories(continent);
  if (ids.length === 0) return 0;
  const owned = ids.filter(id => state.territories[id]?.owner === playerId).length;
  return owned / ids.length;
}

const ALL_CONTINENTS: ContinentId[] = ['na', 'sa', 'eu', 'af', 'as', 'au'];

// ── Progress (0–1) ───────────────────────────────────────────────────────────

/**
 * Returns a 0–1 float representing how close a player is to completing
 * their secret mission. Used for the testing inspector overlay.
 *
 * Continent missions use territory-level granularity so partial ownership
 * (e.g. 8/9 territories in North America) shows meaningful progress.
 */
export function missionProgress(
  playerId: PlayerId,
  mission: MissionCard,
  state: GameState,
): number {
  const player = state.players.find(p => p.id === playerId);
  if (!player || !player.alive) return 0;

  switch (mission.type) {
    case 'TWO_CONTINENTS': {
      const [c1, c2] = mission.continents!;
      const p1 = continentFraction(state, playerId, c1);
      const p2 = continentFraction(state, playerId, c2);
      return (p1 + p2) / 2;
    }

    case 'TWO_CONTINENTS_PLUS_ONE': {
      const [c1, c2] = mission.continents!;
      const p1 = continentFraction(state, playerId, c1);
      const p2 = continentFraction(state, playerId, c2);
      // Best third continent (any other than c1/c2)
      const others = ALL_CONTINENTS.filter(c => c !== c1 && c !== c2);
      const p3 = Math.max(...others.map(c => continentFraction(state, playerId, c)));
      return (p1 + p2 + p3) / 3;
    }

    case 'HOLD_24':
      return Math.min(getTerritoryCount(state.territories, playerId) / 24, 1);

    case 'HOLD_18_TWO_ARMIES': {
      const qualifying = Object.values(state.territories).filter(
        t => t.owner === playerId && t.armies >= 2,
      ).length;
      return Math.min(qualifying / 18, 1);
    }

    case 'DESTROY_PLAYER': {
      const target = state.players.find(p => p.color === mission.targetColor);
      if (!target) return 1;
      if (target.id === playerId) {
        return Math.min(getTerritoryCount(state.territories, playerId) / 24, 1);
      }
      if (!target.alive) return 1;
      // Proxy: fraction of the 42 territories the target has already lost
      const targetOwned = getTerritoryCount(state.territories, target.id);
      return Math.max(0, 1 - targetOwned / 42);
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
