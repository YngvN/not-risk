import type { GameState, GameAction, Player, TerritoryState, PlayerId, TerritoryId } from './types';
import { areAdjacent, getTerritoryCount, getConnectedOwned } from './board';
import { battle } from './combat';
import { drawCard, tradeInValue, isValidSet } from './cards';
import { calcReinforcements } from './reinforcement';
import { autoPlaceArmies } from './setup';
import { dealMissions, checkMission } from './missions';
import { ClassicConquestVictory, SecretMissionVictory, CapitalVictory } from './victory';
import type { VictoryCondition } from './victory';

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

function nextAlivePlayer(state: GameState): Player {
  const alive = alivePlayers(state);
  const idx = alive.findIndex(p => p.id === state.activePlayerId);
  return alive[(idx + 1) % alive.length];
}

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

const MISSION_VICTORY = new SecretMissionVictory();
const CAPITAL_VICTORY = new CapitalVictory();

const VICTORY: Record<GameState['mode'], VictoryCondition> = {
  classic: new ClassicConquestVictory(),
  mission: MISSION_VICTORY,
  capital: CAPITAL_VICTORY,
};

function checkVictory(state: GameState): GameState {
  const winner = VICTORY[state.mode].check(state);
  if (winner) return { ...state, phase: 'GAME_OVER', winner };
  return state;
}

/** Check destroy missions after any elimination event. */
function checkDestroyMissions(state: GameState): GameState {
  if (state.mode !== 'mission') return state;
  const winner = MISSION_VICTORY.checkDestroyMissions(state);
  if (winner) return { ...state, phase: 'GAME_OVER', winner };
  return state;
}

/** Transition to the next player's reinforcement phase. */
function endTurn(state: GameState): GameState {
  const next = nextAlivePlayer(state);
  const reinforcements = calcReinforcements(next.id, state);
  const nextPlayer = state.players.find(p => p.id === next.id)!;
  const mustTrade = nextPlayer.hand.length >= 5;
  const newState: GameState = {
    ...state,
    phase: 'REINFORCE',
    activePlayerId: next.id,
    reinforcementsRemaining: reinforcements,
    capturedThisTurn: false,
    lastBattleResult: null,
    mustTradeCards: mustTrade,
  };
  // Check mission at the start of the player's turn (E7.4)
  return checkVictory(newState);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

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
          return transitionAfterSetup({ ...state, territories: placed, setupArmiesRemaining: Object.fromEntries(state.players.map(p => [p.id, 0])) });
        }
        return { ...state, territories, setupArmiesRemaining, setupSubPhase: 'PLACING', activePlayerId: alivePlayers(state)[0].id };
      }

      const next = nextAlivePlayer({ ...state, territories, setupArmiesRemaining });
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
        return transitionAfterSetup({ ...state, territories, setupArmiesRemaining: Object.fromEntries(state.players.map(p => [p.id, 0])) });
      }

      return { ...state, territories, setupArmiesRemaining, activePlayerId: nextId };
    }

    // ── CAPITAL: HQ SELECTION ────────────────────────────────────────────────

    case 'SELECT_HQ': {
      if (state.phase !== 'HQ_SELECTION') return state;
      const territory = state.territories[action.territoryId];
      if (territory.owner !== state.activePlayerId) return state;

      const players = state.players.map(p =>
        p.id === state.activePlayerId
          ? { ...p, hqTerritoryId: action.territoryId, hqChosen: true }
          : p,
      );

      // Advance to next player who hasn't chosen yet
      const nextPlayer = players.find(
        (p, i) => p.alive && !p.hqChosen && i > players.findIndex(p2 => p2.id === state.activePlayerId),
      ) ?? players.find(p => p.alive && !p.hqChosen);

      if (!nextPlayer) {
        // All have chosen — stay in HQ_SELECTION but signal ready for reveal
        return { ...state, players };
      }
      return { ...state, players, activePlayerId: nextPlayer.id };
    }

    case 'REVEAL_HQS': {
      if (state.phase !== 'HQ_SELECTION') return state;
      const allChosen = state.players.every(p => !p.alive || p.hqChosen);
      if (!allChosen) return state;

      const firstPlayer = alivePlayers(state)[0];
      const reinforcements = calcReinforcements(firstPlayer.id, state);
      return {
        ...state,
        hqsRevealed: true,
        phase: 'REINFORCE',
        activePlayerId: firstPlayer.id,
        reinforcementsRemaining: reinforcements,
        mustTradeCards: firstPlayer.hand.length >= 5,
      };
    }

    // ── REINFORCE ────────────────────────────────────────────────────────────

    case 'TRADE_IN_CARDS': {
      if (state.phase !== 'REINFORCE' && !state.mustTradeCards) return state;
      if (state.pendingTerritoryBonus) return state;

      const activePlayer = state.players.find(p => p.id === state.activePlayerId)!;
      const cardIdSet = new Set(action.cardIds);

      // Mode 3: HQ card cannot be part of a trade (E8.2)
      if (state.mode === 'capital' && activePlayer.hqTerritoryId) {
        const hqCardId = `card_${activePlayer.hqTerritoryId}`;
        if (cardIdSet.has(hqCardId)) return state;
      }

      const selected = activePlayer.hand.filter(c => cardIdSet.has(c.id));
      if (selected.length !== 3) return state;
      const triple = selected as [typeof selected[0], typeof selected[0], typeof selected[0]];
      if (!isValidSet(triple)) return state;

      const armies = tradeInValue(state.setsTraded);
      const newHand = activePlayer.hand.filter(c => !cardIdSet.has(c.id));
      const players = state.players.map(p =>
        p.id === state.activePlayerId ? { ...p, hand: newHand } : p,
      );
      const stillMustTrade = newHand.length >= 5;

      // E5.4 — territory-match bonus
      const matches = [...new Set(
        selected
          .filter(c => c.territoryId !== null)
          .map(c => c.territoryId!)
          .filter(id => state.territories[id]?.owner === state.activePlayerId),
      )];

      let territories = state.territories;
      let pendingTerritoryBonus: TerritoryId[] | null = null;
      if (matches.length === 1) {
        territories = patch(state.territories, { [matches[0]]: { armies: state.territories[matches[0]].armies + 2 } });
      } else if (matches.length > 1) {
        pendingTerritoryBonus = matches;
      }

      return { ...state, players, territories, discardPile: [...state.discardPile, ...selected], setsTraded: state.setsTraded + 1, reinforcementsRemaining: state.reinforcementsRemaining + armies, mustTradeCards: stillMustTrade, pendingTerritoryBonus };
    }

    case 'CLAIM_TERRITORY_BONUS': {
      if (!state.pendingTerritoryBonus) return state;
      if (!state.pendingTerritoryBonus.includes(action.territoryId)) return state;
      if (state.territories[action.territoryId]?.owner !== state.activePlayerId) return state;
      const territories = patch(state.territories, { [action.territoryId]: { armies: state.territories[action.territoryId].armies + 2 } });
      return { ...state, territories, pendingTerritoryBonus: null };
    }

    case 'REINFORCE': {
      if (state.phase !== 'REINFORCE') return state;
      if (state.mustTradeCards || state.pendingTerritoryBonus) return state;
      const territory = state.territories[action.territoryId];
      if (territory.owner !== state.activePlayerId) return state;
      if (action.count <= 0 || action.count > state.reinforcementsRemaining) return state;
      const territories = patch(state.territories, { [action.territoryId]: { armies: territory.armies + action.count } });
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
      if (attackerDice < 1 || attackerDice > 3 || attackerDice > fromT.armies - 1) return state;

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
        ? { from, to, minArmies: Math.min(attackerDice, newAttackerArmies - 1), maxArmies: newAttackerArmies - 1 }
        : null;

      return { ...state, territories, lastBattleResult: battleResult, captureContext };
    }

    case 'OCCUPY': {
      if (state.phase !== 'ATTACK' || !state.captureContext) return state;
      const { from, to, minArmies, maxArmies } = state.captureContext;
      const armies = Math.max(minArmies, Math.min(maxArmies, action.armies));

      const previousOwner = state.territories[to].owner;
      let territories = patch(state.territories, {
        [from]: { armies: state.territories[from].armies - armies },
        [to]: { owner: state.activePlayerId, armies },
      });

      let players = state.players;

      if (previousOwner) {
        // Check if the captured territory was someone's HQ (Mode 3)
        const hqOwner = state.players.find(p => p.id === previousOwner && p.hqTerritoryId === to);
        if (hqOwner && state.mode === 'capital') {
          players = players.map(p =>
            p.id === state.activePlayerId
              ? { ...p, capturedHqPlayerIds: [...p.capturedHqPlayerIds, previousOwner] }
              : p,
          );
        }

        // Check for elimination
        const remaining = Object.values(territories).filter(t => t.owner === previousOwner).length;
        if (remaining === 0) {
          const eliminated = players.find(p => p.id === previousOwner)!;
          players = players.map(p => {
            if (p.id === previousOwner) return { ...p, alive: false, hand: [] };
            if (p.id === state.activePlayerId) return { ...p, hand: [...p.hand, ...eliminated.hand] };
            return p;
          });
        }
      }

      const activeNow = players.find(p => p.id === state.activePlayerId)!;
      const mustTrade = activeNow.hand.length >= 6;

      let newState: GameState = { ...state, territories, players, captureContext: null, capturedThisTurn: true, mustTradeCards: mustTrade };
      newState = checkVictory(newState);
      if (newState.phase === 'GAME_OVER') return newState;
      return checkDestroyMissions(newState);
    }

    case 'END_ATTACK': {
      if (state.phase !== 'ATTACK') return state;
      if (state.captureContext !== null || state.mustTradeCards) return state;

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

// ── Post-setup transition helper ─────────────────────────────────────────────

/**
 * Called when all setup armies have been placed.
 * Routes to the correct next phase based on game mode.
 */
function transitionAfterSetup(state: GameState): GameState {
  let players = state.players;

  if (state.mode === 'mission') {
    players = dealMissions(players);
  }

  if (state.mode === 'capital') {
    const firstPlayer = alivePlayers({ ...state, players })[0];
    return { ...state, players, phase: 'HQ_SELECTION', activePlayerId: firstPlayer.id };
  }

  const firstPlayer = alivePlayers({ ...state, players })[0];
  const reinforcements = calcReinforcements(firstPlayer.id, { ...state, players });
  return {
    ...state,
    players,
    phase: 'REINFORCE',
    activePlayerId: firstPlayer.id,
    reinforcementsRemaining: reinforcements,
    mustTradeCards: firstPlayer.hand.length >= 5,
  };
}
