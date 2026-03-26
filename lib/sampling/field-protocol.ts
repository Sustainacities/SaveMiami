/**
 * Field Sampling Protocol Engine
 * ─────────────────────────────────────────────────────────────
 * Implements Dr. Phil's composite sampling methodology:
 *
 *   • N random grab samples (default 9) within 1 mile WEST
 *     of each smokestack / emission point
 *   • Rationale: Miami-Dade prevailing winds are easterly (SE/ESE)
 *     → contaminant deposition footprint lies to the WEST
 *   • Samples are composited (homogenized, equal-volume aliquots)
 *     before laboratory analysis — reduces per-analysis cost while
 *     capturing spatial variability
 *   • Sampling depth standardized (default 0–15 cm surface soil,
 *     adjustable to capture deeper historical deposition)
 *
 * Parameters are all adjustable to reflect Dr. Phil's evolving protocol.
 *
 * Target analytes: PFAS (EPA Method 533 / 537.1), Dioxin/Furan (EPA 8290A),
 *   Heavy Metals (EPA 6010D / 7471B), PM2.5 deposition proxies
 */

// ── Types ─────────────────────────────────────────────────────

export interface SamplingConfig {
  /** Number of grab samples per smokestack (default 9) */
  sampleCount: number;
  /** Radius from smokestack, miles (default 1.0) */
  radiusMiles: number;
  /** Arc direction — degrees from north defining the CENTER of sampling arc */
  arcCenterBearing: number;
  /** Total arc width in degrees (samples spread within this wedge) */
  arcWidthDeg: number;
  /** Minimum distance from source, miles (exclusion zone) */
  minRadiusMiles: number;
  /** Sampling depth range, cm */
  depthMin_cm: number;
  depthMax_cm: number;
  /** Analytical parameters */
  analytes: AnalyteGroup[];
  /** Random seed for reproducible sample placement */
  seed?: number;
}

export type AnalyteGroup =
  | 'PFAS_533'
  | 'PFAS_537'
  | 'Dioxin_Furan_8290A'
  | 'Heavy_Metals_6010D'
  | 'Mercury_7471B'
  | 'Asbestos_PLM'
  | 'PAH_8270D'
  | 'VOC_8260B';

export interface SamplePoint {
  id:            string;
  stackId:       string;
  sampleIndex:   number;
  lat:           number;
  lng:           number;
  bearingFromStack: number;   // degrees
  distanceMiles: number;
  distanceM:     number;
  depth_cm:      string;      // e.g. "0–15 cm"
  composite:     boolean;     // true = this is the virtual composite point
  /** Placeholder for lab results (populated from field data) */
  results?:      AnalyteResults;
}

export interface AnalyteResults {
  PFOA_ppt?:  number;
  PFOS_ppt?:  number;
  PFHxS_ppt?: number;
  PFNA_ppt?:  number;
  totalPFAS_ppt?: number;
  dioxin_TEQ_ngKg?: number;
  lead_ppm?:  number;
  mercury_ppm?: number;
  cadmium_ppm?: number;
  sampledAt?: string;
  lab?:       string;
  qc_flag?:   string;
}

export interface StackDefinition {
  id:    string;
  name:  string;
  lat:   number;
  lng:   number;
  heightM: number;
  unit:  number;
}

export interface CompositeSample {
  stackId:     string;
  samples:     SamplePoint[];
  centroid:    { lat: number; lng: number };
  /** Composite = average of all grab samples */
  composite:   SamplePoint;
  protocol:    string;
  generatedAt: string;
}

// ── Miami-Dade Incinerator Smokestacks ────────────────────────
// Resources Recovery Facility, Doral — 3 boiler units
export const INCINERATOR_STACKS: StackDefinition[] = [
  { id: 'STACK-U1', name: 'Unit 1 Stack', lat: 25.8018, lng: -80.3540, heightM: 85, unit: 1 },
  { id: 'STACK-U2', name: 'Unit 2 Stack', lat: 25.8010, lng: -80.3530, heightM: 85, unit: 2 },
  { id: 'STACK-U3', name: 'Unit 3 Stack', lat: 25.8002, lng: -80.3525, heightM: 85, unit: 3 },
];

// ── Default protocol (Dr. Phil) ───────────────────────────────
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  sampleCount:       9,
  radiusMiles:       1.0,
  arcCenterBearing:  270,   // due West — easterly winds deposit contaminants W of source
  arcWidthDeg:       120,   // 60° each side of due West (210°–330°)
  minRadiusMiles:    0.05,  // 80m exclusion zone around the stack itself
  depthMin_cm:       0,
  depthMax_cm:       15,
  analytes: ['PFAS_533', 'PFAS_537', 'Dioxin_Furan_8290A', 'Heavy_Metals_6010D'],
  seed:              42,
};

// ── Haversine helpers ─────────────────────────────────────────

const R_EARTH_M = 6371000;

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }

/**
 * Destination point given origin, bearing (deg from N), distance (m)
 */
export function destinationPoint(
  lat: number, lng: number,
  bearingDeg: number, distanceM: number
): { lat: number; lng: number } {
  const δ  = distanceM / R_EARTH_M;
  const θ  = toRad(bearingDeg);
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return { lat: toDeg(φ2), lng: toDeg(λ2) };
}

/** Distance between two points in meters */
export function haversineM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_EARTH_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Seeded PRNG (simple Mulberry32) ──────────────────────────
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Core sampling algorithm ───────────────────────────────────

/**
 * Generate N random sample points in the western arc around a smokestack.
 *
 * The sampling zone is a wedge:
 *   bearing: arcCenter ± arcWidth/2
 *   distance: minRadius … radius
 *
 * Points are distributed uniformly within the wedge (area-weighted radial
 * distribution to avoid clustering near the source).
 */
export function generateSamplePoints(
  stack: StackDefinition,
  config: SamplingConfig,
  seedOffset = 0,
): SamplePoint[] {
  const rand = mulberry32((config.seed ?? 42) + seedOffset + stack.unit * 1000);

  const radiusM    = config.radiusMiles    * 1609.344;
  const minRadiusM = config.minRadiusMiles * 1609.344;
  const halfArc    = config.arcWidthDeg / 2;
  const bearingMin = config.arcCenterBearing - halfArc;
  const bearingMax = config.arcCenterBearing + halfArc;
  const depthLabel = `${config.depthMin_cm}–${config.depthMax_cm} cm`;

  const points: SamplePoint[] = [];

  for (let i = 0; i < config.sampleCount; i++) {
    // Area-uniform radial distribution: r = sqrt(u) * maxR
    const r = Math.sqrt(
      (rand() * (radiusM ** 2 - minRadiusM ** 2)) + minRadiusM ** 2
    );
    const bearing = bearingMin + rand() * (bearingMax - bearingMin);
    // Normalize bearing to 0–360
    const bearingNorm = ((bearing % 360) + 360) % 360;

    const dest = destinationPoint(stack.lat, stack.lng, bearingNorm, r);

    points.push({
      id:               `${stack.id}-S${String(i + 1).padStart(2, '0')}`,
      stackId:          stack.id,
      sampleIndex:      i + 1,
      lat:              dest.lat,
      lng:              dest.lng,
      bearingFromStack: bearingNorm,
      distanceMiles:    r / 1609.344,
      distanceM:        r,
      depth_cm:         depthLabel,
      composite:        false,
    });
  }

  return points;
}

/**
 * Compute the centroid of N sample points (geographic mean).
 * This marks where the composite sample "lives" conceptually on the map.
 */
export function computeCentroid(points: SamplePoint[]): { lat: number; lng: number } {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

/**
 * Build a full CompositeSample for a given stack + config.
 */
export function buildCompositeSample(
  stack: StackDefinition,
  config: SamplingConfig,
  seedOffset = 0,
): CompositeSample {
  const samples  = generateSamplePoints(stack, config, seedOffset);
  const centroid = computeCentroid(samples);
  const depthLabel = `${config.depthMin_cm}–${config.depthMax_cm} cm`;

  const composite: SamplePoint = {
    id:               `${stack.id}-COMP`,
    stackId:          stack.id,
    sampleIndex:      0,
    lat:              centroid.lat,
    lng:              centroid.lng,
    bearingFromStack: config.arcCenterBearing,
    distanceMiles:    config.radiusMiles / 2,
    distanceM:        (config.radiusMiles / 2) * 1609.344,
    depth_cm:         depthLabel,
    composite:        true,
  };

  return {
    stackId:     stack.id,
    samples,
    centroid,
    composite,
    protocol:    buildProtocolString(config),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate all composite samples for all stacks.
 */
export function buildAllCompositeSamples(
  stacks: StackDefinition[],
  config: SamplingConfig,
): CompositeSample[] {
  return stacks.map((stack, i) => buildCompositeSample(stack, config, i * 100));
}

/**
 * Generate the sampling arc polygon (wedge) for visual overlay on map.
 * Returns an array of [lng, lat] points forming the wedge outline.
 */
export function generateSamplingArcPolygon(
  stack: StackDefinition,
  config: SamplingConfig,
  segments = 32,
): [number, number][] {
  const radiusM    = config.radiusMiles    * 1609.344;
  const minRadiusM = config.minRadiusMiles * 1609.344;
  const halfArc    = config.arcWidthDeg / 2;
  const bearingMin = config.arcCenterBearing - halfArc;
  const bearingMax = config.arcCenterBearing + halfArc;

  const polygon: [number, number][] = [];

  // Inner arc (min radius)
  for (let i = 0; i <= segments; i++) {
    const b = bearingMin + (i / segments) * (bearingMax - bearingMin);
    const d = destinationPoint(stack.lat, stack.lng, b, minRadiusM);
    polygon.push([d.lng, d.lat]);
  }
  // Outer arc (max radius, reversed)
  for (let i = segments; i >= 0; i--) {
    const b = bearingMin + (i / segments) * (bearingMax - bearingMin);
    const d = destinationPoint(stack.lat, stack.lng, b, radiusM);
    polygon.push([d.lng, d.lat]);
  }
  // Close
  polygon.push(polygon[0]);

  return polygon;
}

// ── Protocol string builder ───────────────────────────────────

function buildProtocolString(config: SamplingConfig): string {
  return [
    `N=${config.sampleCount} grab samples`,
    `within ${config.radiusMiles} mi`,
    `arc: ${config.arcCenterBearing}°±${config.arcWidthDeg / 2}° (${bearingName(config.arcCenterBearing)} sector)`,
    `depth: ${config.depthMin_cm}–${config.depthMax_cm} cm`,
    `composite: equal-volume aliquots`,
    `analytes: ${config.analytes.join(', ')}`,
  ].join(' | ');
}

function bearingName(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

// ── Concentration heat map from sample results ────────────────

/**
 * Given an array of sample points with lab results, generate a
 * deck.gl-compatible weighted point array for HeatmapLayer.
 * Points without results get weight 0 (shown as "no data" markers).
 */
export function samplesToHeatmapPoints(
  samples: SamplePoint[],
  analyte: keyof AnalyteResults = 'PFOA_ppt',
  maxVal?: number,
): Array<{ position: [number, number]; weight: number; raw: number | undefined }> {
  const vals = samples
    .map((s) => (s.results?.[analyte] as number | undefined))
    .filter((v): v is number => v !== undefined);

  const max = maxVal ?? (vals.length > 0 ? Math.max(...vals) : 100);

  return samples.map((s) => {
    const raw = s.results?.[analyte] as number | undefined;
    return {
      position: [s.lng, s.lat],
      weight:   raw !== undefined ? Math.min(raw / max, 1) : 0,
      raw,
    };
  });
}

// ── Export helpers ────────────────────────────────────────────

/** Export sample locations as CSV for field teams */
export function exportSamplesCSV(composites: CompositeSample[]): string {
  const header = [
    'Sample_ID', 'Stack_ID', 'Latitude', 'Longitude',
    'Bearing_deg', 'Distance_mi', 'Depth_cm', 'Is_Composite',
    'PFOA_ppt', 'PFOS_ppt', 'totalPFAS_ppt', 'Protocol',
  ].join(',');

  const rows = composites.flatMap(({ samples, composite, protocol }) =>
    [...samples, composite].map((s) => [
      s.id, s.stackId, s.lat.toFixed(6), s.lng.toFixed(6),
      s.bearingFromStack.toFixed(1), s.distanceMiles.toFixed(3),
      s.depth_cm, s.composite ? 'YES' : 'NO',
      s.results?.PFOA_ppt ?? '', s.results?.PFOS_ppt ?? '',
      s.results?.totalPFAS_ppt ?? '',
      s.composite ? protocol : '',
    ].join(','))
  );

  return [header, ...rows].join('\n');
}

/** Export as GeoJSON for GIS software */
export function exportSamplesGeoJSON(composites: CompositeSample[]): string {
  const features = composites.flatMap(({ samples, composite }) =>
    [...samples, composite].map((s) => ({
      type: 'Feature' as const,
      properties: {
        ...s,
        position: undefined, // exclude raw position, use geometry
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lng, s.lat],
      },
    }))
  );

  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}
