import { TERRITORIES } from '../constants/riskWorldTerritories';
import type { RiskCard, CardSymbol, GameState } from './types';

const SYMBOLS: CardSymbol[] = ['infantry', 'cavalry', 'artillery'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Creates a fresh shuffled deck: 42 territory cards + 2 wilds. */
export function createDeck(): { deck: RiskCard[]; discardPile: RiskCard[] } {
  const territoryCards: RiskCard[] = TERRITORIES.map((t, i) => ({
    id: `card_${t.id}`,
    symbol: SYMBOLS[i % 3],
    territoryId: t.id,
  }));
  const wilds: RiskCard[] = [
    { id: 'wild_1', symbol: 'wild', territoryId: null },
    { id: 'wild_2', symbol: 'wild', territoryId: null },
  ];
  return { deck: shuffle([...territoryCards, ...wilds]), discardPile: [] };
}

export function isValidSet(cards: [RiskCard, RiskCard, RiskCard]): boolean {
  const symbols = cards.map(c => c.symbol);
  const nonWild = symbols.filter(s => s !== 'wild');
  const wildCount = 3 - nonWild.length;
  if (wildCount >= 2) return true;
  if (wildCount === 1) return true; // 1 wild + any 2 = always valid
  const unique = new Set(nonWild);
  return unique.size === 1 || unique.size === 3;
}

/** Returns all valid 3-card combinations from a hand. */
export function detectSets(hand: RiskCard[]): [RiskCard, RiskCard, RiskCard][] {
  const sets: [RiskCard, RiskCard, RiskCard][] = [];
  for (let i = 0; i < hand.length - 2; i++) {
    for (let j = i + 1; j < hand.length - 1; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        const combo: [RiskCard, RiskCard, RiskCard] = [hand[i], hand[j], hand[k]];
        if (isValidSet(combo)) sets.push(combo);
      }
    }
  }
  return sets;
}

const TRADE_VALUES = [4, 6, 8, 10, 12, 15];

/** Army value for the nth set trade-in (0-indexed global counter). */
export function tradeInValue(setsTraded: number): number {
  if (setsTraded < TRADE_VALUES.length) return TRADE_VALUES[setsTraded];
  return 15 + (setsTraded - 5) * 5;
}

/** Draws one card, reshuffling the discard pile if the deck is empty. */
export function drawCard(
  deck: RiskCard[],
  discardPile: RiskCard[],
): { card: RiskCard; deck: RiskCard[]; discardPile: RiskCard[] } {
  let d = deck;
  let dp = discardPile;
  if (d.length === 0) {
    d = shuffle([...dp]);
    dp = [];
  }
  const [card, ...rest] = d;
  return { card, deck: rest, discardPile: dp };
}
