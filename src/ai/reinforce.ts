import type { GameState, GameAction, TerritoryId, AIDifficulty } from '../engine/types';
import { getContinentTerritories, getAdjacentIds, CONTINENT_BONUSES } from '../engine/board';
import { detectSets } from '../engine/cards';
import { CONTINENT_PRIORITY, getMissionDirective } from './evaluate';
import type { ContinentId } from '../constants/riskWorldTerritories';

/**
 * Pick the border territory most in need of reinforcement, taking the player's
 * mission directive into account.
 */
function bestReinforceTarget(state: GameState, playerId: string): TerritoryId {
  const owned = Object.values(state.territories).filter(t => t.owner === playerId);
  const directive = getMissionDirective(state, playerId);

  const scored = owned.map(t => {
    const id = t.id as TerritoryId;
    const adjEnemies = getAdjacentIds(id).filter(adj => {
      const a = state.territories[adj as TerritoryId];
      return a && a.owner !== null && a.owner !== playerId;
    });
    const isBorder = adjEnemies.length > 0;

    let score = (isBorder ? 10 : 0) - t.armies * 0.5;

    // ── Mission-specific scoring ──────────────────────────────────────────────
    if (directive) {
      switch (directive.type) {
        case 'destroy': {
          // Prefer borders adjacent to the target player's territories
          const adjacentToTarget = adjEnemies.some(
            adj => state.territories[adj as TerritoryId]?.owner === directive.targetPlayerId,
          );
          if (adjacentToTarget) score += 20;
          break;
        }
        case 'continents': {
          // Prefer territories inside or adjacent to mission-required continents
          for (const mc of directive.targets) {
            const cTerrs = getContinentTerritories(mc);
            if (cTerrs.includes(id)) { score += 15; break; }
            if (adjEnemies.some(adj => cTerrs.includes(adj as TerritoryId))) { score += 8; break; }
          }
          break;
        }
        case 'territories_with_armies': {
          // Prefer territories with exactly 1 army — bringing them to 2 advances the mission
          if (t.armies === 1 && isBorder) score += 20;
          else if (t.armies === 1) score += 10;
          break;
        }
        case 'territory_count':
          // Standard border reinforcement is fine — fall through to continent bonus below
          break;
      }
    }

    // ── Generic continent-progress bonus ──────────────────────────────────────
    if (!directive || directive.type === 'territory_count') {
      for (const c of CONTINENT_PRIORITY) {
        const cTerrs = getContinentTerritories(c);
        if (!cTerrs.includes(id)) continue;
        const ours = cTerrs.filter(x => state.territories[x as TerritoryId]?.owner === playerId).length;
        score += (ours / cTerrs.length) * (CONTINENT_BONUSES[c as ContinentId] ?? 0) * 2;
        break;
      }
    }

    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? (owned[0].id as TerritoryId);
}

/** Pick the most strategically placed territory for a +2 territory bonus. */
function bestBonusTarget(state: GameState, playerId: string, candidates: TerritoryId[]): TerritoryId {
  const directive = getMissionDirective(state, playerId);
  let best = candidates[0];
  let bestScore = -Infinity;

  for (const id of candidates) {
    const adjEnemies = getAdjacentIds(id).filter(adj => {
      const a = state.territories[adj as TerritoryId];
      return a && a.owner !== null && a.owner !== playerId;
    });
    let score = adjEnemies.length;
    if (directive?.type === 'destroy') {
      if (adjEnemies.some(adj => state.territories[adj as TerritoryId]?.owner === directive.targetPlayerId)) {
        score += 10;
      }
    }
    if (directive?.type === 'territories_with_armies') {
      // +2 armies here counts toward the "2 armies per territory" requirement
      score += 5;
    }
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

/** Return a card trade-in action if one is available (and appropriate for difficulty). */
function tryTrade(state: GameState, playerId: string, difficulty: AIDifficulty): GameAction | null {
  const player = state.players.find(p => p.id === playerId)!;

  const proactiveTrade =
    (difficulty === 'medium' && player.hand.length >= 4) ||
    (difficulty === 'hard' && player.hand.length >= 3);

  if (!state.mustTradeCards && !proactiveTrade) return null;

  const allSets = detectSets(player.hand);
  if (allSets.length === 0) return null;

  // Prefer sets that don't include the HQ card; fall back to any set if a trade is mandatory.
  const preferred = allSets.filter(set => !set.some(c => c.territoryId === player.hqTerritoryId));
  const sets = preferred.length > 0 ? preferred : (state.mustTradeCards ? allSets : []);
  if (sets.length === 0) return null;

  return { type: 'TRADE_IN_CARDS', cardIds: sets[0].map(c => c.id) as [string, string, string] };
}

/** Pick the next action for the REINFORCE phase. */
export function pickReinforceAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  // Territory bonus from a recent trade
  if (state.pendingTerritoryBonus) {
    const target = bestBonusTarget(state, playerId, state.pendingTerritoryBonus);
    return { type: 'CLAIM_TERRITORY_BONUS', territoryId: target };
  }

  const trade = tryTrade(state, playerId, difficulty);
  if (trade) return trade;

  if (state.reinforcementsRemaining === 0) return { type: 'END_REINFORCE' };

  const target = bestReinforceTarget(state, playerId);
  return { type: 'REINFORCE', territoryId: target, count: state.reinforcementsRemaining };
}
