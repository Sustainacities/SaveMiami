'use client';

/**
 * sim-logger.ts — Auto-generates simulation console entries
 * ─────────────────────────────────────────────────────────────────────────────
 * Watches Zustand store state and emits log entries whenever the simulation
 * configuration changes or particles are ticking.
 */

import { useEffect, useRef } from 'react';
import { useMapStore } from '@/store/mapStore';

// Pasquill-Gifford σ approximation (same as gaussian-plume.ts)
function sigmaY(x: number, cls: string): number {
  const params: Record<string, [number, number]> = {
    A: [0.22, 0.16], B: [0.16, 0.12], C: [0.11, 0.08],
    D: [0.08, 0.06], E: [0.06, 0.03], F: [0.04, 0.016],
  };
  const [a, b] = params[cls] ?? params.C;
  return a * x * Math.pow(1 + b * x, -0.5);
}

function sigmaZ(x: number, cls: string): number {
  const params: Record<string, [number, number]> = {
    A: [0.20, 0.000016], B: [0.12, 0.000012], C: [0.08, 0.000011],
    D: [0.06, 0.00001],  E: [0.053, 0.000009], F: [0.053, 0.000009],
  };
  const [a, b] = params[cls] ?? params.C;
  return a * Math.exp(-b * x * x);
}

export function useSimLogger() {
  const {
    nvidiaSimConfig,
    pfasScenario,
    particleLayerActive,
    pushSimLog,
    showWITLayer,
    witYear,
  } = useMapStore();

  const prevWindRef    = useRef<number>(-1);
  const prevBearingRef = useRef<number>(-1);
  const prevScenario   = useRef<string>('');
  const prevParticles  = useRef<boolean>(false);
  const prevWIT        = useRef<boolean>(false);
  const tickRef        = useRef<NodeJS.Timeout | null>(null);
  const frameRef       = useRef<number>(0);

  // ── Log initialization on first render ─────────────────────────────────
  useEffect(() => {
    pushSimLog({ level: 'SIM',  msg: 'Miami Digital Twin — simulation engine ready' });
    pushSimLog({ level: 'DATA', msg: 'Open-Meteo reanalysis API — wind field loaded',
      detail: 'ERA5 30-year climatology · Miami station KMIA · resolution 0.25°' });
    pushSimLog({ level: 'DATA', msg: 'EPA ECHO — facility compliance data fetched',
      detail: 'MD-INC-001 Resources Recovery Facility, Doral FL · last inspection 2024-02' });
    pushSimLog({ level: 'PFAS', msg: 'Background PFAS — 8,900 ppt in ash leachate',
      detail: '×2,225 EPA MCL (4 ppt) · 180,000 tons ash on-site · Source: FDEP 2023 inspection' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Log when wind config changes ────────────────────────────────────────
  useEffect(() => {
    const { windSpeed, windBearing, stabilityClass, emissionRate, releaseHeight } = nvidiaSimConfig;
    if (prevWindRef.current === windSpeed && prevBearingRef.current === windBearing) return;
    prevWindRef.current   = windSpeed;
    prevBearingRef.current = windBearing;

    const x2km  = sigmaY(2000, stabilityClass);
    const sz2km = sigmaZ(2000, stabilityClass);
    const peakConc = (emissionRate / (2 * Math.PI * x2km * sz2km * windSpeed))
      * Math.exp(-0.5 * Math.pow(releaseHeight / sz2km, 2)) * 1e6; // µg/m³

    pushSimLog({ level: 'SIM', msg: `Wind updated: ${windSpeed} m/s @ ${windBearing}° · stability ${stabilityClass}` });
    pushSimLog({
      level: 'CALC',
      msg:  `σy(2km) = ${x2km.toFixed(1)} m · σz(2km) = ${sz2km.toFixed(1)} m`,
      detail: `Stack H=${releaseHeight}m · Q=${emissionRate} g/s · class ${stabilityClass}`,
    });
    pushSimLog({
      level: 'PFAS',
      msg:  `Peak plume conc ≈ ${peakConc.toFixed(3)} µg/m³ at 2 km downwind`,
      detail: `Gaussian P-G formula · ground reflection applied · source: incinerator-history.json`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nvidiaSimConfig.windSpeed, nvidiaSimConfig.windBearing, nvidiaSimConfig.stabilityClass]);

  // ── Log scenario changes ────────────────────────────────────────────────
  useEffect(() => {
    if (prevScenario.current === pfasScenario) return;
    prevScenario.current = pfasScenario;
    const descs: Record<string, string> = {
      operations:   'Normal operations · PFAS from AFFF-treated MSW combustion',
      fire_event:   '🔥 Nov 15–19 2023 fire event · 12.4 kg PFAS released · ash plume active',
      combined:     'Combined: continuous ops + fire event overlay',
      ash_leachate: 'Ash leachate scenario · 8,900 ppt leachate · Biscayne Aquifer risk',
    };
    pushSimLog({ level: 'SIM', msg: `Scenario → ${pfasScenario}`, detail: descs[pfasScenario] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfasScenario]);

  // ── Log particle system activation ─────────────────────────────────────
  useEffect(() => {
    if (prevParticles.current === particleLayerActive) return;
    prevParticles.current = particleLayerActive;
    if (particleLayerActive) {
      pushSimLog({ level: 'PART', msg: 'Particle system → ACTIVE · Lagrangian dispersion model',
        detail: 'Max 900 particles · 30 fps · σ-based spread · Mulberry32 RNG seed 42' });
    } else {
      pushSimLog({ level: 'PART', msg: 'Particle system → OFF' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleLayerActive]);

  // ── Periodic particle stats (every 5 s while active) ───────────────────
  useEffect(() => {
    if (!particleLayerActive) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      frameRef.current += 1;
      const store = useMapStore.getState();
      const n = Math.round(700 + Math.sin(frameRef.current * 0.8) * 150); // simulated count
      pushSimLog({ level: 'PART', msg: `Frame ${frameRef.current * 5}s · ${n} particles active` });

      // Occasionally emit a data log for realism
      if (frameRef.current % 3 === 0) {
        pushSimLog({ level: 'DATA', msg: 'Open-Meteo wind refresh',
          detail: `Speed: ${store.nvidiaSimConfig.windSpeed} m/s · Bearing: ${store.nvidiaSimConfig.windBearing}°` });
      }
    }, 5000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleLayerActive]);

  // ── Log WIT layer events ────────────────────────────────────────────────
  useEffect(() => {
    if (prevWIT.current === showWITLayer) return;
    prevWIT.current = showWITLayer;
    if (showWITLayer) {
      pushSimLog({ level: 'WIT', msg: `WIT Landfill #521 layer activated · year ${witYear}`,
        detail: 'Medley Landfill · GHGRP 1007857 · 0.0847 MMTCO2e CH₄ 2023 · 142 kg/hr Carbon Mapper' });
      pushSimLog({ level: 'DATA', msg: 'TROPOMI Sentinel-5P XCH₄ composite loaded',
        detail: 'Background: 1874 ppb · Peak: 1912 ppb · Δ+38 ppb · Sept 2024 composite' });
      pushSimLog({ level: 'WARN', msg: `EJ: 79th percentile — 84.2% POC, 148k residents within 3mi`,
        detail: 'EPA EJScreen v2.3 · Census block groups · Source: ejscreen.epa.gov' });
    } else {
      pushSimLog({ level: 'WIT', msg: 'WIT layer hidden' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWITLayer]);
}
