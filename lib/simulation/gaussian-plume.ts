/**
 * Gaussian Plume Dispersion Model
 * ─────────────────────────────────────────────────────────────
 * Implements the Pasquill-Gifford-Turner atmospheric dispersion model
 * used to estimate PFAS contaminant spread from the Miami-Dade
 * Resources Recovery Facility incinerator and fire event.
 *
 * Reference:
 *   Turner, D.B. (1994). Workbook of Atmospheric Dispersion Estimates.
 *   EPA Publication AP-26.
 *
 * NVIDIA Integration:
 *   This model is designed to be offloaded to NVIDIA Modulus (physics-ML)
 *   and NVIDIA cuSPATIAL for GPU-accelerated spatial interpolation.
 *   See: lib/nvidia/modulus-client.ts for Omniverse integration.
 */

export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

// Pasquill-Gifford sigma coefficients (Turner 1970)
const PG_SIGMA_Y: Record<StabilityClass, { a: number; b: number }> = {
  A: { a: 0.22, b: 0.0001 },
  B: { a: 0.16, b: 0.0001 },
  C: { a: 0.11, b: 0.0001 },
  D: { a: 0.08, b: 0.0001 },
  E: { a: 0.06, b: 0.0001 },
  F: { a: 0.04, b: 0.0001 },
};

const PG_SIGMA_Z: Record<StabilityClass, { c: number; d: number; f: number }> = {
  A: { c: 0.20, d: 0, f: 0 },
  B: { c: 0.12, d: 0, f: 0 },
  C: { c: 0.08, d: 0.0002, f: 0 },
  D: { c: 0.06, d: 0.0015, f: 0 },
  E: { c: 0.03, d: 0.0003, f: -1 },
  F: { c: 0.016, d: 0.0003, f: -1 },
};

export interface PlumeSample {
  lng: number;
  lat: number;
  concentration: number;  // µg/m³
  uncertainty: number;    // 0-1
}

export interface PlumeConfig {
  /** Source location */
  sourceLng: number;
  sourceLat: number;
  /** Stack / release height (m) */
  stackHeightM: number;
  /** Emission rate (g/s) — PFAS equivalent */
  emissionRateGS: number;
  /** Wind speed at stack height (m/s) */
  windSpeedMS: number;
  /** Wind direction FROM (meteorological degrees, 0=N, 90=E) */
  windDirectionDeg: number;
  /** Pasquill-Gifford stability class */
  stabilityClass: StabilityClass;
  /** Grid resolution (degrees) */
  gridResolutionDeg?: number;
  /** Max downwind distance (km) */
  maxDistanceKm?: number;
  /** Include terrain reflection? */
  groundReflection?: boolean;
}

/** Convert degrees to radians */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Compute lateral (y) dispersion sigma for downwind distance x (m)
 */
function sigmaY(x: number, cls: StabilityClass): number {
  const { a } = PG_SIGMA_Y[cls];
  return a * Math.pow(x, 0.894);
}

/**
 * Compute vertical (z) dispersion sigma for downwind distance x (m)
 */
function sigmaZ(x: number, cls: StabilityClass): number {
  const coeff = PG_SIGMA_Z[cls];
  const raw = coeff.c * Math.pow(x, 0.894) + coeff.d * x;
  return Math.max(raw, 1);
}

/**
 * Core Gaussian plume concentration formula
 * C(x,y,z) = Q / (2π·u·σy·σz) ·
 *             exp(-y²/2σy²) ·
 *             [exp(-(z-H)²/2σz²) + exp(-(z+H)²/2σz²)]  ← ground reflection
 *
 * @returns Concentration in µg/m³ at ground level (z=0)
 */
function gaussianConcentration(
  x: number,          // downwind distance (m)
  y: number,          // crosswind distance (m)
  Q: number,          // emission rate (g/s → µg/s: ×1e6)
  u: number,          // wind speed (m/s)
  H: number,          // effective stack height (m)
  cls: StabilityClass,
  groundReflection = true,
): number {
  if (x <= 0) return 0;

  const sy = sigmaY(x, cls);
  const sz = sigmaZ(x, cls);

  const qMicro = Q * 1e6; // g/s → µg/s

  const horizontal = Math.exp(-0.5 * Math.pow(y / sy, 2));
  const vertDirect = Math.exp(-0.5 * Math.pow(H / sz, 2));
  const vertReflect = groundReflection
    ? Math.exp(-0.5 * Math.pow(H / sz, 2))
    : 0;

  const C =
    (qMicro / (2 * Math.PI * u * sy * sz)) *
    horizontal *
    (vertDirect + vertReflect);

  return Math.max(C, 0);
}

/**
 * Convert lat/lng offset to local x/y coordinates relative to source
 * aligned with wind direction
 */
function toWindCoords(
  sourceLng: number,
  sourceLat: number,
  targetLng: number,
  targetLat: number,
  windDirectionDeg: number,
): { x: number; y: number } {
  // 1° latitude ≈ 111,320 m
  const dxM = (targetLng - sourceLng) * 111320 * Math.cos(toRad(sourceLat));
  const dyM = (targetLat - sourceLat) * 111320;

  // Wind transport direction (meteorological → math convention)
  // "Wind from 90°E" means transport toward 270°W
  const transportDeg = (windDirectionDeg + 180) % 360;
  const transportRad = toRad(90 - transportDeg); // math angle

  // Rotate into wind coordinates
  const x = dxM * Math.cos(transportRad) + dyM * Math.sin(transportRad);
  const y = -dxM * Math.sin(transportRad) + dyM * Math.cos(transportRad);

  return { x, y };
}

/**
 * Generate a grid of plume concentration samples
 * Ready for deck.gl HeatmapLayer or GridLayer rendering.
 */
export function generatePlumeGrid(config: PlumeConfig): PlumeSample[] {
  const {
    sourceLng,
    sourceLat,
    stackHeightM,
    emissionRateGS,
    windSpeedMS,
    windDirectionDeg,
    stabilityClass,
    gridResolutionDeg = 0.005,
    maxDistanceKm = 40,
    groundReflection = true,
  } = config;

  const samples: PlumeSample[] = [];
  const maxDeg = maxDistanceKm / 111.32;
  const u = Math.max(windSpeedMS, 0.5); // Avoid division by zero

  for (let dlat = -maxDeg; dlat <= maxDeg; dlat += gridResolutionDeg) {
    for (let dlng = -maxDeg; dlng <= maxDeg; dlng += gridResolutionDeg) {
      const lat = sourceLat + dlat;
      const lng = sourceLng + dlng;

      const { x, y } = toWindCoords(
        sourceLng, sourceLat, lng, lat, windDirectionDeg
      );

      // Only calculate downwind samples (x > 100m from source)
      if (x < 100) continue;

      const concentration = gaussianConcentration(
        x, y,
        emissionRateGS,
        u,
        stackHeightM,
        stabilityClass,
        groundReflection,
      );

      if (concentration < 0.001) continue; // Skip negligible concentrations

      // Uncertainty grows with distance (simplified)
      const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111.32;
      const uncertainty = Math.min(0.95, 0.1 + distKm / (maxDistanceKm * 2));

      samples.push({ lng, lat, concentration, uncertainty });
    }
  }

  return samples;
}

/**
 * Generate a time-evolving plume for animation
 * Returns an array of frames, each with plume samples
 */
export function generatePlumeAnimation(
  config: PlumeConfig,
  durationHours: number,
  framesPerHour = 2,
): PlumeSample[][] {
  const frames: PlumeSample[][] = [];
  const totalFrames = durationHours * framesPerHour;

  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / totalFrames;
    // Scale emission rate over time (peaks at 40% of fire duration)
    const emissionScale =
      progress < 0.4
        ? progress / 0.4
        : 1 - (progress - 0.4) / 0.6;

    frames.push(
      generatePlumeGrid({
        ...config,
        emissionRateGS: config.emissionRateGS * emissionScale,
      })
    );
  }

  return frames;
}

/**
 * Convert plume samples to deck.gl-compatible format
 */
export function plumeToDeckGLPoints(samples: PlumeSample[]) {
  return samples.map((s) => ({
    position: [s.lng, s.lat, 0] as [number, number, number],
    weight: s.concentration,
    uncertainty: s.uncertainty,
  }));
}

/**
 * Compute the concentration isoline values for a given risk threshold
 * EPA PFAS MCL = 4 ppt (parts per trillion) = 0.004 µg/m³ equivalent
 */
export const PFAS_RISK_THRESHOLDS = {
  critical:  { label: 'Critical',  concentrationUgM3: 1.0,   color: [220, 38,  38,  220] }, // EPA MCL ×250
  high:      { label: 'High',      concentrationUgM3: 0.1,   color: [245, 158, 11,  180] }, // EPA MCL ×25
  elevated:  { label: 'Elevated',  concentrationUgM3: 0.01,  color: [124, 58,  237, 140] }, // EPA MCL ×2.5
  detectable:{ label: 'Detectable',concentrationUgM3: 0.001, color: [0,   180, 216, 80]  }, // trace
} as const;
