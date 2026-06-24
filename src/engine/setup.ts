import { TERRITORIES } from '../constants/riskWorldTerritories';
import type { GameState, GameMode, Player, PlayerColor, TerritoryId } from './types';
import { createDeck } from './cards';
import { calcReinforcements } from './reinforcement';
import { dealMissions } from './missions';

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

/** Randomly drops each player's remaining setup armies across their owned territories. */
export function autoPlaceArmies(
  territories: GameState['territories'],
  players: Player[],
  setupArmiesRemaining: Record<string, number>,
): GameState['territories'] {
  const result = { ...territories };
  for (const player of players.filter(p => p.alive)) {
    const owned = (Object.keys(result) as TerritoryId[]).filter(id => result[id]?.owner === player.id);
    if (owned.length === 0) continue;
    let remaining = setupArmiesRemaining[player.id] ?? 0;
    while (remaining-- > 0) {
      const pick = owned[Math.floor(Math.random() * owned.length)];
      result[pick] = { ...result[pick], armies: result[pick].armies + 1 };
    }
  }
  return result;
}

function makePlayers(configs: PlayerConfig[]): Player[] {
  return configs.map((cfg, i) => ({
    id: `player_${i}`,
    name: cfg.name,
    color: cfg.color,
    alive: true,
    hand: [],
    mission: null,
    hqTerritoryId: null,
    hqChosen: false,
    capturedHqPlayerIds: [],
  }));
}

/**
 * Constructs the initial GameState.
 * - setupMode 'random': territories dealt randomly round-robin.
 * - randomPlacement: armies auto-placed; skips PLACING phase.
 * - mode 'mission': missions dealt after setup.
 * - mode 'capital': enters HQ_SELECTION phase after armies are placed.
 */
export function createGame(
  mode: GameMode,
  playerConfigs: PlayerConfig[],
  setupMode: SetupMode = 'claim',
  randomPlacement = false,
): GameState {
  const playerCount = playerConfigs.length;
  const startingArmies = STARTING_ARMIES[playerCount] ?? 20;

  let players = makePlayers(playerConfigs);

  let territories = Object.fromEntries(
    TERRITORIES.map(t => [t.id, { id: t.id, owner: null, armies: 0 }]),
  ) as GameState['territories'];

  const { deck, discardPile } = createDeck();

  const setupArmiesRemaining = Object.fromEntries(
    players.map(p => [p.id, startingArmies]),
  ) as Record<string, number>;

  const base: Omit<GameState, 'phase' | 'setupSubPhase' | 'activePlayerId' | 'reinforcementsRemaining' | 'mustTradeCards'> = {
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
    hqsRevealed: false,
    winner: null,
  };

  if (setupMode === 'random') {
    const shuffled = shuffle(TERRITORIES.map(t => t.id));
    shuffled.forEach((id, idx) => {
      const player = players[idx % playerCount];
      territories[id] = { id, owner: player.id, armies: 1 };
      setupArmiesRemaining[player.id] -= 1;
    });

    if (randomPlacement) {
      territories = autoPlaceArmies(territories, players, setupArmiesRemaining);
      if (mode === 'mission') players = dealMissions(players);
      const firstPlayer = players[0];
      const reinforcements = calcReinforcements(firstPlayer.id, { ...base, territories, players } as GameState);
      if (mode === 'capital') {
        return { ...base, territories, players, setupArmiesRemaining: Object.fromEntries(players.map(p => [p.id, 0])), phase: 'HQ_SELECTION', setupSubPhase: 'PLACING', activePlayerId: firstPlayer.id, reinforcementsRemaining: 0, mustTradeCards: false };
      }
      return { ...base, territories, players, setupArmiesRemaining: Object.fromEntries(players.map(p => [p.id, 0])), phase: 'REINFORCE', setupSubPhase: 'PLACING', activePlayerId: firstPlayer.id, reinforcementsRemaining: reinforcements, mustTradeCards: false };
    }

    return { ...base, territories, players, phase: 'SETUP', setupSubPhase: 'PLACING', activePlayerId: players[0].id, reinforcementsRemaining: 0, mustTradeCards: false };
  }

  return { ...base, phase: 'SETUP', setupSubPhase: 'CLAIMING', activePlayerId: players[0].id, reinforcementsRemaining: 0, mustTradeCards: false };
}
