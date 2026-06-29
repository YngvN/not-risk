export const AI_NAME_POOL: readonly string[] = [
  'HAL-9000',    // 2001: A Space Odyssey
  'Skynet',      // Terminator
  'GLaDOS',      // Portal
  'Ultron',      // Avengers: Age of Ultron
  'JARVIS',      // Iron Man
  'TARS',        // Interstellar
  'Cortana',     // Halo
  'Colossus',    // The Forbin Project
  'SHODAN',      // System Shock
  'Samantha',    // Her
  'VIKI',        // I, Robot
  'Deep Thought',// The Hitchhiker's Guide to the Galaxy
  'Marvin',      // The Hitchhiker's Guide to the Galaxy
  'Joshua',      // WarGames
  'Dolores',     // Westworld
  'T-1000',      // Terminator 2
  'Data',        // Star Trek: The Next Generation
  'Ava',         // Ex Machina
  'K.I.T.T.',   // Knight Rider
  'Rehoboam',    // Westworld
];

/**
 * Returns a random name from the pool that isn't already in `usedNames`.
 * Falls back to 'AI' if the pool is exhausted (can't happen with ≤6 AI slots).
 */
export function pickAiName(usedNames: readonly string[]): string {
  const available = AI_NAME_POOL.filter(n => !usedNames.includes(n));
  if (available.length === 0) return 'AI';
  return available[Math.floor(Math.random() * available.length)];
}
