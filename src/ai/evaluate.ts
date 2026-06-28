import type { GameState, TerritoryId, PlayerId } from '../engine/types';
import {
  getContinentTerritories,
  getOwnedContinents,
  getAdjacentIds,
  CONTINENT_BONUSES,
} from '../engine/board';
import type { ContinentId } from '../constants/riskWorldTerritories';

/** Continent priority: easiest to hold first. */
export const CONTINENT_PRIORITY: ContinentId[] = ['au', 'sa', 'na', 'eu', 'af', 'as'];

const ALL_CONTINENTS: ContinentId[] = ['na', 'sa', 'eu', 'af', 'as', 'au'];

// ── Mission directive ─────────────────────────────────────────────────────────

/**
 * Describes the AI's mission-aware strategic goal for the current turn.
 * Derived once per decision point from the player's secret mission card.
 */
export type MissionDirective =
  | { type: 'continents'; targets: ContinentId[] }
  | { type: 'territory_count' }
  | { type: 'territories_with_armies' }
  | { type: 'destroy'; targetPlayerId: string };

/**
 * Returns a strategic directive derived from the player's secret mission, or
 * null if the player has no mission (classic/capital mode).
 */
export function getMissionDirective(state: GameState, playerId: PlayerId): MissionDirective | null {
  const player = state.players.find(p => p.id === playerId);
  if (!player?.mission) return null;

  const { mission } = player;

  switch (mission.type) {
    case 'TWO_CONTINENTS':
      return { type: 'continents', targets: [...mission.continents!] };

    case 'TWO_CONTINENTS_PLUS_ONE': {
      const required = [...mission.continents!] as ContinentId[];
      const ownedContinents = getOwnedContinents(state.territories, playerId);
      // Pick the easiest available third continent (highest completion fraction)
      const others = ALL_CONTINENTS.filter(c => !required.includes(c) && !ownedContinents.includes(c));
      let third: ContinentId = 'au';
      let bestFraction = -1;
      for (const c of others) {
        const total = getContinentTerritories(c).length;
        const mine = getContinentTerritories(c).filter(
          id => state.territories[id as TerritoryId]?.owner === playerId,
        ).length;
        const frac = mine / total;
        if (frac > bestFraction) { bestFraction = frac; third = c; }
      }
      return { type: 'continents', targets: [...required, third] };
    }

    case 'HOLD_24':
      return { type: 'territory_count' };

    case 'HOLD_18_TWO_ARMIES':
      return { type: 'territories_with_armies' };

    case 'DESTROY_PLAYER': {
      const target = state.players.find(p => p.color === mission.targetColor);
      if (!target) return null;
      // "Destroy yourself" rule: fall back to territory count
      if (target.id === playerId) return { type: 'territory_count' };
      // Target already eliminated — mission may be satisfied next turn; keep expanding
      if (!target.alive) return { type: 'territory_count' };
      return { type: 'destroy', targetPlayerId: target.id };
    }
  }
}

// ── Continent targeting ───────────────────────────────────────────────────────

/**
 * Returns the single continent the AI should push toward this turn.
 * Mission-aware: prefers continents required by the player's secret mission,
 * picking whichever incomplete mission continent has the highest completion %.
 * Falls back to priority-weighted scoring when no mission applies.
 */
export function targetContinent(state: GameState, playerId: PlayerId): ContinentId {
  const ownedContinents = getOwnedContinents(state.territories, playerId);
  const directive = getMissionDirective(state, playerId);

  if (directive?.type === 'continents') {
    const incomplete = directive.targets.filter(c => !ownedContinents.includes(c));
    if (incomplete.length > 0) {
      // Pick the mission continent with the most progress
      return incomplete.reduce((best, c) => {
        const bestFrac = getContinentTerritories(best).filter(
          id => state.territories[id as TerritoryId]?.owner === playerId,
        ).length / getContinentTerritories(best).length;
        const cFrac = getContinentTerritories(c).filter(
          id => state.territories[id as TerritoryId]?.owner === playerId,
        ).length / getContinentTerritories(c).length;
        return cFrac >= bestFrac ? c : best;
      });
    }
  }

  // Default: score by (completion fraction + base weight) × continent bonus weight
  const WEIGHTS: Record<ContinentId, number> = { au: 3, sa: 2.5, na: 2, af: 1.8, eu: 1.5, as: 1 };
  let best: ContinentId = 'au';
  let bestScore = -1;
  for (const c of ALL_CONTINENTS) {
    if (ownedContinents.includes(c)) continue;
    const total = getContinentTerritories(c).length;
    const mine = getContinentTerritories(c).filter(
      id => state.territories[id as TerritoryId]?.owner === playerId,
    ).length;
    const score = (mine / total + 0.1) * WEIGHTS[c];
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

// ── Board evaluation ──────────────────────────────────────────────────────────

/** Score the board position for playerId. Higher = better for that player. */
export function evaluate(state: GameState, playerId: string): number {
  let score = 0;

  const owned = Object.values(state.territories).filter(t => t.owner === playerId);

  score += owned.length * 2;
  score += owned.reduce((s, t) => s + t.armies, 0) * 0.3;

  const ownedContinents = getOwnedContinents(state.territories, playerId);
  for (const c of ownedContinents) {
    score += CONTINENT_BONUSES[c] * 6;
  }

  for (const c of CONTINENT_PRIORITY) {
    const total = getContinentTerritories(c).length;
    const controlled = getContinentTerritories(c).filter(
      id => state.territories[id as TerritoryId]?.owner === playerId,
    ).length;
    if (controlled > 0 && controlled < total) {
      score += (controlled / total) * CONTINENT_BONUSES[c] * 3;
    }
  }

  const exposed = owned.filter(t =>
    getAdjacentIds(t.id as TerritoryId).some(adj => {
      const a = state.territories[adj as TerritoryId];
      return a && a.owner !== playerId;
    }),
  ).length;
  score -= exposed * 0.5;

  const player = state.players.find(p => p.id === playerId);
  score += (player?.hand.length ?? 0) * 0.5;

  return score;
}
