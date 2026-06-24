import { TerritoryId } from './riskWorldTerritories';

/**
 * Polygon overrides and label positions for the Atlantic-centered (Africa) map.
 * Based on world.svg (viewBox 0 0 2000 857).
 *
 * Coordinate system:
 *   x = 1000 + lon_east * 5.4   (lon_west is negative)
 *   y = 455  - lat_north * 6.3  (lat_south is negative)
 *
 * These override the Pacific polygons from riskWorldTerritories.ts for territories
 * that need sub-country splits or whose SVG paths are absent from world.svg.
 */

export const AFRICA_POLYGONS: Partial<Record<TerritoryId, string>> = {
  // ── North America (US, CA not in world.svg → full polygons) ───────────────
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

  // ── South America (AR, CL not in world.svg) ───────────────────────────────
  argentina:
    '606,594 714,594 714,802 606,802',

  // ── Europe (GB, FR, IT, GR, NO, DK not in world.svg) ─────────────────────
  greatBritain:
    '967,89 1005,89 1020,135 1020,178 976,188 950,148 967,89',
  scandinavia:
    '1042,35 1108,35 1108,102 1042,102',
  westernEurope:
    '960,145 1050,145 1065,215 1005,222 950,195 960,145',
  southernEurope:
    '1038,168 1100,168 1115,228 1075,262 1042,240 1038,168',

  // ── Asia (RU, CN, JP not in world.svg) ────────────────────────────────────
  ural:
    '1270,15 1351,15 1351,140 1270,140',
  siberia:
    '1351,15 1594,15 1594,140 1351,140',
  irkutsk:
    '1594,65 1702,65 1702,140 1594,140',
  yakutsk:
    '1594,8 1837,8 1837,65 1594,65',
  kamchatka:
    '1837,65 1945,65 1945,140 1837,140',
  china:
    '1394,120 1720,120 1648,325 1540,325 1394,298',
  japan:
    '1702,172 1783,172 1783,290 1702,290',

  // ── Australia (AU, NZ, PG, ID not in world.svg) ───────────────────────────
  indonesia:
    '1513,424 1762,424 1762,490 1513,490',
  newGuinea:
    '1702,455 1810,455 1810,518 1702,518',
  westernAustralia:
    '1616,518 1729,518 1729,695 1616,695',
  easternAustralia:
    '1729,518 1826,518 1826,695 1729,695',
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
  argentina:      { x: 649,  y: 698 },
  // Europe
  iceland:        { x: 903,  y: 52  },
  greatBritain:   { x: 988,  y: 138 },
  northernEurope: { x: 1082, y: 98  },
  scandinavia:    { x: 1075, y: 68  },
  westernEurope:  { x: 1010, y: 184 },
  southernEurope: { x: 1078, y: 216 },
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
  japan:          { x: 1742, y: 232 },
  afghanistan:    { x: 1346, y: 262 },
  china:          { x: 1552, y: 222 },
  middleEast:     { x: 1244, y: 334 },
  india:          { x: 1428, y: 354 },
  siam:           { x: 1546, y: 408 },
  // Australia
  indonesia:      { x: 1637, y: 457 },
  newGuinea:      { x: 1756, y: 487 },
  westernAustralia: { x: 1672, y: 606 },
  easternAustralia: { x: 1778, y: 606 },
};
