import type { TerritoryId, ContinentId } from '../constants/riskWorldTerritories';

export type { TerritoryId, ContinentId };

export type PlayerId = string;

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'pink';

export type GameMode = 'classic' | 'mission' | 'capital';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

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
  continents?: [ContinentId, ContinentId];
  targetColor?: PlayerColor;
}

// ── Risk cards ────────────────────────────────────────────────────────────────

export interface RiskCard {
  id: string;
  symbol: CardSymbol;
  territoryId: TerritoryId | null;
}

// ── Rules config (E9.5) ───────────────────────────────────────────────────────

export interface GameRules {
  /** How far armies can move during fortify (E4.1). */
  fortifyMode: 'chain' | 'adjacent';
  /**
   * When secret-mission "destroy a player" wins are evaluated (E7.3).
   * 'own_turn': win declared at the start of the holder's next turn (default).
   * 'immediate': win triggers the moment the target is eliminated.
   */
  missionWinTiming: 'own_turn' | 'immediate';
  /** Whether armies placed during REINFORCE can be undone before ending the phase (E2.3). */
  allowReinforceUndo: boolean;
}

export const DEFAULT_RULES: GameRules = {
  fortifyMode: 'chain',
  missionWinTiming: 'own_turn',
  allowReinforceUndo: true,
};

// ── Event log (E0.4) ─────────────────────────────────────────────────────────

export type GameEventType =
  | 'TERRITORY_CLAIMED'
  | 'ARMY_PLACED'
  | 'CARDS_TRADED'
  | 'TERRITORY_BONUS_CLAIMED'
  | 'ATTACK_RESOLVED'
  | 'TERRITORY_CAPTURED'
  | 'PLAYER_ELIMINATED'
  | 'CARD_DRAWN'
  | 'ARMIES_FORTIFIED'
  | 'HQ_CAPTURED'
  | 'MISSION_COMPLETED'
  | 'TURN_ENDED'
  | 'GAME_OVER';

export interface GameEvent {
  id: string;
  /** Unix ms timestamp. */
  ts: number;
  type: GameEventType;
  /** Player who triggered the event; null for system events. */
  actorId: PlayerId | null;
  payload: Record<string, unknown>;
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
  mission: MissionCard | null;
  hqTerritoryId: TerritoryId | null;
  hqChosen: boolean;
  capturedHqPlayerIds: PlayerId[];
  isAI: boolean;
  aiDifficulty: AIDifficulty | null;
}

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
  /** Seed used to produce this roll — enables deterministic replay (E9.4). */
  seed?: number;
}

export interface GameState {
  mode: GameMode;
  rules: GameRules;
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
  /** Snapshot taken at the start of REINFORCE; used for undo (E2.3). */
  reinforceSnapshot: { territories: Record<TerritoryId, TerritoryState>; total: number } | null;
  captureContext: CaptureContext | null;
  lastBattleResult: BattleResult | null;
  mustTradeCards: boolean;
  pendingTerritoryBonus: TerritoryId[] | null;
  randomPlacement: boolean;
  hqsRevealed: boolean;
  /** Current PRNG seed — advances with every dice roll (E9.4). */
  rngSeed: number;
  /** Append-only event log (E0.4). */
  eventLog: GameEvent[];
  winner: PlayerId | null;
}

export type GameAction =
  | { type: 'CLAIM_TERRITORY'; territoryId: TerritoryId }
  | { type: 'PLACE_SETUP_ARMY'; territoryId: TerritoryId }
  | { type: 'TRADE_IN_CARDS'; cardIds: [string, string, string] }
  | { type: 'CLAIM_TERRITORY_BONUS'; territoryId: TerritoryId }
  | { type: 'REINFORCE'; territoryId: TerritoryId; count: number }
  | { type: 'UNDO_REINFORCE' }
  | { type: 'REMOVE_REINFORCEMENT'; territoryId: TerritoryId }
  | { type: 'END_REINFORCE' }
  | { type: 'ATTACK'; from: TerritoryId; to: TerritoryId; attackerDice: number }
  | { type: 'OCCUPY'; armies: number }
  | { type: 'END_ATTACK' }
  | { type: 'FORTIFY'; from: TerritoryId; to: TerritoryId; armies: number }
  | { type: 'END_FORTIFY' }
  | { type: 'SELECT_HQ'; territoryId: TerritoryId }
  | { type: 'REVEAL_HQS' };
