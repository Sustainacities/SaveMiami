'use client';

/**
 * SamplingPlanMap — Meeting-ready site selection widget
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone map for pre-meeting review and annotation of PFAS soil sampling
 * locations. Wired directly into the SaveMiami codebase:
 *
 *  • lib/sampling/field-protocol.ts  — INCINERATOR_STACKS, generateSamplePoints,
 *    buildAllCompositeSamples, generateSamplingArcPolygon, exportSamplesCSV
 *  • store/mapStore.ts               — samplingConfig, nvidiaSimConfig (wind)
 *  • data/incinerator-history.json   — fire date, wind data, ash storage coords
 *
 * Usage: /sampling-plan  — open in separate tab for screen-sharing in meetings
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer, TextLayer, LineLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import {
  INCINERATOR_STACKS,
  DEFAULT_SAMPLING_CONFIG,
  generateSamplePoints,
  generateSamplingArcPolygon,
  exportSamplesCSV,
  destinationPoint,
  type SamplePoint,
  type SamplingConfig,
} from '@/lib/sampling/field-protocol';
import { useMapStore } from '@/store/mapStore';
import incineratorData from '@/data/incinerator-history.json';
import {
  RefreshCw, Download, Layers, Wind, MapPin,
  ChevronRight, ExternalLink, Target, Info,
} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Map style toggle ──────────────────────────────────────────────────────
const MAP_STYLES = {
  satellite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  topo:      'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
};

// ── Stack colour palette ──────────────────────────────────────────────────
const STACK_COLORS: Record<string, [number,number,number]> = {
  'STACK-U1': [239, 68,  68],   // red
  'STACK-U2': [249, 115, 22],   // orange
  'STACK-U3': [234, 179, 8],    // yellow
};

// ── Priority colours ──────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, [number,number,number,number]> = {
  high:   [239, 68,  68,  255],
  medium: [249, 115, 22,  255],
  low:    [74,  222, 128, 255],
};

// ── Circle polygon helper ─────────────────────────────────────────────────
function circlePolygon(lat: number, lng: number, radiusMiles: number, steps = 64): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 360;
    const p = destinationPoint(lat, lng, bearing, radiusMiles * 1609.344);
    pts.push([p.lng, p.lat]);
  }
  return pts;
}

// ── Annotation store (ephemeral — meeting session only) ──────────────────
interface Annotation {
  notes:    string;
  priority: 'high' | 'medium' | 'low';
  depth:    string;
  flagged:  boolean;
}
type AnnotationMap = Record<string, Annotation>;

function defaultAnnotation(): Annotation {
  return { notes: '', priority: 'medium', depth: '0–15 cm', flagged: false };
}

// ── Main component ────────────────────────────────────────────────────────
export default function SamplingPlanMap() {
  const { samplingConfig, nvidiaSimConfig, updateSamplingConfig } = useMapStore();

  // Merge store config with defaults (store may not have all fields on first render)
  const config: SamplingConfig = useMemo(() => ({
    ...DEFAULT_SAMPLING_CONFIG,
    ...samplingConfig,
  }), [samplingConfig]);

  const [seed, setSeed]             = useState(config.seed ?? 42);
  const [showArc, setShowArc]       = useState(true);
  const [showCircles, setShowCircles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [mapStyle, setMapStyle]     = useState<keyof typeof MAP_STYLES>('satellite');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationMap>({});
  const [cursor, setCursor]         = useState('grab');
  const mapRef = useRef<MapRef>(null);

  // Wind from store (live-linked to NvidiaSimPanel sliders)
  const windBearing = nvidiaSimConfig.windBearing; // FROM direction
  const windSpeed   = nvidiaSimConfig.windSpeed;

  // ── Generate sample points (re-runs when seed or config changes) ────────
  const allPoints = useMemo<SamplePoint[]>(() => {
    const merged = { ...config, seed };
    return INCINERATOR_STACKS.flatMap((stack, i) =>
      generateSamplePoints(stack, merged, i)
    );
  }, [config, seed]);

  // ── Arc polygons ─────────────────────────────────────────────────────────
  const arcPolygons = useMemo(() => {
    if (!showArc) return [];
    return INCINERATOR_STACKS.map(stack =>
      generateSamplingArcPolygon(stack, config)
    );
  }, [config, showArc]);

  // ── Annotation helpers ────────────────────────────────────────────────
  const getAnnotation = (id: string): Annotation =>
    annotations[id] ?? defaultAnnotation();

  const patchAnnotation = (id: string, patch: Partial<Annotation>) =>
    setAnnotations(prev => ({
      ...prev,
      [id]: { ...defaultAnnotation(), ...prev[id], ...patch },
    }));

  const selectedPoint = allPoints.find(p => p.id === selectedId) ?? null;
  const selectedAnnotation = selectedId ? getAnnotation(selectedId) : null;

  // ── CSV export (uses existing exportSamplesCSV, injects annotations) ──
  const handleExportCSV = useCallback(() => {
    // Build composite samples with annotation data merged into results
    const annotated = allPoints.map(p => ({
      ...p,
      results: {
        ...p.results,
        sampledAt: annotations[p.id]?.notes ? 'annotated' : undefined,
      },
    }));
    const csv = exportSamplesCSV(annotated);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sampling-plan-seed${seed}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [allPoints, annotations, seed]);

  // ── Wind arrow geometry ────────────────────────────────────────────────
  const windArrowData = useMemo(() => {
    const srcLat = 25.8012;
    const srcLng = -80.3534;
    const goingDeg = (windBearing + 180) % 360; // wind goes TO opposite of FROM
    const tip = destinationPoint(srcLat, srcLng, goingDeg, 1200);
    return [{ from: [srcLng, srcLat], to: [tip.lng, tip.lat] }];
  }, [windBearing]);

  // ── deck.gl layers ─────────────────────────────────────────────────────
  const layers = useMemo(() => {
    const radiusMiles = config.radiusMiles;
    const incLat = incineratorData.facility.coordinates[1];
    const incLng = incineratorData.facility.coordinates[0];

    return [
      // ── Radius circles ──────────────────────────────────────────────
      ...(showCircles ? [
        new PolygonLayer({
          id: 'circle-1mi',
          data: [{ contour: circlePolygon(incLat, incLng, 1.0) }],
          getPolygon: d => d.contour,
          getFillColor: [0, 180, 216, 12],
          getLineColor: [0, 180, 216, 120],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          stroked: true, filled: true,
          pickable: false,
        }),
        new PolygonLayer({
          id: 'circle-05mi',
          data: [{ contour: circlePolygon(incLat, incLng, 0.5) }],
          getPolygon: d => d.contour,
          getFillColor: [0, 180, 216, 8],
          getLineColor: [0, 180, 216, 70],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          stroked: true, filled: true,
          pickable: false,
        }),
      ] : []),

      // ── Arc zone polygons ────────────────────────────────────────────
      ...arcPolygons.map((arc, i) =>
        new PolygonLayer({
          id: `arc-zone-${i}`,
          data: [{ contour: arc }],
          getPolygon: d => d.contour,
          getFillColor: [124, 58, 237, 30],
          getLineColor: [124, 58, 237, 140],
          getLineWidth: 1.5,
          lineWidthMinPixels: 1,
          stroked: true, filled: true,
          pickable: false,
        })
      ),

      // ── Wind arrow ───────────────────────────────────────────────────
      new LineLayer({
        id: 'wind-arrow',
        data: windArrowData,
        getSourcePosition: d => d.from,
        getTargetPosition: d => d.to,
        getColor: [0, 220, 255, 200],
        getWidth: 3,
        widthMinPixels: 2,
        pickable: false,
      }),

      // ── Sample points ────────────────────────────────────────────────
      new ScatterplotLayer<SamplePoint>({
        id: 'sample-points',
        data: allPoints,
        getPosition: p => [p.lng, p.lat, 0],
        getRadius: p => p.id === selectedId ? 14 : 9,
        getFillColor: p => {
          const ann = annotations[p.id];
          if (ann?.priority) return PRIORITY_COLOR[ann.priority];
          const base = STACK_COLORS[p.stackId] ?? [150, 150, 150];
          return [...base, p.id === selectedId ? 255 : 200] as [number,number,number,number];
        },
        getLineColor: p => p.id === selectedId ? [255,255,255,255] : [255,255,255,120],
        lineWidthMinPixels: 1,
        stroked: true,
        radiusMinPixels: 5,
        pickable: true,
        updateTriggers: {
          getRadius:    selectedId,
          getFillColor: [selectedId, annotations],
          getLineColor: selectedId,
        },
      }),

      // ── Sample labels ─────────────────────────────────────────────────
      ...(showLabels ? [
        new TextLayer<SamplePoint>({
          id: 'sample-labels',
          data: allPoints,
          getPosition: p => [p.lng, p.lat, 0],
          getText: p => `S${p.sampleIndex + 1}`,
          getSize: 10,
          getColor: [255, 255, 255, 220],
          getPixelOffset: [0, -16],
          fontWeight: 'bold',
          pickable: false,
        }),
      ] : []),

      // ── Stack markers ─────────────────────────────────────────────────
      new ScatterplotLayer({
        id: 'stack-markers',
        data: INCINERATOR_STACKS,
        getPosition: s => [s.lng, s.lat, 0],
        getRadius: 14,
        getFillColor: [220, 38, 38, 255],
        getLineColor: [255, 255, 255, 255],
        lineWidthMinPixels: 2,
        stroked: true,
        radiusMinPixels: 7,
        pickable: true,
      }),

      // ── Stack labels ──────────────────────────────────────────────────
      new TextLayer({
        id: 'stack-labels',
        data: INCINERATOR_STACKS,
        getPosition: s => [s.lng, s.lat, 0],
        getText: s => s.name,
        getSize: 11,
        getColor: [255, 180, 180, 255],
        getPixelOffset: [0, -22],
        fontWeight: 'bold',
        pickable: false,
      }),
    ];
  }, [allPoints, arcPolygons, showCircles, showLabels, selectedId, annotations, windArrowData, config]);

  // ── Hover / click ─────────────────────────────────────────────────────
  const handleHover = useCallback((info: PickingInfo) => {
    setCursor(info.object ? 'pointer' : 'grab');
  }, []);

  const handleClick = useCallback((info: PickingInfo) => {
    if (!info.object) { setSelectedId(null); return; }
    const obj = info.object as SamplePoint;
    if (obj.id) setSelectedId(obj.id === selectedId ? null : obj.id);
  }, [selectedId]);

  // ── Priority counts ───────────────────────────────────────────────────
  const priorityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, unannotated: 0 };
    allPoints.forEach(p => {
      const ann = annotations[p.id];
      if (!ann) counts.unannotated++;
      else counts[ann.priority]++;
    });
    return counts;
  }, [allPoints, annotations]);

  return (
    <div className="flex flex-col w-full h-full bg-miami-night overflow-hidden">

      {/* ── Top control bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 z-20 border-b border-miami-border"
           style={{ background: 'rgba(4,8,16,0.97)' }}>

        {/* Logo / title */}
        <div className="flex items-center gap-2 mr-2">
          <Target size={15} className="text-miami-teal flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-white leading-none">Sampling Plan</p>
            <p className="text-[9px] text-gray-500 leading-none">
              {allPoints.length} pts · {INCINERATOR_STACKS.length} stacks · seed {seed}
            </p>
          </div>
        </div>

        <div className="w-px h-6 bg-miami-border mx-1" />

        {/* Radius slider (live-updates config in mapStore) */}
        <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
          Radius
          <input type="range" min={0.25} max={2.0} step={0.25}
            value={config.radiusMiles}
            onChange={e => updateSamplingConfig({ radiusMiles: +e.target.value })}
            className="w-20 accent-miami-teal" />
          <span className="text-white w-8">{config.radiusMiles}mi</span>
        </label>

        {/* Sample count */}
        <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
          N
          <input type="range" min={3} max={20} step={1}
            value={config.sampleCount}
            onChange={e => updateSamplingConfig({ sampleCount: +e.target.value })}
            className="w-16 accent-miami-teal" />
          <span className="text-white w-4">{config.sampleCount}</span>
        </label>

        <div className="w-px h-6 bg-miami-border mx-1" />

        {/* Toggles */}
        {([
          ['Arc zones', showArc,     setShowArc],
          ['Circles',  showCircles,  setShowCircles],
          ['Labels',   showLabels,   setShowLabels],
        ] as const).map(([label, val, setter]) => (
          <button key={label}
            onClick={() => setter(!val)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              val ? 'bg-miami-teal/20 text-miami-teal border border-miami-teal/40'
                  : 'text-gray-600 hover:text-gray-400 border border-transparent'
            }`}>
            {label}
          </button>
        ))}

        {/* Map style toggle */}
        <button onClick={() => setMapStyle(s => s === 'satellite' ? 'topo' : 'satellite')}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-gray-400 hover:text-white border border-miami-border transition-colors">
          <Layers size={11} />
          {mapStyle === 'satellite' ? 'Topo' : 'Dark'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Wind info (live from mapStore) */}
          <div className="flex items-center gap-1 text-[10px] text-miami-teal/80 border border-miami-teal/20 rounded px-2 py-1">
            <Wind size={10} />
            <span>{windSpeed} m/s @ {windBearing}° (ESE)</span>
          </div>

          {/* Regenerate */}
          <button onClick={() => setSeed(s => s + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#7C3AED]/20 text-[#A170F1] border border-[#7C3AED]/40 text-[10px] font-bold hover:bg-[#7C3AED]/30 transition-colors">
            <RefreshCw size={11} />
            Regenerate
          </button>

          {/* Export CSV */}
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors">
            <Download size={11} />
            Export CSV
          </button>

          {/* Back to Digital Twin */}
          <a href="/"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 hover:text-white border border-miami-border hover:border-miami-teal/40 transition-colors">
            <ExternalLink size={10} />
            Digital Twin
          </a>
        </div>
      </div>

      {/* ── Map + sidebar ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Map */}
        <div className="flex-1 relative">
          <DeckGL
            initialViewState={{
              longitude: -80.3534,
              latitude:   25.8012,
              zoom:       14,
              pitch:      30,
              bearing:    0,
            }}
            layers={layers}
            onHover={handleHover}
            onClick={handleClick}
            getCursor={() => cursor}
            controller={true}
          >
            <Map
              ref={mapRef}
              mapStyle={MAP_STYLES[mapStyle]}
              attributionControl={false}
            />
          </DeckGL>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 rounded-lg p-3 text-[10px] space-y-1.5 pointer-events-none"
               style={{ background: 'rgba(4,8,16,0.88)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {INCINERATOR_STACKS.map(s => {
              const c = STACK_COLORS[s.id];
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: `rgb(${c.join(',')})` }} />
                  <span className="text-gray-300">{s.name}</span>
                </div>
              );
            })}
            <div className="border-t border-white/10 pt-1.5 mt-1.5 space-y-1">
              {(['high','medium','low'] as const).map(p => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: `rgba(${PRIORITY_COLOR[p].join(',')})` }} />
                  <span className="text-gray-400 capitalize">{p} priority</span>
                  <span className="ml-auto text-gray-600">{priorityCounts[p]}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full border border-gray-600 flex-shrink-0" />
                <span>Unannotated</span>
                <span className="ml-auto">{priorityCounts.unannotated}</span>
              </div>
            </div>
            <div className="border-t border-white/10 pt-1.5 flex items-center gap-2 text-miami-teal/70">
              <Wind size={9} />
              <span>Wind → {((windBearing + 180) % 360).toFixed(0)}° ({windSpeed} m/s)</span>
            </div>
          </div>

          {/* Click hint */}
          {!selectedId && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 pointer-events-none">
              Click a sample point to annotate
            </div>
          )}
        </div>

        {/* ── Annotation sidebar ──────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-miami-border overflow-y-auto"
             style={{ background: 'rgba(4,8,16,0.97)' }}>

          {/* Summary header */}
          <div className="px-4 py-3 border-b border-miami-border">
            <p className="text-xs font-bold text-white">Site Selection Notes</p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {allPoints.length} points · {Object.keys(annotations).length} annotated
            </p>
            {/* Per-stack breakdown */}
            <div className="mt-2 space-y-1">
              {INCINERATOR_STACKS.map(s => {
                const pts = allPoints.filter(p => p.stackId === s.id);
                const flagged = pts.filter(p => annotations[p.id]?.flagged).length;
                const c = STACK_COLORS[s.id];
                return (
                  <div key={s.id} className="flex items-center gap-2 text-[10px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: `rgb(${c.join(',')})` }} />
                    <span className="text-gray-400 flex-1">{s.name}</span>
                    <span className="text-gray-600">{pts.length} pts</span>
                    {flagged > 0 && (
                      <span className="text-red-400 font-bold">{flagged} ⚑</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Point detail panel */}
          {selectedPoint && selectedAnnotation ? (
            <div className="flex-1 px-4 py-3 space-y-4">

              {/* Point ID + location */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: `rgb(${(STACK_COLORS[selectedPoint.stackId] ?? [150,150,150]).join(',')})` }} />
                  <p className="text-sm font-bold text-white">{selectedPoint.id}</p>
                  <button
                    onClick={() => patchAnnotation(selectedPoint.id, { flagged: !selectedAnnotation.flagged })}
                    className={`ml-auto text-xs transition-colors ${selectedAnnotation.flagged ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}
                    title="Flag for follow-up">
                    ⚑
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  {[
                    ['Stack',    selectedPoint.stackId.replace('STACK-', '')],
                    ['Distance', `${(selectedPoint.distanceMiles * 5280).toFixed(0)} ft`],
                    ['Bearing',  `${selectedPoint.bearingFromStack.toFixed(0)}°`],
                    ['Lat',      selectedPoint.lat.toFixed(5)],
                    ['Lng',      selectedPoint.lng.toFixed(5)],
                    ['Sample #', `S${selectedPoint.sampleIndex + 1} of ${config.sampleCount}`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-600">{k}: </span>
                      <span className="text-gray-300">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Depth */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Sample depth</label>
                <input
                  type="text"
                  value={selectedAnnotation.depth}
                  onChange={e => patchAnnotation(selectedPoint.id, { depth: e.target.value })}
                  className="w-full bg-white/5 border border-miami-border rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-miami-teal/50"
                  placeholder="e.g. 0–15 cm"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1.5">Priority</label>
                <div className="flex gap-1.5">
                  {(['high','medium','low'] as const).map(p => (
                    <button key={p}
                      onClick={() => patchAnnotation(selectedPoint.id, { priority: p })}
                      className={`flex-1 py-1.5 rounded text-[10px] font-bold capitalize transition-colors ${
                        selectedAnnotation.priority === p
                          ? 'text-black'
                          : 'bg-white/5 text-gray-500 hover:text-white'
                      }`}
                      style={selectedAnnotation.priority === p
                        ? { background: `rgba(${PRIORITY_COLOR[p].slice(0,3).join(',')},0.9)` }
                        : {}}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Field notes</label>
                <textarea
                  rows={5}
                  value={selectedAnnotation.notes}
                  onChange={e => patchAnnotation(selectedPoint.id, { notes: e.target.value })}
                  placeholder="Land use, access issues, nearby receptors, surface observations..."
                  className="w-full bg-white/5 border border-miami-border rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-miami-teal/50 resize-none"
                />
              </div>

              {/* Coordinates copy */}
              <button
                onClick={() => navigator.clipboard.writeText(
                  `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`
                )}
                className="w-full py-1.5 rounded text-[10px] text-gray-500 hover:text-white border border-miami-border hover:border-miami-teal/40 transition-colors flex items-center justify-center gap-1.5">
                <MapPin size={10} />
                Copy coords for Google Earth
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
              <ChevronRight size={24} className="text-gray-700" />
              <p className="text-[11px] text-gray-600">
                Select a sample point on the map to annotate it
              </p>
              <p className="text-[10px] text-gray-700">
                Annotations are exported with the CSV
              </p>
            </div>
          )}

          {/* Protocol reference footer */}
          <div className="px-4 py-3 border-t border-miami-border text-[9px] text-gray-700 space-y-1">
            <p className="flex items-center gap-1"><Info size={9} /> Dr. Phil composite protocol</p>
            <p>Arc: {config.arcCenterBearing}° ± {config.arcWidthDeg / 2}° · {config.sampleCount} grabs/stack</p>
            <p>Analytes: {config.analytes.join(', ')}</p>
            <p>Prevailing wind: ESE {nvidiaSimConfig.windBearing}° — deposition to W/SW</p>
          </div>
        </div>
      </div>
    </div>
  );
}
