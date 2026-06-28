import type { GameState, GameAction, TerritoryId, AIDifficulty } from '../engine/types';
import { getContinentTerritories, getAdjacentIds, CONTINENT_BONUSES } from '../engine/board';
import { detectSets } from '../engine/cards';
import { CONTINENT_PRIORITY } from './evaluate';
import type { ContinentId } from '../constants/riskWorldTerritories';

/** Pick the border territory most in need of reinforcement. */
function bestReinforceTarget(state: GameState, playerId: string): TerritoryId {
  const owned = Object.values(state.territories).filter(t => t.owner === playerId);

  const scored = owned.map(t => {
    const id = t.id as TerritoryId;
    const adjEnemies = getAdjacentIds(id).filter(adj => {
      const a = state.territories[adj as TerritoryId];
      return a && a.owner !== null && a.owner !== playerId;
    });
    const isBorder = adjEnemies.length > 0;

    let continentBonus = 0;
    for (const c of CONTINENT_PRIORITY) {
      const cTerrs = getContinentTerritories(c);
      if (!cTerrs.includes(id)) continue;
      const ours = cTerrs.filter(x => state.territories[x as TerritoryId]?.owner === playerId).length;
      continentBonus = (ours / cTerrs.length) * (CONTINENT_BONUSES[c as ContinentId] ?? 0) * 2;
      break;
    }

    const score = (isBorder ? 10 : 0) + continentBonus - t.armies * 0.5;
    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? (owned[0].id as TerritoryId);
}

/** Pick the most strategically placed territory for a +2 territory bonus. */
function bestBonusTarget(state: GameState, playerId: string, candidates: TerritoryId[]): TerritoryId {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const id of candidates) {
    const adjEnemies = getAdjacentIds(id).filter(adj => {
      const a = state.territories[adj as TerritoryId];
      return a && a.owner !== null && a.owner !== playerId;
    }).length;
    const score = adjEnemies;
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

  const sets = detectSets(player.hand).filter(set =>
    !set.some(c => c.territoryId === player.hqTerritoryId),
  );
  if (sets.length === 0) return null;

  return { type: 'TRADE_IN_CARDS', cardIds: sets[0].map(c => c.id) as [string, string, string] };
}

/** Pick the next action for the REINFORCE phase. */
export function pickReinforceAction(
  state: GameState,
  playerId: string,
  difficulty: AIDifficulty,
): GameAction {
  // Territory bonus from a recent trade — pick the most exposed border territory
  if (state.pendingTerritoryBonus) {
    const target = bestBonusTarget(state, playerId, state.pendingTerritoryBonus);
    return { type: 'CLAIM_TERRITORY_BONUS', territoryId: target };
  }

  const trade = tryTrade(state, playerId, difficulty);
  if (trade) return trade;

  if (state.reinforcementsRemaining === 0) return { type: 'END_REINFORCE' };

  // Easy: random border territory. Medium/Hard: best territory on attack axis.
  const target = bestReinforceTarget(state, playerId);
  return { type: 'REINFORCE', territoryId: target, count: state.reinforcementsRemaining };
}
