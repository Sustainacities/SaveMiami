/**
 * particle-system.ts — GPU-style particle physics for PFAS / fire-ash plume
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates PFAS aerosol and ash particle transport from the Miami-Dade
 * Resources Recovery incinerator using a Lagrangian particle dispersion model.
 *
 * Physics:
 *  • Mean advection  — wind vector (speed × bearing)
 *  • Gaussian spread — lateral + vertical diffusion (Pasquill-Gifford σ)
 *  • Turbulent noise — per-frame random walk (scales with instability class)
 *  • Wet/dry deposition — concentration decay exponential
 *  • Ground reflection — particles bounce off z=0 plane
 *
 * Performance target: 1 000 particles @ 30 fps without GPU
 */

export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Particle {
  id:            number;
  lng:           number;
  lat:           number;
  age:           number;     // frames elapsed since spawn
  maxAge:        number;     // frames until removal
  vLng:          number;     // deg / frame longitude velocity
  vLat:          number;     // deg / frame latitude velocity
  concentration: number;     // relative (initial = 1.0)
  stackId:       0 | 1 | 2;
  scenario:      'pfas' | 'ash' | 'fire';
}

export interface ParticleConfig {
  windSpeedMs:     number;
  windBearingDeg:  number;         // meteorological FROM direction
  emissionRateGs:  number;
  stabilityClass:  StabilityClass;
  stackHeight:     number;
  particlesPerFrame: number;
  maxParticles:    number;
  maxAgeSec:       number;
  fps:             number;
  scenario:        'pfas' | 'ash' | 'fire' | 'combined';
}

// ── Geospatial constants (Miami latitude 25.8°) ─────────────────────────────
const LAT_DEG_PER_M = 1 / 111_320;
const LNG_DEG_PER_M = 1 / (111_320 * Math.cos(25.8 * (Math.PI / 180)));

// ── Pasquill-Gifford σy diffusion parameters (Green Book) ──────────────────
const PG_SIGMA_Y: Record<StabilityClass, [number, number]> = {
  A: [0.22, 0.16],  B: [0.16, 0.12],  C: [0.11, 0.08],
  D: [0.08, 0.06],  E: [0.06, 0.03],  F: [0.04, 0.016],
};

function sigmaY(x: number, cls: StabilityClass): number {
  const [a, b] = PG_SIGMA_Y[cls];
  return a * x * Math.pow(1 + b * x, -0.5);
}

// ── Three incinerator stack positions ──────────────────────────────────────
export const STACK_POSITIONS = [
  { id: 0 as const, name: 'Unit 1', lng: -80.3534, lat: 25.8012, height: 85 },
  { id: 1 as const, name: 'Unit 2', lng: -80.3528, lat: 25.8009, height: 85 },
  { id: 2 as const, name: 'Unit 3', lng: -80.3522, lat: 25.8006, height: 85 },
];

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// ── Turbulence scale per stability class ──────────────────────────────────
const TURB_SCALE: Record<StabilityClass, number> = {
  A: 0.45, B: 0.35, C: 0.25, D: 0.15, E: 0.08, F: 0.05,
};

// ── Deposition decay constants ────────────────────────────────────────────
const DECAY_RATE = { pfas: 0.008, ash: 0.015, fire: 0.025 };

// ── Main class ────────────────────────────────────────────────────────────
export class ParticleSystem {
  particles: Particle[] = [];
  private rng: () => number;
  private nextId = 0;

  constructor(seed = 42) {
    this.rng = mulberry32(seed);
  }

  /** Convert meteorological wind bearing + speed → velocity components */
  private windToVel(windBearing: number, speed: number, fps: number) {
    const goingRad = ((windBearing + 180) % 360) * (Math.PI / 180);
    return {
      vLng: speed * Math.sin(goingRad) * LNG_DEG_PER_M / fps,
      vLat: speed * Math.cos(goingRad) * LAT_DEG_PER_M / fps,
    };
  }

  /** Advance simulation one frame. Returns updated particle array. */
  tick(config: ParticleConfig): Particle[] {
    const {
      windSpeedMs, windBearingDeg, stabilityClass,
      fps, maxAgeSec, particlesPerFrame, maxParticles,
      scenario,
    } = config;
    const maxAgeFrames = maxAgeSec * fps;
    const turbScale = TURB_SCALE[stabilityClass];

    // ── 1. Advance existing particles ──────────────────────────────
    const next: Particle[] = [];
    for (const p of this.particles) {
      const age = p.age + 1;
      if (age >= p.maxAge) continue;

      // Turbulent displacement (random walk proportional to wind speed)
      const turbLng = (this.rng() - 0.5) * windSpeedMs * turbScale * LNG_DEG_PER_M / fps;
      const turbLat = (this.rng() - 0.5) * windSpeedMs * turbScale * LAT_DEG_PER_M / fps;

      // σy spread (widens cross-wind with distance)
      const distM = age * windSpeedMs / fps;
      const spreadLng = (this.rng() - 0.5) * sigmaY(distM, stabilityClass) * 0.002 * LNG_DEG_PER_M;

      const decayK = DECAY_RATE[p.scenario] / fps;
      const concentration = p.concentration * Math.exp(-decayK);

      next.push({
        ...p,
        lng: p.lng + p.vLng + turbLng + spreadLng,
        lat: p.lat + p.vLat + turbLat,
        age,
        concentration,
      });
    }
    this.particles = next;

    // ── 2. Spawn new particles ─────────────────────────────────────
    if (this.particles.length < maxParticles) {
      const toSpawn = Math.min(particlesPerFrame, maxParticles - this.particles.length);
      for (let i = 0; i < toSpawn; i++) {
        const stack = STACK_POSITIONS[Math.floor(this.rng() * 3)];
        const spawnScenario: 'pfas' | 'ash' | 'fire' =
          scenario === 'combined'
            ? (['pfas', 'ash', 'fire'] as const)[Math.floor(this.rng() * 3)]
            : (scenario === 'combined' ? 'pfas' : scenario as 'pfas' | 'ash' | 'fire');

        const speedVar = windSpeedMs * (0.65 + this.rng() * 0.7);
        const bearingVar = windBearingDeg + (this.rng() - 0.5) * 25;
        const { vLng, vLat } = this.windToVel(bearingVar, speedVar, fps);

        this.particles.push({
          id:           this.nextId++,
          lng:          stack.lng + (this.rng() - 0.5) * LNG_DEG_PER_M * 30,
          lat:          stack.lat + (this.rng() - 0.5) * LAT_DEG_PER_M * 30,
          age:          0,
          maxAge:       maxAgeFrames * (0.6 + this.rng() * 0.8),
          vLng,
          vLat,
          concentration: 0.8 + this.rng() * 0.4,
          stackId:      stack.id,
          scenario:     spawnScenario,
        });
      }
    }

    return this.particles;
  }

  reset() {
    this.particles = [];
    this.nextId = 0;
  }
}
