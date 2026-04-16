'use client';

/**
 * NvidiaSimPanel — NVIDIA Physics Simulation Control
 * ─────────────────────────────────────────────────────────────
 * Controls for the NVIDIA Modulus-powered PFAS dispersal model
 * and Omniverse Digital Twin integration.
 *
 * NVIDIA Inception Program — Sustainacities / SaveMiami
 */

import { useState } from 'react';
import { X, Zap, Wind, Settings, RefreshCw, ExternalLink } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { NVIDIA_CAPABILITIES } from '@/lib/nvidia/modulus-client';

const STABILITY_CLASSES = [
  { cls: 'A', desc: 'Very unstable (sunny, low wind)' },
  { cls: 'B', desc: 'Unstable (mostly sunny, light wind)' },
  { cls: 'C', desc: 'Slightly unstable (partly cloudy)' },
  { cls: 'D', desc: 'Neutral (overcast / night)' },
  { cls: 'E', desc: 'Slightly stable (night, light wind)' },
  { cls: 'F', desc: 'Stable (clear night, calm wind)' },
] as const;

const PHYSICS_MODES = [
  { id: 'gaussian_plume', label: 'Gaussian Plume (Local CPU)', desc: 'Pasquill-Gifford model — fast, runs in browser' },
  { id: 'gpu_fluid',      label: 'GPU Fluid (WebGL)',          desc: 'WebGL-accelerated fluid simulation (deck.gl)' },
  { id: 'omniverse_modulus', label: 'NVIDIA Modulus (Cloud)', desc: 'Physics-ML via NVIDIA Modulus API — requires config' },
] as const;

export function NvidiaSimPanel() {
  const { setNvidiaPanelOpen, nvidiaSimConfig, updateNvidiaSimConfig } = useMapStore();
  const [activeSection, setActiveSection] = useState<'config' | 'capabilities' | 'status'>('config');
  const [isRunning, setIsRunning] = useState(false);

  const runSimulation = async () => {
    setIsRunning(true);
    // In production: call NVIDIA Modulus API via /api/simulate
    await new Promise((r) => setTimeout(r, 1500));
    setIsRunning(false);
  };

  return (
    <div className="absolute bottom-20 right-3 w-80 z-20">
      <div className="glass-panel flex flex-col overflow-hidden max-h-[520px]">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-miami-border">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#76B900]" />
            <span className="font-semibold text-sm text-white">NVIDIA Simulation</span>
            <span className="nvidia-badge text-[10px]">INCEPTION</span>
          </div>
          <button
            onClick={() => setNvidiaPanelOpen(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Section tabs ─────────────────────────────────── */}
        <div className="flex border-b border-miami-border">
          {[
            { id: 'config', label: 'Config' },
            { id: 'capabilities', label: 'Capabilities' },
            { id: 'status', label: 'Status' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as typeof activeSection)}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                activeSection === s.id
                  ? 'text-[#76B900] border-b-2 border-[#76B900]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

          {/* ── Config section ───────────────────────────── */}
          {activeSection === 'config' && (
            <>
              {/* Physics mode */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Physics Engine</p>
                {PHYSICS_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateNvidiaSimConfig({ physicsMode: mode.id })}
                    className={`w-full text-left p-2.5 rounded-lg mb-1.5 border text-xs transition-colors ${
                      nvidiaSimConfig.physicsMode === mode.id
                        ? 'border-[#76B900]/60 bg-[#76B900]/5'
                        : 'border-miami-border hover:bg-white/3'
                    }`}
                  >
                    <p className="font-medium text-white">{mode.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{mode.desc}</p>
                  </button>
                ))}
              </div>

              {/* Wind config */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                  <Wind size={10} /> Wind Parameters
                </p>
                <SliderRow
                  label="Wind Speed"
                  value={nvidiaSimConfig.windSpeed}
                  min={0.5} max={15} step={0.1}
                  unit="m/s"
                  onChange={(v) => updateNvidiaSimConfig({ windSpeed: v })}
                />
                <SliderRow
                  label="Wind Direction"
                  value={nvidiaSimConfig.windBearing}
                  min={0} max={359} step={1}
                  unit="°"
                  onChange={(v) => updateNvidiaSimConfig({ windBearing: v })}
                  sublabel={bearingLabel(nvidiaSimConfig.windBearing)}
                />
              </div>

              {/* Stability class */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                  Pasquill-Gifford Stability Class
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {STABILITY_CLASSES.map(({ cls }) => (
                    <button
                      key={cls}
                      onClick={() => updateNvidiaSimConfig({ stabilityClass: cls as 'A'|'B'|'C'|'D'|'E'|'F' })}
                      className={`py-1.5 rounded text-xs font-bold transition-colors ${
                        nvidiaSimConfig.stabilityClass === cls
                          ? 'bg-[#76B900] text-black'
                          : 'bg-miami-border text-gray-400 hover:bg-gray-600'
                      }`}
                      title={STABILITY_CLASSES.find((s) => s.cls === cls)?.desc}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {STABILITY_CLASSES.find((s) => s.cls === nvidiaSimConfig.stabilityClass)?.desc}
                </p>
              </div>

              {/* Emission & stack */}
              <div className="space-y-2">
                <SliderRow
                  label="Emission Rate"
                  value={nvidiaSimConfig.emissionRate}
                  min={0.1} max={10} step={0.1}
                  unit="g/s"
                  onChange={(v) => updateNvidiaSimConfig({ emissionRate: v })}
                />
                <SliderRow
                  label="Release Height"
                  value={nvidiaSimConfig.releaseHeight}
                  min={10} max={3000} step={10}
                  unit="m"
                  onChange={(v) => updateNvidiaSimConfig({ releaseHeight: v })}
                />
                <SliderRow
                  label="Particle Count"
                  value={nvidiaSimConfig.particleCount}
                  min={1000} max={200000} step={1000}
                  unit=""
                  onChange={(v) => updateNvidiaSimConfig({ particleCount: v })}
                />
              </div>

              {/* Options */}
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nvidiaSimConfig.gpuAccelerated}
                    onChange={(e) => updateNvidiaSimConfig({ gpuAccelerated: e.target.checked })}
                    className="rounded"
                  />
                  GPU Accelerated
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nvidiaSimConfig.showUncertainty}
                    onChange={(e) => updateNvidiaSimConfig({ showUncertainty: e.target.checked })}
                    className="rounded"
                  />
                  Show Uncertainty
                </label>
              </div>

              {/* Run button */}
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="w-full py-2 rounded-lg text-sm font-semibold text-black transition-all flex items-center justify-center gap-2"
                style={{ background: isRunning ? '#4A7A00' : '#76B900' }}
              >
                {isRunning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Run NVIDIA Simulation
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Capabilities section ─────────────────────── */}
          {activeSection === 'capabilities' && (
            <div className="space-y-2">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                SaveMiami is an NVIDIA Inception Program partner. The following
                NVIDIA technologies power the Miami Digital Twin waste simulation.
              </p>
              {NVIDIA_CAPABILITIES.map((cap) => (
                <div
                  key={cap.id}
                  className={`p-3 rounded-lg border ${
                    cap.status === 'active'
                      ? 'border-[#76B900]/40 bg-[#76B900]/5'
                      : cap.status === 'configure'
                      ? 'border-yellow-600/30 bg-yellow-900/10'
                      : 'border-miami-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cap.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">{cap.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{cap.description}</p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        cap.status === 'active'
                          ? 'bg-[#76B900]/20 text-[#76B900]'
                          : cap.status === 'configure'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-miami-border text-gray-500'
                      }`}
                    >
                      {cap.status}
                    </span>
                  </div>
                </div>
              ))}

              <a
                href="https://www.nvidia.com/en-us/startups/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-[#76B900] hover:text-[#8fd400] transition-colors mt-1"
              >
                <ExternalLink size={10} />
                NVIDIA Inception Program
              </a>
            </div>
          )}

          {/* ── Status section ───────────────────────────── */}
          {activeSection === 'status' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-miami-border space-y-2 text-[11px]">
                <p className="font-semibold text-white">Current Simulation</p>
                <StatusRow label="Engine" value={nvidiaSimConfig.physicsMode.replace('_', ' ')} />
                <StatusRow label="Wind"   value={`${nvidiaSimConfig.windSpeed} m/s @ ${nvidiaSimConfig.windBearing}° (${bearingLabel(nvidiaSimConfig.windBearing)})`} />
                <StatusRow label="Stability" value={`Class ${nvidiaSimConfig.stabilityClass}`} />
                <StatusRow label="Particles"  value={nvidiaSimConfig.particleCount.toLocaleString()} />
                <StatusRow label="GPU"     value={nvidiaSimConfig.gpuAccelerated ? '✓ Enabled' : '✗ Disabled'} />
              </div>

              <div className="p-3 rounded-lg border border-miami-border space-y-2 text-[11px]">
                <p className="font-semibold text-white">Data Sources</p>
                <StatusRow label="Wind"      value="Open-Meteo reanalysis" />
                <StatusRow label="Stability" value="Manual / NOAA ASOS" />
                <StatusRow label="PFAS"      value="EPA ECHO + Field data" />
                <StatusRow label="Ash"       value="FDEP records" />
              </div>

              <div className="p-3 rounded-lg border border-yellow-600/30 bg-yellow-900/5 text-[10px] text-yellow-400">
                <p className="font-semibold mb-1">⚠ Simulation Disclaimer</p>
                This model provides estimates for planning and educational purposes.
                Results should not be used as sole basis for regulatory decisions.
                Validate with on-site monitoring data.
              </div>

              <button
                onClick={() => {
                  // In production: download simulation results as CSV/GeoJSON
                  const data = JSON.stringify({ config: useMapStore.getState().nvidiaSimConfig }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'miami-pfas-sim-config.json';
                  a.click();
                }}
                className="w-full text-center py-2 rounded-lg text-xs text-gray-400 border border-miami-border hover:bg-white/5 transition-colors"
              >
                Export Config JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────

function SliderRow({ label, value, min, max, step, unit, onChange, sublabel }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; sublabel?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{label}{sublabel ? ` (${sublabel})` : ''}</span>
        <span className="font-mono text-white">{typeof value === 'number' ? value.toLocaleString() : value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #76B900 0%, #76B900 ${((value - min) / (max - min)) * 100}%, #374151 ${((value - min) / (max - min)) * 100}%, #374151 100%)` }}
      />
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

function bearingLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
