import type { TerritoryId, ContinentId } from '../constants/riskWorldTerritories';

export type { TerritoryId, ContinentId };

export type PlayerId = string;

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow' | 'black' | 'pink';

export type GameMode = 'classic' | 'mission' | 'capital';

export type Phase = 'SETUP' | 'REINFORCE' | 'ATTACK' | 'FORTIFY' | 'GAME_OVER';

export type SetupSubPhase = 'CLAIMING' | 'PLACING';

export type CardSymbol = 'infantry' | 'cavalry' | 'artillery' | 'wild';

export interface RiskCard {
  id: string;
  symbol: CardSymbol;
  /** null for wild cards */
  territoryId: TerritoryId | null;
}

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
}

/** Context kept while a territory capture is awaiting the player's army-movement choice. */
export interface CaptureContext {
  from: TerritoryId;
  to: TerritoryId;
  /** Minimum armies to move in (= number of dice rolled in winning battle). */
  minArmies: number;
  /** Maximum armies to move in (= attacking territory armies − 1). */
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
  /** Global counter used for escalating card trade-in values. */
  setsTraded: number;
  /** Set on first capture; cleared at end of turn; drives one-card-per-turn draw. */
  capturedThisTurn: boolean;
  /** Remaining armies each player must still place during SETUP. */
  setupArmiesRemaining: Record<PlayerId, number>;
  /** Armies left to place during REINFORCE. */
  reinforcementsRemaining: number;
  /** Non-null when a capture is waiting for OCCUPY action. */
  captureContext: CaptureContext | null;
  /** Most recent battle result; used to drive dice display in the UI. */
  lastBattleResult: BattleResult | null;
  /** When true, player must trade cards before taking other actions. */
  mustTradeCards: boolean;
  /** When true, remaining setup armies were (or will be) placed randomly. */
  randomPlacement: boolean;
  /**
   * Non-null when a card trade matched territories the player owns (E5.4).
   * Contains the eligible TerritoryIds; player must pick one for +2 armies
   * before continuing. Null when auto-resolved (only one match).
   */
  pendingTerritoryBonus: TerritoryId[] | null;
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
  | { type: 'END_FORTIFY' };
