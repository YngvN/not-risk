import { TranslationKey } from '../locales';
import { ThemeColors } from './colors';

export type ContinentId = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'au';

export type TerritoryId =
  | 'alaska' | 'northwest' | 'alberta' | 'ontario' | 'quebec'
  | 'greenland' | 'westernUS' | 'easternUS' | 'centralAmerica'
  | 'venezuela' | 'peru' | 'brazil' | 'argentina'
  | 'iceland' | 'greatBritain' | 'northernEurope' | 'scandinavia'
  | 'westernEurope' | 'southernEurope' | 'ukraine'
  | 'northAfrica' | 'egypt' | 'eastAfrica' | 'congo' | 'southAfrica' | 'madagascar'
  | 'ural' | 'siberia' | 'yakutsk' | 'kamchatka' | 'irkutsk'
  | 'mongolia' | 'japan' | 'afghanistan' | 'china' | 'middleEast' | 'india' | 'siam'
  | 'indonesia' | 'newGuinea' | 'westernAustralia' | 'easternAustralia';

export interface Territory {
  id: TerritoryId;
  continent: ContinentId;
  labelKey: TranslationKey;
  colorToken: keyof ThemeColors;
  /**
   * ISO country codes from WORLD_PATHS (world-pacific.svg, viewBox 0 0 2000 868).
   * Pacific-centered Robinson projection — Americas on right, Europe/Africa/Asia on left.
   * Coordinate calibration:
   *   Eastern hemisphere: x ≈ 252 + lon_E * 4.8, y ≈ 158 + (53 - lat_N) * 6.5
   *   Western hemisphere: x ≈ 1729 + (80 - lon_W) * 6.3, y ≈ 368 + (22 - lat_N) * 6.5
   */
  svgIds: string[];
  /**
   * Polygon points supplement for territories that need sub-country splits
   * (US, Canada, Russia, Australia) or countries not in the SVG.
   */
  polygonPoints?: string;
  labelPosition: { x: number; y: number };
  adjacentTo: TerritoryId[];
}

export const TERRITORIES: Territory[] = [
  // ── NORTH AMERICA ──────────────────────────────────────────────────────────
  {
    id: 'alaska',
    continent: 'na',
    labelKey: 'map.alaska',
    colorToken: 'territoryAlaska',
    svgIds: [],
    polygonPoints: '1178,50 1205,50 1345,63 1345,125 1414,155 1200,155 1178,90',
    labelPosition: { x: 1265, y: 100 },
    adjacentTo: ['northwest', 'alberta', 'kamchatka'],
  },
  {
    id: 'northwest',
    continent: 'na',
    labelKey: 'map.northwest',
    colorToken: 'territoryNorthwest',
    svgIds: [],
    polygonPoints: '1345,3 1860,3 1860,125 1345,125',
    labelPosition: { x: 1600, y: 65 },
    adjacentTo: ['alaska', 'alberta', 'ontario', 'greenland'],
  },
  {
    id: 'alberta',
    continent: 'na',
    labelKey: 'map.alberta',
    colorToken: 'territoryAlberta',
    svgIds: [],
    polygonPoints: '1345,125 1622,125 1622,193 1345,193',
    labelPosition: { x: 1484, y: 160 },
    adjacentTo: ['alaska', 'northwest', 'ontario', 'westernUS'],
  },
  {
    id: 'ontario',
    continent: 'na',
    labelKey: 'map.ontario',
    colorToken: 'territoryOntario',
    svgIds: [],
    polygonPoints: '1622,125 1729,125 1729,218 1622,218 1622,125',
    labelPosition: { x: 1676, y: 172 },
    adjacentTo: ['northwest', 'alberta', 'quebec', 'westernUS', 'easternUS'],
  },
  {
    id: 'quebec',
    continent: 'na',
    labelKey: 'map.quebec',
    colorToken: 'territoryQuebec',
    svgIds: [],
    polygonPoints: '1729,50 1875,50 1875,218 1729,218 1729,125',
    labelPosition: { x: 1800, y: 140 },
    adjacentTo: ['ontario', 'easternUS', 'greenland'],
  },
  {
    id: 'greenland',
    continent: 'na',
    labelKey: 'map.greenland',
    colorToken: 'territoryGreenland',
    svgIds: ['GL'],
    labelPosition: { x: 1627, y: 62 },
    adjacentTo: ['northwest', 'quebec', 'iceland'],
  },
  {
    id: 'westernUS',
    continent: 'na',
    labelKey: 'map.westernUS',
    colorToken: 'territoryWesternUS',
    svgIds: [],
    polygonPoints: '1446,193 1622,193 1622,316 1496,316 1446,277',
    labelPosition: { x: 1534, y: 255 },
    adjacentTo: ['alberta', 'ontario', 'easternUS', 'centralAmerica'],
  },
  {
    id: 'easternUS',
    continent: 'na',
    labelKey: 'map.easternUS',
    colorToken: 'territoryEasternUS',
    svgIds: [],
    polygonPoints: '1622,193 1811,210 1729,350 1622,316 1622,193',
    labelPosition: { x: 1716, y: 280 },
    adjacentTo: ['ontario', 'quebec', 'westernUS', 'centralAmerica'],
  },
  {
    id: 'centralAmerica',
    continent: 'na',
    labelKey: 'map.centralAmerica',
    colorToken: 'territoryCentralAmerica',
    svgIds: ['MX', 'GT', 'BZ', 'HN', 'SV', 'NI', 'CR', 'PA', 'CU', 'HT', 'DO', 'JM',
              'BS', 'TT', 'BB', 'LC', 'VC', 'GD', 'DM', 'AG', 'KN'],
    labelPosition: { x: 1620, y: 415 },
    adjacentTo: ['westernUS', 'easternUS', 'venezuela'],
  },

  // ── SOUTH AMERICA ──────────────────────────────────────────────────────────
  {
    id: 'venezuela',
    continent: 'sa',
    labelKey: 'southAmerica.venezuela',
    colorToken: 'territoryVenezuela',
    svgIds: ['VE', 'CO', 'GY', 'SR', 'GF'],
    labelPosition: { x: 1816, y: 466 },
    adjacentTo: ['centralAmerica', 'peru', 'brazil'],
  },
  {
    id: 'peru',
    continent: 'sa',
    labelKey: 'southAmerica.peru',
    colorToken: 'territoryPeru',
    svgIds: ['EC', 'PE', 'BO'],
    labelPosition: { x: 1762, y: 570 },
    adjacentTo: ['venezuela', 'brazil', 'argentina'],
  },
  {
    id: 'brazil',
    continent: 'sa',
    labelKey: 'southAmerica.brazil',
    colorToken: 'territoryBrazil',
    svgIds: ['BR'],
    labelPosition: { x: 1887, y: 601 },
    adjacentTo: ['venezuela', 'peru', 'argentina', 'northAfrica'],
  },
  {
    id: 'argentina',
    continent: 'sa',
    labelKey: 'southAmerica.argentina',
    colorToken: 'territoryArgentina',
    svgIds: ['AR', 'CL', 'PY', 'UY'],
    labelPosition: { x: 1770, y: 758 },
    adjacentTo: ['peru', 'brazil'],
  },

  // ── EUROPE ─────────────────────────────────────────────────────────────────
  {
    id: 'iceland',
    continent: 'eu',
    labelKey: 'world.iceland',
    colorToken: 'continentEurope',
    svgIds: ['IS'],
    labelPosition: { x: 261, y: 94 },
    adjacentTo: ['greenland', 'greatBritain', 'scandinavia'],
  },
  {
    id: 'greatBritain',
    continent: 'eu',
    labelKey: 'world.greatBritain',
    colorToken: 'continentEurope',
    svgIds: ['GB', 'IE'],
    labelPosition: { x: 238, y: 158 },
    adjacentTo: ['iceland', 'westernEurope', 'northernEurope', 'scandinavia'],
  },
  {
    id: 'northernEurope',
    continent: 'eu',
    labelKey: 'world.northernEurope',
    colorToken: 'continentEurope',
    svgIds: ['NO', 'SE', 'FI', 'EE', 'LV', 'LT', 'DE', 'PL', 'DK'],
    labelPosition: { x: 370, y: 148 },
    adjacentTo: ['greatBritain', 'westernEurope', 'scandinavia', 'ukraine', 'southernEurope'],
  },
  {
    id: 'scandinavia',
    continent: 'eu',
    labelKey: 'world.scandinavia',
    colorToken: 'continentEurope',
    svgIds: [],
    // Scandinavia (Norway/Denmark) is already covered in northernEurope svgIds above;
    // this territory polygon represents the distinct Risk board slot
    polygonPoints: '380,48 490,48 490,125 380,125',
    labelPosition: { x: 435, y: 87 },
    adjacentTo: ['northernEurope', 'iceland', 'greatBritain', 'ukraine'],
  },
  {
    id: 'westernEurope',
    continent: 'eu',
    labelKey: 'world.westernEurope',
    colorToken: 'continentEurope',
    svgIds: ['PT', 'ES', 'FR', 'NL', 'BE', 'LU'],
    labelPosition: { x: 185, y: 218 },
    adjacentTo: ['greatBritain', 'northernEurope', 'southernEurope', 'northAfrica'],
  },
  {
    id: 'southernEurope',
    continent: 'eu',
    labelKey: 'world.southernEurope',
    colorToken: 'continentEurope',
    svgIds: ['IT', 'GR', 'CH', 'AT', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BA', 'RS', 'ME', 'AL', 'MK', 'XK', 'RO', 'BG'],
    labelPosition: { x: 320, y: 240 },
    adjacentTo: ['westernEurope', 'northernEurope', 'ukraine', 'middleEast', 'egypt', 'northAfrica'],
  },
  {
    id: 'ukraine',
    continent: 'eu',
    labelKey: 'world.ukraine',
    colorToken: 'continentEurope',
    svgIds: ['UA', 'BY', 'MD'],
    labelPosition: { x: 398, y: 178 },
    adjacentTo: ['northernEurope', 'southernEurope', 'ural', 'middleEast', 'afghanistan', 'scandinavia'],
  },

  // ── AFRICA ─────────────────────────────────────────────────────────────────
  {
    id: 'northAfrica',
    continent: 'af',
    labelKey: 'world.northAfrica',
    colorToken: 'continentAfrica',
    svgIds: ['MA', 'DZ', 'TN', 'LY', 'MR', 'ML', 'NE', 'TD', 'EH', 'SN', 'GN', 'GW', 'GM', 'SL', 'LR', 'CI', 'BF', 'GH', 'TG', 'BJ', 'NG'],
    labelPosition: { x: 175, y: 370 },
    adjacentTo: ['westernEurope', 'southernEurope', 'egypt', 'congo', 'eastAfrica', 'brazil'],
  },
  {
    id: 'egypt',
    continent: 'af',
    labelKey: 'world.egypt',
    colorToken: 'continentAfrica',
    svgIds: ['EG', 'SD', 'SS', 'LY'],
    labelPosition: { x: 330, y: 355 },
    adjacentTo: ['northAfrica', 'southernEurope', 'middleEast', 'eastAfrica'],
  },
  {
    id: 'eastAfrica',
    continent: 'af',
    labelKey: 'world.eastAfrica',
    colorToken: 'continentAfrica',
    svgIds: ['ET', 'ER', 'DJ', 'SO', 'KE', 'TZ', 'UG', 'RW', 'BI'],
    labelPosition: { x: 360, y: 490 },
    adjacentTo: ['egypt', 'northAfrica', 'congo', 'southAfrica', 'madagascar', 'middleEast'],
  },
  {
    id: 'congo',
    continent: 'af',
    labelKey: 'world.congo',
    colorToken: 'continentAfrica',
    svgIds: ['CF', 'CM', 'GA', 'GQ', 'CG', 'CD'],
    labelPosition: { x: 250, y: 510 },
    adjacentTo: ['northAfrica', 'eastAfrica', 'southAfrica'],
  },
  {
    id: 'southAfrica',
    continent: 'af',
    labelKey: 'world.southAfrica',
    colorToken: 'continentAfrica',
    svgIds: ['ZA', 'NA', 'BW', 'ZW', 'MZ', 'ZM', 'MW', 'LS', 'SZ', 'AO'],
    labelPosition: { x: 299, y: 673 },
    adjacentTo: ['eastAfrica', 'congo', 'madagascar'],
  },
  {
    id: 'madagascar',
    continent: 'af',
    labelKey: 'world.madagascar',
    colorToken: 'continentAfrica',
    svgIds: ['MG'],
    labelPosition: { x: 412, y: 631 },
    adjacentTo: ['eastAfrica', 'southAfrica'],
  },

  // ── ASIA ───────────────────────────────────────────────────────────────────
  {
    id: 'ural',
    continent: 'as',
    labelKey: 'world.ural',
    colorToken: 'continentAsia',
    svgIds: [],
    // Western Russia (50-70°N, 50-65°E)
    polygonPoints: '492,48 564,48 564,192 492,192',
    labelPosition: { x: 528, y: 120 },
    adjacentTo: ['ukraine', 'afghanistan', 'siberia', 'china'],
  },
  {
    id: 'siberia',
    continent: 'as',
    labelKey: 'world.siberia',
    colorToken: 'continentAsia',
    svgIds: [],
    // Central Russia (50-70°N, 65-110°E)
    polygonPoints: '564,48 780,48 780,192 564,192',
    labelPosition: { x: 672, y: 120 },
    adjacentTo: ['ural', 'irkutsk', 'yakutsk', 'mongolia', 'china'],
  },
  {
    id: 'yakutsk',
    continent: 'as',
    labelKey: 'world.yakutsk',
    colorToken: 'continentAsia',
    svgIds: [],
    // NE Russia — north band (62-72°N, 110-155°E)
    polygonPoints: '780,48 996,48 996,113 780,113',
    labelPosition: { x: 888, y: 80 },
    adjacentTo: ['siberia', 'irkutsk', 'kamchatka'],
  },
  {
    id: 'irkutsk',
    continent: 'as',
    labelKey: 'world.irkutsk',
    colorToken: 'continentAsia',
    svgIds: [],
    // Southern central-eastern Russia (48-62°N, 110-130°E)
    polygonPoints: '780,113 876,113 876,192 780,192',
    labelPosition: { x: 828, y: 152 },
    adjacentTo: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'],
  },
  {
    id: 'kamchatka',
    continent: 'as',
    labelKey: 'world.kamchatka',
    colorToken: 'continentAsia',
    svgIds: [],
    // Far eastern Russia (51-62°N, 155-175°E), near Pacific center
    polygonPoints: '996,100 1068,100 1068,178 996,178',
    labelPosition: { x: 1032, y: 138 },
    adjacentTo: ['yakutsk', 'irkutsk', 'japan', 'alaska'],
  },
  {
    id: 'mongolia',
    continent: 'as',
    labelKey: 'world.mongolia',
    colorToken: 'continentAsia',
    svgIds: ['MN', 'KZ'],
    labelPosition: { x: 670, y: 200 },
    adjacentTo: ['siberia', 'irkutsk', 'china', 'japan'],
  },
  {
    id: 'japan',
    continent: 'as',
    labelKey: 'world.japan',
    colorToken: 'continentAsia',
    svgIds: ['JP', 'KR', 'TW'],
    labelPosition: { x: 927, y: 260 },
    adjacentTo: ['kamchatka', 'mongolia'],
  },
  {
    id: 'afghanistan',
    continent: 'as',
    labelKey: 'world.afghanistan',
    colorToken: 'continentAsia',
    svgIds: ['AF', 'PK', 'TM', 'UZ', 'KG', 'TJ', 'IR'],
    labelPosition: { x: 545, y: 245 },
    adjacentTo: ['ukraine', 'ural', 'china', 'india', 'middleEast'],
  },
  {
    id: 'china',
    continent: 'as',
    labelKey: 'world.china',
    colorToken: 'continentAsia',
    svgIds: ['CN'],
    labelPosition: { x: 754, y: 276 },
    adjacentTo: ['siberia', 'mongolia', 'afghanistan', 'india', 'siam', 'ural'],
  },
  {
    id: 'middleEast',
    continent: 'as',
    labelKey: 'world.middleEast',
    colorToken: 'continentAsia',
    svgIds: ['SA', 'IQ', 'SY', 'JO', 'IL', 'PS', 'YE', 'KW', 'AE', 'QA', 'BH', 'LB', 'OM', 'GE', 'AM', 'AZ'],
    labelPosition: { x: 420, y: 330 },
    adjacentTo: ['ukraine', 'southernEurope', 'egypt', 'eastAfrica', 'afghanistan', 'india'],
  },
  {
    id: 'india',
    continent: 'as',
    labelKey: 'world.india',
    colorToken: 'continentAsia',
    svgIds: ['IN', 'LK', 'NP', 'BT', 'BD'],
    labelPosition: { x: 620, y: 367 },
    adjacentTo: ['middleEast', 'afghanistan', 'china', 'siam'],
  },
  {
    id: 'siam',
    continent: 'as',
    labelKey: 'world.siam',
    colorToken: 'continentAsia',
    svgIds: ['TH', 'VN', 'KH', 'LA', 'MM', 'MY', 'BN', 'TL', 'PH'],
    labelPosition: { x: 720, y: 420 },
    adjacentTo: ['china', 'india', 'indonesia'],
  },

  // ── AUSTRALIA ──────────────────────────────────────────────────────────────
  {
    id: 'indonesia',
    continent: 'au',
    labelKey: 'world.indonesia',
    colorToken: 'continentAustralia',
    svgIds: ['ID'],
    labelPosition: { x: 780, y: 530 },
    adjacentTo: ['siam', 'newGuinea', 'westernAustralia'],
  },
  {
    id: 'newGuinea',
    continent: 'au',
    labelKey: 'world.newGuinea',
    colorToken: 'continentAustralia',
    svgIds: ['PG'],
    labelPosition: { x: 986, y: 551 },
    adjacentTo: ['indonesia', 'easternAustralia'],
  },
  {
    id: 'westernAustralia',
    continent: 'au',
    labelKey: 'world.westernAustralia',
    colorToken: 'continentAustralia',
    svgIds: [],
    // Western half of AU (110-135°E)
    polygonPoints: '790,578 903,578 903,792 790,792',
    labelPosition: { x: 847, y: 685 },
    adjacentTo: ['indonesia', 'easternAustralia'],
  },
  {
    id: 'easternAustralia',
    continent: 'au',
    labelKey: 'world.easternAustralia',
    colorToken: 'continentAustralia',
    svgIds: ['NZ'],
    // Eastern half of AU (135-155°E) + NZ
    polygonPoints: '903,578 1015,578 1015,792 903,792',
    labelPosition: { x: 960, y: 685 },
    adjacentTo: ['newGuinea', 'westernAustralia'],
  },
];
