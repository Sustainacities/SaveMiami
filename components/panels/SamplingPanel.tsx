'use client';

/**
 * SamplingPanel — GIS Field Sampling Protocol Control & Comparison
 * ─────────────────────────────────────────────────────────────────
 * Dr. Phil's methodology:
 *   • N random grab samples (default 9) within 1 mile WEST of each smokestack
 *   • Predominant easterly winds → deposition footprint lies WEST of source
 *   • Samples composited (equal-volume aliquots) → 1 lab analysis per stack
 *   • Depth standardized (adjustable)
 *   • Parameters may change as protocol evolves
 *
 * Comparison view: model (Gaussian plume) ← vs → sampling heatmap (actual)
 */

import { useState, useCallback } from 'react';
import {
  X, FlaskConical, Wind, MapPin, Download, Info,
  BarChart2, RefreshCw, ChevronDown, ChevronUp,
  Layers, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import {
  buildAllCompositeSamples,
  exportSamplesCSV,
  exportSamplesGeoJSON,
  INCINERATOR_STACKS,
  type AnalyteResults,
} from '@/lib/sampling/field-protocol';

const ANALYTE_OPTIONS: Array<{ key: keyof AnalyteResults; label: string; unit: string; mcl?: number }> = [
  { key: 'PFOA_ppt',      label: 'PFOA',       unit: 'ppt', mcl: 4    },
  { key: 'PFOS_ppt',      label: 'PFOS',       unit: 'ppt', mcl: 4    },
  { key: 'totalPFAS_ppt', label: 'Total PFAS', unit: 'ppt', mcl: 4    },
  { key: 'lead_ppm',      label: 'Lead',       unit: 'ppm', mcl: 400  },
];

// Simulated composite results (mirrors DEMO_RESULTS averages in useSamplingLayer)
const COMPOSITE_RESULTS: Record<string, Record<keyof AnalyteResults, number>> = {
  'STACK-U1': { PFOA_ppt: 43.4, PFOS_ppt: 56.2, totalPFAS_ppt: 126.6, lead_ppm: 30.7 },
  'STACK-U2': { PFOA_ppt: 35.1, PFOS_ppt: 46.0, totalPFAS_ppt: 103.3, lead_ppm: 25.7 },
  'STACK-U3': { PFOA_ppt: 30.5, PFOS_ppt: 40.5, totalPFAS_ppt:  88.8, lead_ppm: 23.4 },
};

// Color for concentration value vs MCL
function concentrationColor(val: number, mcl: number) {
  const ratio = val / mcl;
  if (ratio > 17) return '#DC2626';
  if (ratio > 10) return '#EA580C';
  if (ratio > 5)  return '#F59E0B';
  if (ratio > 1)  return '#A170F1';
  return '#10B981';
}

export function SamplingPanel() {
  const {
    setSamplingPanelOpen,
    samplingConfig, updateSamplingConfig,
    showSamplingLayer, setShowSamplingLayer,
    showArcZone, setShowArcZone,
    samplingAnalyte, setSamplingAnalyte,
    compareMode, setCompareMode,
    setIncineratorFocusMode,
  } = useMapStore();

  const [activeTab, setActiveTab]     = useState<'protocol' | 'results' | 'compare'>('protocol');
  const [protocolOpen, setProtocolOpen] = useState(true);
  const [windInfoOpen, setWindInfoOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const currentAnalyte = ANALYTE_OPTIONS.find((a) => a.key === samplingAnalyte)
    ?? ANALYTE_OPTIONS[0];

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    // Bump seed to get a fresh random layout
    updateSamplingConfig({ seed: (samplingConfig.seed ?? 42) + 1 });
    await new Promise((r) => setTimeout(r, 600));
    setRegenerating(false);
  }, [samplingConfig.seed, updateSamplingConfig]);

  const handleExportCSV = useCallback(() => {
    const composites = buildAllCompositeSamples(INCINERATOR_STACKS, samplingConfig);
    const csv = exportSamplesCSV(composites);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'miami-incinerator-sampling-plan.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [samplingConfig]);

  const handleExportGeoJSON = useCallback(() => {
    const composites = buildAllCompositeSamples(INCINERATOR_STACKS, samplingConfig);
    const geojson = exportSamplesGeoJSON(composites);
    const blob = new Blob([geojson], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'miami-incinerator-sample-points.geojson';
    a.click();
    URL.revokeObjectURL(url);
  }, [samplingConfig]);

  return (
    <div className="absolute right-3 top-16 bottom-20 w-80 flex flex-col gap-2 z-20 overflow-hidden">
      <div className="glass-panel flex-1 flex flex-col overflow-hidden">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-miami-border">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[#7C3AED]" />
            <span className="font-semibold text-sm text-white">GIS Sampling Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Master toggle */}
            <button
              onClick={() => setShowSamplingLayer(!showSamplingLayer)}
              title={showSamplingLayer ? 'Hide sampling layer' : 'Show sampling layer'}
              className={`transition-colors ${showSamplingLayer ? 'text-[#7C3AED]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {showSamplingLayer ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <button
              onClick={() => setSamplingPanelOpen(false)}
              className="text-gray-500 hover:text-white transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Dr. Phil protocol banner ─────────────────────── */}
        <div className="mx-3 mt-3 p-2.5 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/8">
          <div className="flex items-start gap-2">
            <Info size={12} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
            <div className="text-[10px] text-gray-400 leading-relaxed">
              <span className="text-[#A170F1] font-semibold">Dr. Phil's Protocol: </span>
              {samplingConfig.sampleCount} random grab samples within{' '}
              {samplingConfig.radiusMiles} mi <span className="text-miami-teal">WEST</span> of
              each smokestack (easterly winds). Composited + standardized depth{' '}
              {samplingConfig.depthMin_cm}–{samplingConfig.depthMax_cm} cm.
              <span className="text-yellow-400"> Parameters may change.</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-miami-border mt-3">
          {[
            { id: 'protocol', label: 'Protocol',  icon: <FlaskConical size={10} /> },
            { id: 'results',  label: 'Results',   icon: <BarChart2 size={10} /> },
            { id: 'compare',  label: 'vs Model',  icon: <Layers size={10} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                activeTab === t.id
                  ? 'text-[#7C3AED] border-b-2 border-[#7C3AED]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

          {/* ══ Protocol Tab ══════════════════════════════ */}
          {activeTab === 'protocol' && (
            <>
              {/* Wind rationale */}
              <div>
                <button
                  onClick={() => setWindInfoOpen(!windInfoOpen)}
                  className="w-full flex items-center justify-between text-xs font-medium text-gray-300 mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <Wind size={12} className="text-miami-teal" />
                    Why WEST? — Wind Rationale
                  </span>
                  {windInfoOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {windInfoOpen && (
                  <div className="p-2.5 rounded-lg border border-miami-border bg-miami-ocean/20 text-[10px] text-gray-400 leading-relaxed mb-2">
                    Miami-Dade prevailing winds are <span className="text-miami-teal font-medium">easterly
                    (SE/ESE, avg 105°)</span>. Atmospheric transport moves stack emissions
                    <span className="text-white font-medium"> westward</span> → contaminant
                    deposition footprint is predominantly W of the source.
                    During the Nov 2023 fire: 95–120° @ 5–6 m/s confirmed westward plume.
                    <br/><br/>
                    Sampling the western sector maximizes probability of detecting
                    elevated PFAS / heavy metal deposition in surface soil.
                    <div className="mt-1.5 text-miami-teal">
                      Arc: {samplingConfig.arcCenterBearing}° ± {samplingConfig.arcWidthDeg / 2}°
                      ({samplingConfig.arcCenterBearing - samplingConfig.arcWidthDeg / 2}°–
                       {samplingConfig.arcCenterBearing + samplingConfig.arcWidthDeg / 2}°)
                    </div>
                  </div>
                )}
              </div>

              {/* Sampling parameters */}
              <div>
                <button
                  onClick={() => setProtocolOpen(!protocolOpen)}
                  className="w-full flex items-center justify-between text-xs font-medium text-gray-300 mb-2"
                >
                  <span className="flex items-center gap-1.5">
                    <FlaskConical size={12} className="text-[#7C3AED]" />
                    Sampling Parameters
                  </span>
                  {protocolOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {protocolOpen && (
                  <div className="space-y-2.5">
                    {/* Sample count */}
                    <ParamSlider
                      label="Grab samples per stack"
                      value={samplingConfig.sampleCount}
                      min={3} max={25} step={1}
                      unit=" samples"
                      color="#7C3AED"
                      note="Dr. Phil recommends 9"
                      onChange={(v) => updateSamplingConfig({ sampleCount: v })}
                    />

                    {/* Radius */}
                    <ParamSlider
                      label="Sampling radius"
                      value={samplingConfig.radiusMiles}
                      min={0.25} max={5} step={0.25}
                      unit=" mi"
                      color="#7C3AED"
                      note={`= ${(samplingConfig.radiusMiles * 1609.344).toFixed(0)} m`}
                      onChange={(v) => updateSamplingConfig({ radiusMiles: v })}
                    />

                    {/* Min radius */}
                    <ParamSlider
                      label="Exclusion zone (min radius)"
                      value={samplingConfig.minRadiusMiles}
                      min={0.01} max={0.25} step={0.01}
                      unit=" mi"
                      color="#7C3AED"
                      note="excludes immediate stack base"
                      onChange={(v) => updateSamplingConfig({ minRadiusMiles: v })}
                    />

                    {/* Arc center bearing */}
                    <ParamSlider
                      label="Arc center bearing"
                      value={samplingConfig.arcCenterBearing}
                      min={0} max={359} step={5}
                      unit="°"
                      color="#00B4D8"
                      note={`= ${bearingName(samplingConfig.arcCenterBearing)} (270° = due West)`}
                      onChange={(v) => updateSamplingConfig({ arcCenterBearing: v })}
                    />

                    {/* Arc width */}
                    <ParamSlider
                      label="Arc width"
                      value={samplingConfig.arcWidthDeg}
                      min={30} max={360} step={15}
                      unit="°"
                      color="#00B4D8"
                      note={`±${samplingConfig.arcWidthDeg / 2}° from center`}
                      onChange={(v) => updateSamplingConfig({ arcWidthDeg: v })}
                    />

                    {/* Depth range */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Sampling depth range</span>
                        <span className="font-mono text-white">
                          {samplingConfig.depthMin_cm}–{samplingConfig.depthMax_cm} cm
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[9px] text-gray-600 mb-0.5">Min depth (cm)</p>
                          <input
                            type="number" min={0} max={100}
                            value={samplingConfig.depthMin_cm}
                            onChange={(e) => updateSamplingConfig({ depthMin_cm: Number(e.target.value) })}
                            className="w-full bg-miami-border rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-600 mb-0.5">Max depth (cm)</p>
                          <input
                            type="number" min={1} max={300}
                            value={samplingConfig.depthMax_cm}
                            onChange={(e) => updateSamplingConfig({ depthMax_cm: Number(e.target.value) })}
                            className="w-full bg-miami-border rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-600 mt-1">
                        Depth standardization ensures comparability across sites.
                        Deeper samples (15–30 cm) capture historical deposition.
                      </p>
                    </div>

                    {/* Analytes */}
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1.5">Analytical Parameters</p>
                      {[
                        { id: 'PFAS_533',         label: 'EPA Method 533 — PFAS (short-chain)'  },
                        { id: 'PFAS_537',         label: 'EPA Method 537.1 — PFAS (long-chain)' },
                        { id: 'Dioxin_Furan_8290A',label: 'EPA 8290A — Dioxin/Furan'            },
                        { id: 'Heavy_Metals_6010D',label: 'EPA 6010D — Heavy Metals'            },
                        { id: 'Mercury_7471B',    label: 'EPA 7471B — Mercury'                  },
                        { id: 'PAH_8270D',        label: 'EPA 8270D — PAHs'                     },
                      ].map(({ id, label }) => (
                        <label key={id} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={samplingConfig.analytes.includes(id as never)}
                            onChange={(e) => {
                              const analytes = e.target.checked
                                ? [...samplingConfig.analytes, id as never]
                                : samplingConfig.analytes.filter((a) => a !== id);
                              updateSamplingConfig({ analytes });
                            }}
                            className="accent-[#7C3AED]"
                          />
                          <span className="text-[10px] text-gray-400">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Display options */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Display</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showSamplingLayer}
                    onChange={(e) => setShowSamplingLayer(e.target.checked)}
                    className="accent-[#7C3AED]" />
                  <span className="text-xs text-gray-300">Show sampling points on map</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showArcZone}
                    onChange={(e) => setShowArcZone(e.target.checked)}
                    className="accent-[#7C3AED]" />
                  <span className="text-xs text-gray-300">Show western arc zone</span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-[#7C3AED]/50 text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-colors"
                >
                  <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
                  {regenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button
                  onClick={() => { setShowSamplingLayer(true); setIncineratorFocusMode(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-miami-teal/50 text-miami-teal hover:bg-miami-teal/10 transition-colors"
                >
                  <MapPin size={11} />
                  Fly to Site
                </button>
              </div>

              {/* Export */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Export for Field Teams</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] border border-miami-border text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Download size={10} /> CSV
                  </button>
                  <button
                    onClick={handleExportGeoJSON}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] border border-miami-border text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Download size={10} /> GeoJSON
                  </button>
                </div>
              </div>

              {/* Protocol summary */}
              <div className="p-2.5 rounded-lg bg-miami-ocean/20 border border-miami-border">
                <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">Generated Protocol</p>
                <p className="text-[9px] text-gray-500 font-mono leading-relaxed break-all">
                  N={samplingConfig.sampleCount} grab samples |{' '}
                  r≤{samplingConfig.radiusMiles}mi |{' '}
                  arc {samplingConfig.arcCenterBearing}°±{samplingConfig.arcWidthDeg/2}° |{' '}
                  depth {samplingConfig.depthMin_cm}–{samplingConfig.depthMax_cm}cm |{' '}
                  composite | {INCINERATOR_STACKS.length} stacks |{' '}
                  {INCINERATOR_STACKS.length * samplingConfig.sampleCount} total grab samples
                </p>
              </div>
            </>
          )}

          {/* ══ Results Tab ═══════════════════════════════ */}
          {activeTab === 'results' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Composite sample results per stack (mean of {samplingConfig.sampleCount} grab
                samples). Simulated values shown — replace with actual lab data.
              </p>

              {/* Analyte selector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Heat Map Analyte</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ANALYTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSamplingAnalyte(opt.key)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-colors ${
                        samplingAnalyte === opt.key
                          ? 'border-[#7C3AED]/70 bg-[#7C3AED]/10 text-[#A170F1]'
                          : 'border-miami-border text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {opt.label} ({opt.unit})
                    </button>
                  ))}
                </div>
              </div>

              {/* Composite results by stack */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Composite Results — {currentAnalyte.label} ({currentAnalyte.unit})
                </p>
                {INCINERATOR_STACKS.map((stack) => {
                  const result = COMPOSITE_RESULTS[stack.id];
                  const val    = result?.[samplingAnalyte] as number ?? 0;
                  const mcl    = currentAnalyte.mcl ?? 4;
                  const color  = concentrationColor(val, mcl);
                  const ratio  = val / mcl;
                  return (
                    <div key={stack.id} className="p-3 rounded-lg border border-miami-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-white">{stack.name}</p>
                        <p className="text-sm font-bold font-mono" style={{ color }}>
                          {val.toFixed(1)} {currentAnalyte.unit}
                        </p>
                      </div>
                      {/* Concentration bar */}
                      <div className="h-1.5 bg-miami-border rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((val / (mcl * 20)) * 100, 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-600">
                        <span>MCL: {mcl} {currentAnalyte.unit}</span>
                        <span style={{ color }}>×{ratio.toFixed(1)} MCL</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Color legend */}
              <div className="p-2.5 rounded-lg border border-miami-border">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">
                  Heat Map Color Scale — {currentAnalyte.label}
                </p>
                {[
                  { color: '#DC2626', label: `Critical  > 17× MCL (>${(currentAnalyte.mcl??4)*17} ppt)`  },
                  { color: '#EA580C', label: `Very High > 10× MCL (>${(currentAnalyte.mcl??4)*10} ppt)`  },
                  { color: '#F59E0B', label: `High      > 5× MCL  (>${(currentAnalyte.mcl??4)*5} ppt)`   },
                  { color: '#A170F1', label: `Elevated  > MCL     (>${currentAnalyte.mcl??4} ppt)`       },
                  { color: '#00B4D8', label: `Above MCL ≥ MCL`                                           },
                  { color: '#10B981', label: 'Below MCL — within standard'                              },
                  { color: '#6B7280', label: 'No data — not sampled'                                    },
                ].map(({ color, label }) => (
                  <div key={color} className="flex items-center gap-2 py-0.5">
                    <div className="w-3 h-3 rounded flex-shrink-0" style={{ background: color }} />
                    <span className="text-[9px] text-gray-500">{label}</span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-gray-600 italic">
                ⚠ Simulated values shown for demonstration. Upload actual lab results
                via the data connector to display real measurements.
              </p>
            </>
          )}

          {/* ══ Compare Tab ═══════════════════════════════ */}
          {activeTab === 'compare' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Compare the <span className="text-[#7C3AED]">Gaussian-plume model prediction</span>{' '}
                against <span className="text-miami-teal">field sampling results</span>.
                Discrepancies reveal model assumptions to refine.
              </p>

              {/* Compare mode toggle */}
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setShowSamplingLayer(true);
                }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                  compareMode
                    ? 'border-miami-teal/60 bg-miami-teal/10 text-miami-teal'
                    : 'border-[#7C3AED]/60 bg-[#7C3AED]/10 text-[#A170F1]'
                }`}
              >
                <Layers size={14} />
                {compareMode ? '✓ Compare Mode Active' : 'Enable Compare Mode'}
              </button>

              {compareMode && (
                <div className="p-2.5 rounded-lg border border-miami-teal/30 bg-miami-teal/5 text-[10px] text-gray-400 leading-relaxed">
                  Both layers now visible simultaneously:
                  <ul className="mt-1 space-y-0.5 list-none">
                    <li><span className="text-[#7C3AED]">●</span> Purple heatmap = Gaussian plume model</li>
                    <li><span className="text-miami-teal">●</span> Teal/red points = sampling heatmap</li>
                    <li><span className="text-yellow-400">◆</span> Large diamonds = composite samples</li>
                    <li><span className="text-red-500">✕</span> Stack sources = emission points</li>
                  </ul>
                </div>
              )}

              {/* Comparison metrics */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Model vs Sampling Comparison
                </p>

                <div className="rounded-lg border border-miami-border overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-miami-border">
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Metric</th>
                        <th className="text-right px-3 py-2 text-[#7C3AED] font-medium">Model</th>
                        <th className="text-right px-3 py-2 text-miami-teal font-medium">Sampling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'PFOA peak (ppt)',   model: '72.4',  sampled: '72.4*'  },
                        { label: 'PFOA avg (ppt)',    model: '38.2',  sampled: '36.3'   },
                        { label: 'Affected radius',   model: '40 km', sampled: 'TBD'    },
                        { label: 'Max deposition dir',model: '270°W', sampled: '265°W'  },
                        { label: 'Stack U1 total PFAS',model:'146',   sampled: '126.6'  },
                        { label: 'Stack U2 total PFAS',model:'108',   sampled: '103.3'  },
                        { label: 'Stack U3 total PFAS',model: '89',   sampled: '88.8'   },
                      ].map(({ label, model, sampled }) => (
                        <tr key={label} className="border-b border-miami-border/50">
                          <td className="px-3 py-1.5 text-gray-400">{label}</td>
                          <td className="px-3 py-1.5 text-right text-[#A170F1] font-mono">{model}</td>
                          <td className="px-3 py-1.5 text-right text-miami-teal font-mono">{sampled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-3 py-1.5 text-[9px] text-gray-600">
                    * Highest individual grab sample (Stack U1-S03). Model uses peak concentration.
                  </p>
                </div>
              </div>

              {/* Calibration notes */}
              <div className="p-2.5 rounded-lg border border-yellow-600/20 bg-yellow-900/5">
                <p className="text-[10px] font-semibold text-yellow-400 mb-1.5">
                  Model Calibration Notes
                </p>
                <ul className="text-[10px] text-gray-500 space-y-1 list-disc list-inside">
                  <li>Model slightly over-predicts peak (Gaussian plume assumes flat terrain)</li>
                  <li>Sampling confirms westward deposition pattern — validates wind field</li>
                  <li>Stack U1 highest readings — consistent with dominant fire origin</li>
                  <li>Actual wet deposition may exceed model (missing scavenging term)</li>
                  <li>Recommend expanding radius to 2 mi for follow-up sampling</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] border border-miami-border text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Download size={10} /> Export Comparison CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slider param helper ────────────────────────────────────────
function ParamSlider({ label, value, min, max, step, unit, color, note, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; color: string; note?: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-mono text-white">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #374151 ${pct}%, #374151 100%)`,
        }}
      />
      {note && <p className="text-[9px] text-gray-600 mt-0.5">{note}</p>}
    </div>
  );
}

function bearingName(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}
