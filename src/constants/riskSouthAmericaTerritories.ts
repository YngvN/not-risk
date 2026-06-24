import { TranslationKey } from '../locales';
import { ThemeColors } from './colors';

export type SATerritoryId = 'venezuela' | 'peru' | 'brazil' | 'argentina';

export interface SATerritory {
  id: SATerritoryId;
  labelKey: TranslationKey;
  colorToken: keyof ThemeColors;
  /**
   * SVG polygon points string in the south-america.svg coordinate space (0 0 81.08 117.70).
   * Polygons are approximations of the Risk territory boundaries; adjacent territories
   * share exact boundary vertices so there are no visible seams.
   */
  polygonPoints: string;
  /** Approximate centroid for the label. */
  labelPosition: { x: number; y: number };
  adjacentTo: SATerritoryId[];
}

/**
 * Shared boundary vertices — must appear verbatim in both adjacent polygons.
 *
 * Venezuela/Peru seam  (western): (5,14)→(10,18)→(18,20)→(25,22)
 * Venezuela/Brazil seam (eastern): (25,22)→(40,22)→(58,22)→(70,20)
 * Peru/Brazil seam:   (25,22)→(28,30)→(34,42)→(37,56)→(38,65)
 * Peru/Argentina seam: (20,65)→(38,65)
 * Brazil/Argentina seam: (38,65)→(52,70)→(65,72)→(72,68)
 */
export const SOUTH_AMERICA_TERRITORIES: SATerritory[] = [
  {
    id: 'venezuela',
    labelKey: 'southAmerica.venezuela',
    colorToken: 'territoryVenezuela',
    // Northern strip: full Caribbean coast east→west, south boundary shared with Peru and Brazil
    polygonPoints:
      '5,14 3,10 5,6 8,4 14,2 25,2 40,2 55,2 65,3 72,5 77,10 76,15 70,20 58,22 40,22 25,22 18,20 10,18',
    labelPosition: { x: 45, y: 12 },
    // Venezuela also borders Central America (NA) and Trinidad/Tobago in the full game
    adjacentTo: ['peru', 'brazil'],
  },
  {
    id: 'peru',
    labelKey: 'southAmerica.peru',
    colorToken: 'territoryPeru',
    // Western coast strip from the Venezuela border south to Argentina
    polygonPoints:
      '2,10 5,14 10,18 18,20 25,22 28,30 34,42 37,56 38,65 20,65 18,52 16,38 12,24 10,18 5,14 2,10',
    labelPosition: { x: 18, y: 42 },
    adjacentTo: ['venezuela', 'brazil', 'argentina'],
  },
  {
    id: 'brazil',
    labelKey: 'southAmerica.brazil',
    colorToken: 'territoryBrazil',
    // Large central-eastern region
    polygonPoints:
      '25,22 40,22 58,22 70,20 76,15 77,10 78,18 79,32 78,50 75,65 72,68 65,72 52,70 38,65 37,56 34,42 28,30 25,22',
    labelPosition: { x: 57, y: 44 },
    adjacentTo: ['venezuela', 'peru', 'argentina'],
  },
  {
    id: 'argentina',
    labelKey: 'southAmerica.argentina',
    colorToken: 'territoryArgentina',
    // Southern cone
    polygonPoints:
      '20,65 38,65 52,70 65,72 72,68 70,80 66,92 60,102 54,110 46,116 38,117 30,115 24,110 20,100 18,88 19,76',
    labelPosition: { x: 45, y: 92 },
    // Argentina also borders Venezuela/Brazil sea connections in the full game
    adjacentTo: ['peru', 'brazil'],
  },
];
