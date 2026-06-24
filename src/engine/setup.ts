import { TERRITORIES } from '../constants/riskWorldTerritories';
import type { GameState, GameMode, Player, PlayerColor, TerritoryId } from './types';
import { createDeck } from './cards';
import { calcReinforcements } from './reinforcement';

const STARTING_ARMIES: Record<number, number> = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };

export type SetupMode = 'claim' | 'random';

export interface PlayerConfig {
  name: string;
  color: PlayerColor;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Randomly distributes each player's remaining setup armies across their owned territories.
 * Used when randomPlacement is true, both at game creation and mid-setup.
 */
export function autoPlaceArmies(
  territories: GameState['territories'],
  players: Player[],
  setupArmiesRemaining: Record<string, number>,
): GameState['territories'] {
  const result = { ...territories };
  for (const player of players.filter(p => p.alive)) {
    const owned = (Object.keys(result) as TerritoryId[]).filter(
      id => result[id]?.owner === player.id,
    );
    if (owned.length === 0) continue;
    let remaining = setupArmiesRemaining[player.id] ?? 0;
    while (remaining-- > 0) {
      const pick = owned[Math.floor(Math.random() * owned.length)];
      result[pick] = { ...result[pick], armies: result[pick].armies + 1 };
    }
  }
  return result;
}

/**
 * Constructs the initial GameState from a host configuration.
 * - setupMode 'random': territories dealt evenly at random.
 * - randomPlacement: remaining armies are placed automatically; game starts at REINFORCE.
 */
export function createGame(
  mode: GameMode,
  playerConfigs: PlayerConfig[],
  setupMode: SetupMode = 'claim',
  randomPlacement = false,
): GameState {
  const playerCount = playerConfigs.length;
  const startingArmies = STARTING_ARMIES[playerCount] ?? 20;

  const players: Player[] = playerConfigs.map((cfg, i) => ({
    id: `player_${i}`,
    name: cfg.name,
    color: cfg.color,
    alive: true,
    hand: [],
  }));

  let territories = Object.fromEntries(
    TERRITORIES.map(t => [t.id, { id: t.id, owner: null, armies: 0 }]),
  ) as GameState['territories'];

  const { deck, discardPile } = createDeck();

  const setupArmiesRemaining = Object.fromEntries(
    players.map(p => [p.id, startingArmies]),
  ) as Record<string, number>;

  const baseState: Omit<GameState, 'phase' | 'setupSubPhase' | 'activePlayerId' | 'reinforcementsRemaining' | 'mustTradeCards'> = {
    mode,
    players,
    territories,
    deck,
    discardPile,
    setsTraded: 0,
    capturedThisTurn: false,
    setupArmiesRemaining,
    captureContext: null,
    lastBattleResult: null,
    pendingTerritoryBonus: null,
    randomPlacement,
    winner: null,
  };

  if (setupMode === 'random') {
    // Deal territories randomly, round-robin; each gets 1 army from that player's pool
    const shuffled = shuffle(TERRITORIES.map(t => t.id));
    shuffled.forEach((id, idx) => {
      const player = players[idx % playerCount];
      territories[id] = { id, owner: player.id, armies: 1 };
      setupArmiesRemaining[player.id] -= 1;
    });

    if (randomPlacement) {
      // Also place remaining armies randomly → start directly at REINFORCE
      territories = autoPlaceArmies(territories, players, setupArmiesRemaining);
      const firstPlayer = players[0];
      const reinforcements = calcReinforcements(firstPlayer.id, { ...baseState, territories } as GameState);
      return {
        ...baseState,
        territories,
        setupArmiesRemaining: Object.fromEntries(players.map(p => [p.id, 0])) as Record<string, number>,
        phase: 'REINFORCE',
        setupSubPhase: 'PLACING',
        activePlayerId: firstPlayer.id,
        reinforcementsRemaining: reinforcements,
        mustTradeCards: false,
      };
    }

    return {
      ...baseState,
      territories,
      phase: 'SETUP',
      setupSubPhase: 'PLACING',
      activePlayerId: players[0].id,
      reinforcementsRemaining: 0,
      mustTradeCards: false,
    };
  }

  return {
    ...baseState,
    phase: 'SETUP',
    setupSubPhase: 'CLAIMING',
    activePlayerId: players[0].id,
    reinforcementsRemaining: 0,
    mustTradeCards: false,
  };
}
