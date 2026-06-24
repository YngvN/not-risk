import type { TerritoryId, ContinentId } from '../constants/riskWorldTerritories';

export type { TerritoryId, ContinentId };

export type PlayerId = string;

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'pink';

export type GameMode = 'classic' | 'mission' | 'capital';

export type Phase = 'SETUP' | 'HQ_SELECTION' | 'REINFORCE' | 'ATTACK' | 'FORTIFY' | 'GAME_OVER';

export type SetupSubPhase = 'CLAIMING' | 'PLACING';

export type CardSymbol = 'infantry' | 'cavalry' | 'artillery' | 'wild';

// ── Mission cards (Mode 2) ────────────────────────────────────────────────────

export type MissionType =
  | 'TWO_CONTINENTS'
  | 'TWO_CONTINENTS_PLUS_ONE'
  | 'HOLD_24'
  | 'HOLD_18_TWO_ARMIES'
  | 'DESTROY_PLAYER';

export interface MissionCard {
  id: string;
  type: MissionType;
  /** Named continents for conquest missions. */
  continents?: [ContinentId, ContinentId];
  /** Target player color for DESTROY_PLAYER missions. */
  targetColor?: PlayerColor;
}

// ── Risk cards ────────────────────────────────────────────────────────────────

export interface RiskCard {
  id: string;
  symbol: CardSymbol;
  /** null for wild cards */
  territoryId: TerritoryId | null;
}

// ── Core entities ─────────────────────────────────────────────────────────────

export interface TerritoryState {
  id: TerritoryId;
  owner: PlayerId | null;
  armies: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  alive: boolean;
  hand: RiskCard[];
  // Mode 2 — Secret Mission
  mission: MissionCard | null;
  // Mode 3 — Capital Risk
  hqTerritoryId: TerritoryId | null;
  /** True once player has submitted their HQ choice (hidden until reveal). */
  hqChosen: boolean;
  /** IDs of players whose HQ this player has captured. */
  capturedHqPlayerIds: PlayerId[];
}

/** Context kept while a territory capture is awaiting the player's army-movement choice. */
export interface CaptureContext {
  from: TerritoryId;
  to: TerritoryId;
  minArmies: number;
  maxArmies: number;
}

export interface BattleResult {
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  captured: boolean;
}

export interface GameState {
  mode: GameMode;
  phase: Phase;
  setupSubPhase: SetupSubPhase;
  players: Player[];
  activePlayerId: PlayerId;
  territories: Record<TerritoryId, TerritoryState>;
  deck: RiskCard[];
  discardPile: RiskCard[];
  setsTraded: number;
  capturedThisTurn: boolean;
  setupArmiesRemaining: Record<PlayerId, number>;
  reinforcementsRemaining: number;
  captureContext: CaptureContext | null;
  lastBattleResult: BattleResult | null;
  mustTradeCards: boolean;
  pendingTerritoryBonus: TerritoryId[] | null;
  randomPlacement: boolean;
  // Mode 3 — Capital Risk
  /** True after all players have revealed their HQ simultaneously. */
  hqsRevealed: boolean;
  winner: PlayerId | null;
}

export type GameAction =
  | { type: 'CLAIM_TERRITORY'; territoryId: TerritoryId }
  | { type: 'PLACE_SETUP_ARMY'; territoryId: TerritoryId }
  | { type: 'TRADE_IN_CARDS'; cardIds: [string, string, string] }
  | { type: 'CLAIM_TERRITORY_BONUS'; territoryId: TerritoryId }
  | { type: 'REINFORCE'; territoryId: TerritoryId; count: number }
  | { type: 'END_REINFORCE' }
  | { type: 'ATTACK'; from: TerritoryId; to: TerritoryId; attackerDice: number }
  | { type: 'OCCUPY'; armies: number }
  | { type: 'END_ATTACK' }
  | { type: 'FORTIFY'; from: TerritoryId; to: TerritoryId; armies: number }
  | { type: 'END_FORTIFY' }
  // Mode 3 — Capital Risk
  | { type: 'SELECT_HQ'; territoryId: TerritoryId }
  | { type: 'REVEAL_HQS' };
