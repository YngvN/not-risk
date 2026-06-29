export const CONQUEROR_NAME_POOL: readonly string[] = [
  'Alexander the Great',
  'Napoleon',
  'Genghis Khan',
  'Julius Caesar',
  'Attila the Hun',
  'Cyrus the Great',
  'Charlemagne',
  'William the Conqueror',
  'Tamerlane',
  'Hannibal',
  'Scipio Africanus',
  'Constantine',
  'Saladin',
  'Richard I',
  'Suleiman',
  'Frederick the Great',
  'Cortés',
  'Pizarro',
  'Shaka Zulu',
  'Mehmed II',
];

/**
 * Returns a random name from the conqueror pool that is not already in `usedNames`.
 * Falls back to a numbered placeholder if the pool is exhausted.
 */
export function pickConquerorName(usedNames: readonly string[]): string {
  const available = CONQUEROR_NAME_POOL.filter(n => !usedNames.includes(n));
  if (available.length === 0) return `Player ${usedNames.length + 1}`;
  return available[Math.floor(Math.random() * available.length)];
}
