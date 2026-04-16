'use client';

/**
 * useParticleLayer — Animated PFAS / ash particle physics layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Drives a Lagrangian particle system (lib/simulation/particle-system.ts)
 * via a 30-fps requestAnimationFrame loop and exposes it as a deck.gl
 * ScatterplotLayer.
 *
 * Particle colour encoding:
 *   fresh (age 0–15%)  → fire-orange/red      (near-source, hot plume)
 *   young (15–35%)     → amber/yellow          (PFAS dispersing)
 *   mid   (35–60%)     → cyan/teal             (diluting, downwind)
 *   old   (60–100%)    → purple/indigo + fade  (trace concentration)
 *
 * Scenario colours:
 *   pfas  → violet → purple spectrum
 *   ash   → grey  → white spectrum
 *   fire  → red   → orange spectrum
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useMapStore } from '@/store/mapStore';
import {
  ParticleSystem,
  type Particle,
  type ParticleConfig,
} from '@/lib/simulation/particle-system';

// ── Tunables ──────────────────────────────────────────────────────────────
const MAX_PARTICLES     = 900;
const PARTICLES_PER_FR  = 14;
const MAX_AGE_SEC       = 50;
const SIM_FPS           = 30;
const TICK_MS           = 1000 / SIM_FPS;

// ── Particle visual encoding ──────────────────────────────────────────────
function pfasColor(ageFrac: number, conc: number): [number, number, number, number] {
  const alpha = Math.round(Math.max(0, Math.min(255, conc * 200 * (1 - ageFrac * 0.7))));
  if (ageFrac < 0.15) return [255, 80, 20, alpha];          // fire-orange
  if (ageFrac < 0.35) return [245, 185, 0, alpha];          // amber
  if (ageFrac < 0.60) return [0, 200, 200, alpha];          // teal
  return [140, 0, 255, Math.round(alpha * 0.6)];             // purple trace
}

function ashColor(ageFrac: number, conc: number): [number, number, number, number] {
  const v = Math.round(120 + conc * 90);
  const alpha = Math.round(conc * 180 * (1 - ageFrac * 0.6));
  return [v, v, v, Math.max(0, alpha)];
}

function fireColor(ageFrac: number, conc: number): [number, number, number, number] {
  const alpha = Math.round(conc * 230 * (1 - ageFrac * 0.8));
  if (ageFrac < 0.2) return [255, 40, 0, alpha];            // deep red
  if (ageFrac < 0.5) return [255, 130, 0, alpha];           // orange
  return [220, 200, 0, Math.round(alpha * 0.7)];             // yellow smoke
}

function particleColor(p: Particle): [number, number, number, number] {
  const ageFrac = p.age / p.maxAge;
  switch (p.scenario) {
    case 'ash':  return ashColor(ageFrac, p.concentration);
    case 'fire': return fireColor(ageFrac, p.concentration);
    default:     return pfasColor(ageFrac, p.concentration);
  }
}

function particleRadius(p: Particle): number {
  const ageFrac = p.age / p.maxAge;
  // Grows slightly as plume disperses, then fades
  return 3 + ageFrac * 6;
}

// ── Hook ─────────────────────────────────────────────────────────────────
export function useParticleLayer() {
  const { nvidiaSimConfig, particleLayerActive, pfasScenario } = useMapStore();
  const systemRef  = useRef<ParticleSystem>(new ParticleSystem(42));
  const rafRef     = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Map pfasScenario → particle scenario
  const scenario = useMemo((): ParticleConfig['scenario'] => {
    if (pfasScenario === 'ash_leachate') return 'ash';
    if (pfasScenario === 'fire_event')   return 'fire';
    if (pfasScenario === 'combined')     return 'combined';
    return 'pfas';
  }, [pfasScenario]);

  const config: ParticleConfig = useMemo(() => ({
    windSpeedMs:      nvidiaSimConfig.windSpeed,
    windBearingDeg:   nvidiaSimConfig.windBearing,
    emissionRateGs:   nvidiaSimConfig.emissionRate,
    stabilityClass:   nvidiaSimConfig.stabilityClass,
    stackHeight:      nvidiaSimConfig.releaseHeight,
    particlesPerFrame: PARTICLES_PER_FR,
    maxParticles:     MAX_PARTICLES,
    maxAgeSec:        MAX_AGE_SEC,
    fps:              SIM_FPS,
    scenario,
  }), [nvidiaSimConfig, scenario]);

  // Reset when wind changes significantly
  useEffect(() => {
    systemRef.current.reset();
  }, [nvidiaSimConfig.windBearing, nvidiaSimConfig.windSpeed, pfasScenario]);

  const tick = useCallback((timestamp: number) => {
    if (timestamp - lastTickRef.current >= TICK_MS) {
      lastTickRef.current = timestamp;
      const updated = systemRef.current.tick(config);
      setParticles(updated.slice()); // shallow copy triggers re-render
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [config]);

  useEffect(() => {
    if (!particleLayerActive) {
      setParticles([]);
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [particleLayerActive, tick]);

  if (!particleLayerActive || particles.length === 0) return [];

  return [
    new ScatterplotLayer<Particle>({
      id:          'pfas-particle-layer',
      data:         particles,
      getPosition: (p) => [p.lng, p.lat, 0],
      getRadius:   particleRadius,
      getFillColor: particleColor,
      radiusUnits: 'pixels',
      stroked:     false,
      pickable:    false,
      // Re-render every frame by using live particle data
      updateTriggers: {
        getPosition:  particles.length,
        getRadius:    particles.length,
        getFillColor: particles.length,
      },
    }),
  ];
}
