import { TranslationKey } from '../locales';
import { ThemeColors } from './colors';

export type TerritoryId =
  | 'alaska'
  | 'northwest'
  | 'alberta'
  | 'ontario'
  | 'quebec'
  | 'greenland'
  | 'westernUS'
  | 'easternUS'
  | 'centralAmerica';

export interface Territory {
  id: TerritoryId;
  /** i18n key for the display name. */
  labelKey: TranslationKey;
  /** Color token from ThemeColors. Never use raw hex in components. */
  colorToken: keyof ThemeColors;
  /**
   * Path IDs from NA_PATHS (northAmericaPaths.ts) that make up this territory.
   * Empty for territories not present in the SVG source (e.g. Greenland).
   */
  svgIds: string[];
  /**
   * Approximate label position in the SVG coordinate space (viewBox 0 0 1000 902).
   * Used to render the territory name at a sensible location.
   */
  labelPosition: { x: number; y: number };
  /** Adjacent territory IDs per classic Risk rules. */
  adjacentTo: TerritoryId[];
}

/**
 * All 9 North American territories from the classic Risk board.
 * svgIds map to path IDs in NA_PATHS; they are grouped and rendered
 * with a shared fill color to form each territory's visual region.
 */
export const NORTH_AMERICA_TERRITORIES: Territory[] = [
  {
    id: 'alaska',
    labelKey: 'map.alaska',
    colorToken: 'territoryAlaska',
    svgIds: ['AK'],
    labelPosition: { x: 185, y: 235 },
    // Alaska also connects to Kamchatka (cross-map link shown as dashed line)
    adjacentTo: ['northwest', 'alberta'],
  },
  {
    id: 'northwest',
    labelKey: 'map.northwest',
    colorToken: 'territoryNorthwest',
    svgIds: ['YT', 'NT', 'NU'],
    labelPosition: { x: 385, y: 210 },
    adjacentTo: ['alaska', 'alberta', 'ontario', 'greenland'],
  },
  {
    id: 'alberta',
    labelKey: 'map.alberta',
    colorToken: 'territoryAlberta',
    svgIds: ['BC', 'AB', 'SK'],
    labelPosition: { x: 530, y: 410 },
    adjacentTo: ['alaska', 'northwest', 'ontario', 'westernUS'],
  },
  {
    id: 'ontario',
    labelKey: 'map.ontario',
    colorToken: 'territoryOntario',
    svgIds: ['MB', 'ON'],
    labelPosition: { x: 695, y: 455 },
    adjacentTo: ['northwest', 'alberta', 'quebec', 'westernUS', 'easternUS'],
  },
  {
    id: 'quebec',
    labelKey: 'map.quebec',
    colorToken: 'territoryQuebec',
    svgIds: ['QC', 'NB', 'PE', 'NS', 'NL'],
    labelPosition: { x: 875, y: 470 },
    adjacentTo: ['ontario', 'easternUS', 'greenland'],
  },
  {
    id: 'greenland',
    labelKey: 'map.greenland',
    colorToken: 'territoryGreenland',
    // Greenland is not in the SVG source — rendered as a polygon overlay
    svgIds: [],
    labelPosition: { x: 960, y: 110 },
    adjacentTo: ['northwest', 'quebec'],
  },
  {
    id: 'westernUS',
    labelKey: 'map.westernUS',
    colorToken: 'territoryWesternUS',
    svgIds: ['WA', 'OR', 'CA', 'NV', 'AZ', 'ID', 'MT', 'WY', 'UT', 'CO', 'NM', 'ND', 'SD', 'NE', 'KS', 'OK'],
    labelPosition: { x: 540, y: 590 },
    adjacentTo: ['alberta', 'ontario', 'easternUS', 'centralAmerica'],
  },
  {
    id: 'easternUS',
    labelKey: 'map.easternUS',
    colorToken: 'territoryEasternUS',
    svgIds: [
      'MN', 'WI', 'MI', 'IA', 'IL', 'IN', 'MO', 'OH', 'KY', 'TN',
      'AR', 'LA', 'TX', 'MS', 'AL', 'GA', 'FL', 'NC', 'SC', 'VA',
      'WV', 'PA', 'NY', 'ME', 'VT', 'NH', 'MA', 'RI', 'CT', 'NJ',
      'DE', 'MD', 'DC',
    ],
    labelPosition: { x: 710, y: 615 },
    adjacentTo: ['ontario', 'quebec', 'westernUS', 'centralAmerica'],
  },
  {
    id: 'centralAmerica',
    labelKey: 'map.centralAmerica',
    colorToken: 'territoryCentralAmerica',
    svgIds: ['MX'],
    labelPosition: { x: 470, y: 840 },
    // Central America also borders Venezuela (South America) in the full game
    adjacentTo: ['westernUS', 'easternUS'],
  },
];
