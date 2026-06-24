import type { GameState, GameAction, Player, TerritoryState, PlayerId } from './types';
import type { TerritoryId } from '../constants/riskWorldTerritories';
import { areAdjacent, getTerritoryCount, getConnectedOwned } from './board';
import { battle } from './combat';
import { drawCard, tradeInValue, isValidSet, detectSets } from './cards';
import { calcReinforcements } from './reinforcement';
import { autoPlaceArmies } from './setup';
import { ClassicConquestVictory, type VictoryCondition } from './victory';

// ── Helpers ──────────────────────────────────────────────────────────────────

function patch(
  territories: GameState['territories'],
  updates: Partial<Record<TerritoryId, Partial<TerritoryState>>>,
): GameState['territories'] {
  const next = { ...territories };
  for (const [id, delta] of Object.entries(updates) as [TerritoryId, Partial<TerritoryState>][]) {
    next[id] = { ...next[id], ...delta };
  }
  return next;
}

function alivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.alive);
}

function nextAlivePayer(state: GameState): Player {
  const alive = alivePlayers(state);
  const idx = alive.findIndex(p => p.id === state.activePlayerId);
  return alive[(idx + 1) % alive.length];
}

/** Find the next player who still has setup armies, cycling from current. */
function nextSetupPlayer(
  currentId: PlayerId,
  players: Player[],
  setupArmiesRemaining: Record<PlayerId, number>,
): PlayerId | null {
  const alive = players.filter(p => p.alive);
  const idx = alive.findIndex(p => p.id === currentId);
  for (let i = 1; i <= alive.length; i++) {
    const candidate = alive[(idx + i) % alive.length];
    if ((setupArmiesRemaining[candidate.id] ?? 0) > 0) return candidate.id;
  }
  return null;
}

const VICTORY: Record<GameState['mode'], VictoryCondition> = {
  classic: new ClassicConquestVictory(),
  mission: new ClassicConquestVictory(), // placeholder — E7 adds real logic
  capital: new ClassicConquestVictory(), // placeholder — E8 adds real logic
};

function checkVictory(state: GameState): GameState {
  const winner = VICTORY[state.mode].check(state);
  if (winner) return { ...state, phase: 'GAME_OVER', winner };
  return state;
}

/** Advance to the next player's reinforcement phase after a fortify/skip. */
function endTurn(state: GameState): GameState {
  const next = nextAlivePayer(state);
  const reinforcements = calcReinforcements(next.id, state);
  const nextPlayer = state.players.find(p => p.id === next.id)!;
  const mustTrade = nextPlayer.hand.length >= 5;
  return {
    ...state,
    phase: 'REINFORCE',
    activePlayerId: next.id,
    reinforcementsRemaining: reinforcements,
    capturedThisTurn: false,
    lastBattleResult: null,
    mustTradeCards: mustTrade,
  };
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/** Pure reducer: applies a GameAction to a GameState and returns the next state. */
export function dispatch(action: GameAction, state: GameState): GameState {
  switch (action.type) {

    // ── SETUP: CLAIMING ──────────────────────────────────────────────────────

    case 'CLAIM_TERRITORY': {
      if (state.phase !== 'SETUP' || state.setupSubPhase !== 'CLAIMING') return state;
      const territory = state.territories[action.territoryId];
      if (territory.owner !== null) return state;

      const territories = patch(state.territories, {
        [action.territoryId]: { owner: state.activePlayerId, armies: 1 },
      });
      const setupArmiesRemaining = {
        ...state.setupArmiesRemaining,
        [state.activePlayerId]: state.setupArmiesRemaining[state.activePlayerId] - 1,
      };

      const unclaimed = Object.values(territories).filter(t => t.owner === null).length;
      if (unclaimed === 0) {
        if (state.randomPlacement) {
          const placed = autoPlaceArmies(territories, state.players, setupArmiesRemaining);
          const firstPlayer = alivePlayers(state)[0];
          const reinforcements = calcReinforcements(firstPlayer.id, { ...state, territories: placed });
          return {
            ...state,
            territories: placed,
            setupArmiesRemaining: Object.fromEntries(state.players.map(p => [p.id, 0])),
            phase: 'REINFORCE',
            activePlayerId: firstPlayer.id,
            reinforcementsRemaining: reinforcements,
            mustTradeCards: false,
          };
        }
        return {
          ...state,
          territories,
          setupArmiesRemaining,
          setupSubPhase: 'PLACING',
          activePlayerId: alivePlayers(state)[0].id,
        };
      }

      const next = nextAlivePayer({ ...state, territories, setupArmiesRemaining });
      return { ...state, territories, setupArmiesRemaining, activePlayerId: next.id };
    }

    // ── SETUP: PLACING ───────────────────────────────────────────────────────

    case 'PLACE_SETUP_ARMY': {
      if (state.phase !== 'SETUP' || state.setupSubPhase !== 'PLACING') return state;
      const territory = state.territories[action.territoryId];
      if (territory.owner !== state.activePlayerId) return state;
      if ((state.setupArmiesRemaining[state.activePlayerId] ?? 0) <= 0) return state;

      const territories = patch(state.territories, {
        [action.territoryId]: { armies: territory.armies + 1 },
      });
      const setupArmiesRemaining = {
        ...state.setupArmiesRemaining,
        [state.activePlayerId]: state.setupArmiesRemaining[state.activePlayerId] - 1,
      };

      const nextId = nextSetupPlayer(state.activePlayerId, state.players, setupArmiesRemaining);
      if (nextId === null) {
        // All players done placing — start first player's reinforce turn
        const firstPlayer = alivePlayers(state)[0];
        const reinforcements = calcReinforcements(firstPlayer.id, { ...state, territories });
        const mustTrade = firstPlayer.hand.length >= 5;
        return {
          ...state,
          territories,
          setupArmiesRemaining,
          phase: 'REINFORCE',
          activePlayerId: firstPlayer.id,
          reinforcementsRemaining: reinforcements,
          mustTradeCards: mustTrade,
        };
      }

      return { ...state, territories, setupArmiesRemaining, activePlayerId: nextId };
    }

    // ── REINFORCE ────────────────────────────────────────────────────────────

    case 'TRADE_IN_CARDS': {
      if (state.phase !== 'REINFORCE' && !state.mustTradeCards) return state;
      if (state.pendingTerritoryBonus) return state;
      const activePlayer = state.players.find(p => p.id === state.activePlayerId)!;
      const cardIdSet = new Set(action.cardIds);
      const selected = activePlayer.hand.filter(c => cardIdSet.has(c.id));
      if (selected.length !== 3) return state;
      const triple: [typeof selected[0], typeof selected[0], typeof selected[0]] =
        [selected[0], selected[1], selected[2]];
      if (!isValidSet(triple)) return state;

      const armies = tradeInValue(state.setsTraded);
      const newHand = activePlayer.hand.filter(c => !cardIdSet.has(c.id));
      const players = state.players.map(p =>
        p.id === state.activePlayerId ? { ...p, hand: newHand } : p,
      );
      const stillMustTrade = newHand.length >= 5;

      // E5.4 — territory-match bonus: +2 armies on one owned territory pictured in the set
      const matches = [...new Set(
        selected
          .filter(c => c.territoryId !== null)
          .map(c => c.territoryId!)
          .filter(id => state.territories[id]?.owner === state.activePlayerId),
      )];

      let territories = state.territories;
      let pendingTerritoryBonus: TerritoryId[] | null = null;

      if (matches.length === 1) {
        // Auto-apply — no choice needed
        territories = patch(state.territories, { [matches[0]]: { armies: state.territories[matches[0]].armies + 2 } });
      } else if (matches.length > 1) {
        // Let the player choose which territory gets the +2
        pendingTerritoryBonus = matches;
      }

      return {
        ...state,
        players,
        territories,
        discardPile: [...state.discardPile, ...selected],
        setsTraded: state.setsTraded + 1,
        reinforcementsRemaining: state.reinforcementsRemaining + armies,
        mustTradeCards: stillMustTrade,
        pendingTerritoryBonus,
      };
    }

    case 'CLAIM_TERRITORY_BONUS': {
      if (!state.pendingTerritoryBonus) return state;
      if (!state.pendingTerritoryBonus.includes(action.territoryId)) return state;
      if (state.territories[action.territoryId]?.owner !== state.activePlayerId) return state;
      const territories = patch(state.territories, {
        [action.territoryId]: { armies: state.territories[action.territoryId].armies + 2 },
      });
      return { ...state, territories, pendingTerritoryBonus: null };
    }

    case 'REINFORCE': {
      if (state.phase !== 'REINFORCE') return state;
      if (state.mustTradeCards || state.pendingTerritoryBonus) return state;
      const territory = state.territories[action.territoryId];
      if (territory.owner !== state.activePlayerId) return state;
      if (action.count <= 0 || action.count > state.reinforcementsRemaining) return state;

      const territories = patch(state.territories, {
        [action.territoryId]: { armies: territory.armies + action.count },
      });
      return { ...state, territories, reinforcementsRemaining: state.reinforcementsRemaining - action.count };
    }

    case 'END_REINFORCE': {
      if (state.phase !== 'REINFORCE') return state;
      if (state.reinforcementsRemaining > 0) return state;
      if (state.mustTradeCards || state.pendingTerritoryBonus) return state;
      return { ...state, phase: 'ATTACK', lastBattleResult: null };
    }

    // ── ATTACK ───────────────────────────────────────────────────────────────

    case 'ATTACK': {
      if (state.phase !== 'ATTACK') return state;
      if (state.captureContext !== null) return state;

      const { from, to, attackerDice } = action;
      const fromT = state.territories[from];
      const toT = state.territories[to];

      if (fromT.owner !== state.activePlayerId) return state;
      if (toT.owner === state.activePlayerId || toT.owner === null) return state;
      if (!areAdjacent(from, to)) return state;
      if (fromT.armies < 2) return state;
      if (attackerDice < 1 || attackerDice > 3) return state;
      if (attackerDice > fromT.armies - 1) return state;

      const defenderDiceCount = Math.min(2, toT.armies);
      const result = battle(attackerDice, defenderDiceCount);

      const newAttackerArmies = fromT.armies - result.attackerLosses;
      const newDefenderArmies = toT.armies - result.defenderLosses;
      const captured = newDefenderArmies <= 0;
      const battleResult = { ...result, captured };

      const territories = patch(state.territories, {
        [from]: { armies: newAttackerArmies },
        [to]: { armies: Math.max(0, newDefenderArmies) },
      });

      const captureContext = captured
        ? {
            from,
            to,
            minArmies: Math.min(attackerDice, newAttackerArmies - 1),
            maxArmies: newAttackerArmies - 1,
          }
        : null;

      return { ...state, territories, lastBattleResult: battleResult, captureContext };
    }

    case 'OCCUPY': {
      if (state.phase !== 'ATTACK' || !state.captureContext) return state;
      const { from, to, minArmies, maxArmies } = state.captureContext;
      const armies = Math.max(minArmies, Math.min(maxArmies, action.armies));

      const previousOwner = state.territories[to].owner;
      const territories = patch(state.territories, {
        [from]: { armies: state.territories[from].armies - armies },
        [to]: { owner: state.activePlayerId, armies },
      });

      // Check for elimination
      let players = state.players;
      if (previousOwner) {
        const remaining = Object.values(territories).filter(t => t.owner === previousOwner).length;
        if (remaining === 0) {
          const eliminated = state.players.find(p => p.id === previousOwner)!;
          const inheritedCards = [...eliminated.hand];
          players = state.players.map(p => {
            if (p.id === previousOwner) return { ...p, alive: false, hand: [] };
            if (p.id === state.activePlayerId) return { ...p, hand: [...p.hand, ...inheritedCards] };
            return p;
          });
        }
      }

      const activePlayer = players.find(p => p.id === state.activePlayerId)!;
      const mustTrade = activePlayer.hand.length >= 6;

      let newState = { ...state, territories, players, captureContext: null, capturedThisTurn: true, mustTradeCards: mustTrade };
      return checkVictory(newState);
    }

    case 'END_ATTACK': {
      if (state.phase !== 'ATTACK') return state;
      if (state.captureContext !== null) return state;
      if (state.mustTradeCards) return state;

      let newState = state;
      if (state.capturedThisTurn && state.deck.length + state.discardPile.length > 0) {
        const { card, deck, discardPile } = drawCard(state.deck, state.discardPile);
        const players = state.players.map(p =>
          p.id === state.activePlayerId ? { ...p, hand: [...p.hand, card] } : p,
        );
        newState = { ...state, deck, discardPile, players };
      }

      return { ...newState, phase: 'FORTIFY', capturedThisTurn: false };
    }

    // ── FORTIFY ──────────────────────────────────────────────────────────────

    case 'FORTIFY': {
      if (state.phase !== 'FORTIFY') return state;
      const { from, to, armies } = action;
      const fromT = state.territories[from];

      if (fromT.owner !== state.activePlayerId) return state;
      if (armies < 1 || armies > fromT.armies - 1) return state;

      const connected = getConnectedOwned(from, state.activePlayerId, state.territories);
      if (!connected.has(to)) return state;

      const territories = patch(state.territories, {
        [from]: { armies: fromT.armies - armies },
        [to]: { armies: state.territories[to].armies + armies },
      });
      return endTurn({ ...state, territories });
    }

    case 'END_FORTIFY': {
      if (state.phase !== 'FORTIFY') return state;
      return endTurn(state);
    }

    default:
      return state;
  }
}
