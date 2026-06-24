import { TerritoryId } from './riskWorldTerritories';

/**
 * Overrides for the Atlantic-centered (Africa) world map (world.svg, viewBox 0 0 2000 857).
 *
 * Three override mechanisms, applied in order per territory:
 *   1. svgIds    → id-based paths from WORLD_AFRICA_PATHS (169 named countries)
 *   2. classPathNames → class-based paths from WORLD_AFRICA_CLASS_PATHS (52 country groups)
 *   3. polygonPoints  → hand-drawn polygon fallback for countries in neither
 *
 * Coordinate system (for polygon points):
 *   x = 1000 + lon_east * 5.4   (lon_west is negative)
 *   y = 455  - lat_north * 6.3  (lat_south is negative)
 */

/**
 * Class name keys into WORLD_AFRICA_CLASS_PATHS for territories whose countries
 * are stored as class-based (not id-based) paths in world.svg.
 * Bounding-box centroids used for label positions below.
 */
export const AFRICA_CLASS_PATH_NAMES: Partial<Record<TerritoryId, string[]>> = {
  // ── Australia continent ────────────────────────────────────────────────────
  // bbox sources: AU(1603-1829,570-782), ID(1526-1786,467-568),
  //               PG(1783-1869,518-570), NZ(1827-1930,723-801)
  indonesia:        ['Indonesia'],
  newGuinea:        ['Papua New Guinea'],
  westernAustralia: ['Australia'],        // full AU shape; W/E split via label only for now
  easternAustralia: ['New Zealand'],

  // ── Europe ─────────────────────────────────────────────────────────────────
  greatBritain:    ['United Kingdom'],
  westernEurope:   ['France'],            // supplements id-based ES,PT,NL,BE
  southernEurope:  ['Italy', 'Greece'],   // supplements id-based CH,AT,CZ,SK,HU,SI,HR,etc.
  northernEurope:  ['Norway', 'Denmark'], // supplements id-based SE,FI,EE,LV,LT,DE,PL
  scandinavia:     ['Norway', 'Denmark'], // scandinavia slot reuses same class paths

  // ── Asia ───────────────────────────────────────────────────────────────────
  china:           ['China'],
  japan:           ['Japan'],
  mongolia:        ['China'],             // Mongolia id-based (MN) already in svgIds; China class expands eastward

  // ── South America ──────────────────────────────────────────────────────────
  argentina:       ['Argentina', 'Chile'],

  // ── Russia (partial) ───────────────────────────────────────────────────────
  // 'Russian Federation' class path (10 paths) is used for Siberia as a proxy;
  // the other RU territories remain polygon-only until a proper split is implemented.
  siberia:         ['Russian Federation'],
};

export const AFRICA_POLYGONS: Partial<Record<TerritoryId, string>> = {
  // ── North America (US, CA, GL not class-based) ────────────────────────────
  alaska:
    '93,8 160,8 239,15 239,77 298,109 175,109 93,55',
  northwest:
    '239,0 676,0 676,77 239,77',
  alberta:
    '239,77 476,77 476,146 239,146',
  ontario:
    '476,77 568,77 568,178 476,178',
  quebec:
    '568,50 720,50 720,173 568,173',
  westernUS:
    '325,146 476,146 476,266 325,266',
  easternUS:
    '476,146 638,146 638,298 476,298',

  // ── Russia splits (class 'Russian Federation' only used for Siberia above) ─
  ural:
    '1270,15 1351,15 1351,140 1270,140',
  irkutsk:
    '1594,65 1702,65 1702,140 1594,140',
  yakutsk:
    '1594,8 1837,8 1837,65 1594,65',
  kamchatka:
    '1837,65 1945,65 1945,140 1837,140',
};

/** Label centroids in the world.svg (Atlantic-centered) coordinate space. */
export const AFRICA_LABELS: Record<TerritoryId, { x: number; y: number }> = {
  // North America
  alaska:         { x: 179,  y: 52  },
  northwest:      { x: 460,  y: 40  },
  alberta:        { x: 358,  y: 112 },
  ontario:        { x: 522,  y: 128 },
  quebec:         { x: 644,  y: 112 },
  greenland:      { x: 773,  y: 8   },
  westernUS:      { x: 400,  y: 206 },
  easternUS:      { x: 557,  y: 222 },
  centralAmerica: { x: 514,  y: 330 },
  // South America
  venezuela:      { x: 649,  y: 405 },
  peru:           { x: 595,  y: 518 },
  brazil:         { x: 720,  y: 518 },
  argentina:      { x: 680,  y: 720 },
  // Europe
  iceland:        { x: 903,  y: 52  },
  greatBritain:   { x: 988,  y: 155 },
  northernEurope: { x: 1082, y: 115 },
  scandinavia:    { x: 1075, y: 68  },
  westernEurope:  { x: 1010, y: 192 },
  southernEurope: { x: 1078, y: 230 },
  ukraine:        { x: 1168, y: 178 },
  // Africa
  northAfrica:    { x: 975,  y: 354 },
  egypt:          { x: 1158, y: 368 },
  eastAfrica:     { x: 1206, y: 480 },
  congo:          { x: 1122, y: 500 },
  southAfrica:    { x: 1135, y: 644 },
  madagascar:     { x: 1254, y: 581 },
  // Asia
  ural:           { x: 1310, y: 78  },
  siberia:        { x: 1472, y: 78  },
  irkutsk:        { x: 1648, y: 102 },
  yakutsk:        { x: 1716, y: 36  },
  kamchatka:      { x: 1891, y: 102 },
  mongolia:       { x: 1560, y: 190 },
  japan:          { x: 1709, y: 256 },   // actual JP bbox center
  afghanistan:    { x: 1346, y: 262 },
  china:          { x: 1517, y: 273 },   // actual CN bbox center
  middleEast:     { x: 1244, y: 334 },
  india:          { x: 1428, y: 354 },
  siam:           { x: 1546, y: 408 },
  // Australia — positions from actual bboxes
  indonesia:      { x: 1656, y: 517 },   // actual ID center
  newGuinea:      { x: 1826, y: 544 },   // actual PG center
  westernAustralia: { x: 1660, y: 676 }, // left half of AU bbox (1603-1716, 570-782)
  easternAustralia: { x: 1878, y: 762 }, // actual NZ bbox center
};
