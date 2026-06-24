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
/**
 * SVG clip-path IDs used to split countries that span multiple Risk territories.
 * A clip path ID here means ALL class paths for that territory get clipped.
 * The matching <ClipPath> elements are defined in AfricaWorldMap.tsx.
 */
export const AFRICA_CLIP_IDS: Partial<Record<TerritoryId, string>> = {
  // Canada split using actual bbox (x:348-778, y:3-232).
  // 60°N latitude ≈ y=150 (linear interp: 232 - (60-49)/(83-49)*229 ≈ 157, rounded).
  // 97°W (AB/MB border) ≈ x=560, 80°W (ON/QC border) ≈ x=643.
  northwest:        'ca-north',   // all Canada above y=150
  alberta:          'ca-alberta', // Canada x<560, y>150
  ontario:          'ca-ontario', // Canada 560<x<643, y>150
  quebec:           'ca-quebec',  // Canada x>643, y>150
  // Australia split at 135°E (x≈1729 in world.svg coords)
  westernAustralia: 'au-west',
  easternAustralia: 'au-east',
};

export const AFRICA_CLASS_PATH_NAMES: Partial<Record<TerritoryId, string[]>> = {
  // ── North America ──────────────────────────────────────────────────────────
  // Canada actual bbox x:348-778, y:3-232 (49°N southern border).
  // Split lines: y=150 (~60°N), x=560 (97°W/AB-MB), x=643 (80°W/ON-QC).
  northwest:        ['Canada'],
  alberta:          ['Canada'],
  ontario:          ['Canada'],
  quebec:           ['Canada'],

  // ── Australia continent ────────────────────────────────────────────────────
  // Actual bboxes: AU mainland(1603-1829,570-752), Tasmania(1735-1758,763-782)
  //                ID(1526-1786,467-568), PG(1783-1869,518-570), NZ(1827-1930,723-801)
  // Split at 135°E → x=1729. Tasmania(x:1735+) falls in the east half.
  indonesia:        ['Indonesia'],
  newGuinea:        ['Papua New Guinea'],
  westernAustralia: ['Australia'],              // clipped to left of x=1729
  easternAustralia: ['Australia', 'New Zealand'], // Australia clipped to right of x=1729, NZ unclipped

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
  // ── North America ──────────────────────────────────────────────────────────
  // Canada territories use class paths + clip — NO polygon fallback needed here.
  // US is absent from world.svg entirely, so polygons are the only option.
  //
  // Calibrated from Canada's actual bbox (x:348-778, y:3-232):
  //   141°W → x=348, 97°W → x=560, 80°W → x=643, 67°W → x=705
  //   49°N → y=232 (Canada south), 60°N → y≈150, 55°N → y≈196
  //   Longitude scale ≈ 4.83 px/°, latitude scale ≈ 6.74 px/° (linear avg)

  // ── Canada longitude reference (scale 4.83 px/°, from actual bbox) ─────────
  //   141°W→348  130°W→401  117°W→464  97°W→561  80°W→643  67°W→706
  // ── Canada latitude reference (6.74 px/°, 49°N=232, 60°N=158) ─────────────
  //   71°N→84   65°N→124   60°N→158   56°N→185   54°N→198   49°N→232
  // ── Mexico latitude / US south (3.53 px/° 49→32°N, then 7.25 px/° below 32°N) ─
  //   32°N→292   25°N→343

  // Alaska: west of Canada's 141°W edge (x<348).
  // Vertices in clockwise order: western coast → N → NE corner (Yukon border) →
  // SE Yukon border → SE panhandle → SW coast.
  // Alaska connects to Canada at (348, 158) — matches the ca-north/ca-alberta clip boundary.
  alaska:
    '218,124 276,84 348,91 348,158 401,198 258,198 218,153',

  // Western US: 49→32°N, 124→97°W.  Leans left going south (Robinson projection).
  // Top edge: Canada calibration. Bottom edge: Mexico calibration.
  westernUS:
    '430,232 561,232 454,292 354,292',

  // Eastern US: 49→25°N, 97→67°W + Florida peninsula at 25°N.
  // At 25°N 81°W → x≈534 using Mexico calibration.
  easternUS:
    '561,232 706,239 534,343 454,292 561,232',

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
  // Recalibrated against Canada bbox (x:348-778, y:3-232) and actual Canada center (563,117≈60°N)
  alaska:         { x: 308,  y: 148 },  // centre of Alaska polygon
  northwest:      { x: 563,  y: 80  },  // centre of Canada above y=158 (≈60°N)
  alberta:        { x: 452,  y: 195 },  // centre of Canada x<561, y>158
  ontario:        { x: 601,  y: 195 },  // centre of Canada 561<x<643, y>158
  quebec:         { x: 706,  y: 195 },  // centre of Canada x>643, y>158
  greenland:      { x: 832,  y: 61  },  // actual GL bbox centre
  westernUS:      { x: 475,  y: 260 },  // centre of Western US polygon
  easternUS:      { x: 585,  y: 285 },  // centre of Eastern US polygon
  centralAmerica: { x: 470,  y: 390 },  // near MX/Guatemala centre
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
  westernAustralia: { x: 1666, y: 661 }, // center of AU west half (1603-1729, 570-752)
  easternAustralia: { x: 1779, y: 661 }, // center of AU east half (1729-1829, 570-752)
};
