import { create } from 'zustand';
import {
  DEFAULT_SAMPLING_CONFIG,
  type SamplingConfig,
  type AnalyteResults,
} from '@/lib/sampling/field-protocol';

// ── Layer identifiers ──────────────────────────────────────────
export type LayerId =
  | 'waste'
  | 'landfills'
  | 'incinerator'
  | 'pfas_plume'
  | 'wind_field'
  | 'ash_storage'
  | 'zero_waste'
  | 'water'
  | 'flood_risk'
  | 'canopy'
  | 'heat_islands'
  | 'recycling'
  | 'composting'
  | 'epa_superfund'
  | 'sampling';

// ── Simulation modes ───────────────────────────────────────────
export type SimulationMode = 'historical' | 'live' | 'scenario';
export type PfasScenario = 'operations' | 'fire_event' | 'combined' | 'ash_leachate';
export type WasteScenario = 'status_quo' | 'zero_waste_2030' | 'circular_economy' | 'consortium_305';

// ── View state ─────────────────────────────────────────────────
export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}

// ── Time range ─────────────────────────────────────────────────
export interface TimeRange {
  start: Date;
  end: Date;
  current: Date;
  playing: boolean;
  speed: number; // multiplier
}

// ── NVIDIA Simulation config ───────────────────────────────────
export interface NvidiaSimConfig {
  enabled: boolean;
  particleCount: number;
  physicsMode: 'gaussian_plume' | 'gpu_fluid' | 'omniverse_modulus';
  windSpeed: number;  // m/s
  windBearing: number; // degrees
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Pasquill-Gifford
  releaseHeight: number; // meters (stack height)
  emissionRate: number;  // g/s (PFAS equivalent)
  showUncertainty: boolean;
  gpuAccelerated: boolean;
}

// ── Map store ─────────────────────────────────────────────────
export interface MapStore {
  // View
  viewState: ViewState;
  setViewState: (vs: Partial<ViewState>) => void;

  // Active layers
  activeLayers: Set<LayerId>;
  toggleLayer: (id: LayerId) => void;
  setLayerActive: (id: LayerId, active: boolean) => void;

  // Waste panel open/close
  wastePanelOpen: boolean;
  setWastePanelOpen: (open: boolean) => void;

  // Time slider
  timeRange: TimeRange;
  setCurrentTime: (date: Date) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;

  // PFAS simulation
  pfasScenario: PfasScenario;
  setPfasScenario: (s: PfasScenario) => void;
  nvidiaSimConfig: NvidiaSimConfig;
  updateNvidiaSimConfig: (c: Partial<NvidiaSimConfig>) => void;

  // Zero waste / 305 Consortium
  wasteScenario: WasteScenario;
  setWasteScenario: (s: WasteScenario) => void;

  // Simulation mode
  simulationMode: SimulationMode;
  setSimulationMode: (m: SimulationMode) => void;

  // Tooltip / hover info
  hoverInfo: Record<string, unknown> | null;
  setHoverInfo: (info: Record<string, unknown> | null) => void;

  // Incinerator focus mode
  incineratorFocusMode: boolean;
  setIncineratorFocusMode: (v: boolean) => void;

  // 5D landfill evolution
  show5DEvolution: boolean;
  setShow5DEvolution: (v: boolean) => void;

  // NVIDIA panel
  nvidiaPanelOpen: boolean;
  setNvidiaPanelOpen: (v: boolean) => void;

  // ── Sampling / GIS heat map ────────────────────────────────
  showSamplingLayer: boolean;
  setShowSamplingLayer: (v: boolean) => void;

  samplingPanelOpen: boolean;
  setSamplingPanelOpen: (v: boolean) => void;

  samplingConfig: SamplingConfig;
  updateSamplingConfig: (c: Partial<SamplingConfig>) => void;

  /** Which analyte to heat-map: PFOA_ppt | PFOS_ppt | totalPFAS_ppt | lead_ppm */
  samplingAnalyte: keyof AnalyteResults;
  setSamplingAnalyte: (a: keyof AnalyteResults) => void;

  /** Show the sampling arc/wedge zone polygon */
  showArcZone: boolean;
  setShowArcZone: (v: boolean) => void;

  /** Compare mode: show model plume and sampling heatmap side-by-side */
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;

  // ── Waste Impact Tracker (WIT) — EDF Landfill #521 ────────
  showWITLayer: boolean;
  setShowWITLayer: (v: boolean) => void;
  showWITPlume: boolean;
  setShowWITPlume: (v: boolean) => void;
  showWITEJRing: boolean;
  setShowWITEJRing: (v: boolean) => void;
  witYear: number;
  setWitYear: (y: number) => void;
  witPanelOpen: boolean;
  setWITPanelOpen: (v: boolean) => void;
}

const MIAMI_CENTER: ViewState = {
  longitude: -80.2,
  latitude: 25.775,
  zoom: 10.5,
  pitch: 30,
  bearing: 0,
};

const HISTORICAL_START = new Date('1970-01-01');
const HISTORICAL_END   = new Date('2024-12-31');

export const useMapStore = create<MapStore>((set) => ({
  // ── View ───────────────────────────────────────────────────
  viewState: MIAMI_CENTER,
  setViewState: (vs) =>
    set((state) => ({ viewState: { ...state.viewState, ...vs } })),

  // ── Layers ─────────────────────────────────────────────────
  activeLayers: new Set<LayerId>(['waste', 'landfills', 'incinerator', 'water']),
  toggleLayer: (id) =>
    set((state) => {
      const next = new Set(state.activeLayers);
      next.has(id) ? next.delete(id) : next.add(id);
      return { activeLayers: next };
    }),
  setLayerActive: (id, active) =>
    set((state) => {
      const next = new Set(state.activeLayers);
      active ? next.add(id) : next.delete(id);
      return { activeLayers: next };
    }),

  // ── Panels ─────────────────────────────────────────────────
  wastePanelOpen: false,
  setWastePanelOpen: (open) => set({ wastePanelOpen: open }),

  // ── Time ───────────────────────────────────────────────────
  timeRange: {
    start: HISTORICAL_START,
    end: HISTORICAL_END,
    current: new Date('2023-11-15'), // Default: incinerator fire date
    playing: false,
    speed: 1,
  },
  setCurrentTime: (date) =>
    set((state) => ({ timeRange: { ...state.timeRange, current: date } })),
  togglePlayback: () =>
    set((state) => ({
      timeRange: { ...state.timeRange, playing: !state.timeRange.playing },
    })),
  setPlaybackSpeed: (speed) =>
    set((state) => ({ timeRange: { ...state.timeRange, speed } })),

  // ── PFAS simulation ────────────────────────────────────────
  pfasScenario: 'fire_event',
  setPfasScenario: (pfasScenario) => set({ pfasScenario }),
  nvidiaSimConfig: {
    enabled: true,
    particleCount: 50000,
    physicsMode: 'gaussian_plume',
    windSpeed: 4.5,
    windBearing: 110, // ESE — prevailing Miami wind from SE
    stabilityClass: 'C',
    releaseHeight: 85,
    emissionRate: 2.8,
    showUncertainty: true,
    gpuAccelerated: true,
  },
  updateNvidiaSimConfig: (c) =>
    set((state) => ({ nvidiaSimConfig: { ...state.nvidiaSimConfig, ...c } })),

  // ── Zero waste ─────────────────────────────────────────────
  wasteScenario: 'zero_waste_2030',
  setWasteScenario: (wasteScenario) => set({ wasteScenario }),

  // ── Simulation mode ────────────────────────────────────────
  simulationMode: 'historical',
  setSimulationMode: (simulationMode) => set({ simulationMode }),

  // ── UI ─────────────────────────────────────────────────────
  hoverInfo: null,
  setHoverInfo: (hoverInfo) => set({ hoverInfo }),

  incineratorFocusMode: false,
  setIncineratorFocusMode: (incineratorFocusMode) => set({ incineratorFocusMode }),

  show5DEvolution: false,
  setShow5DEvolution: (show5DEvolution) => set({ show5DEvolution }),

  nvidiaPanelOpen: false,
  setNvidiaPanelOpen: (nvidiaPanelOpen) => set({ nvidiaPanelOpen }),

  // ── Sampling ───────────────────────────────────────────────
  showSamplingLayer: false,
  setShowSamplingLayer: (showSamplingLayer) => set({ showSamplingLayer }),

  samplingPanelOpen: false,
  setSamplingPanelOpen: (samplingPanelOpen) => set({ samplingPanelOpen }),

  samplingConfig: DEFAULT_SAMPLING_CONFIG,
  updateSamplingConfig: (c) =>
    set((state) => ({ samplingConfig: { ...state.samplingConfig, ...c } })),

  samplingAnalyte: 'PFOA_ppt',
  setSamplingAnalyte: (samplingAnalyte) => set({ samplingAnalyte }),

  showArcZone: true,
  setShowArcZone: (showArcZone) => set({ showArcZone }),

  compareMode: false,
  setCompareMode: (compareMode) => set({ compareMode }),

  // ── WIT ────────────────────────────────────────────────────
  showWITLayer: true,
  setShowWITLayer: (showWITLayer) => set({ showWITLayer }),
  showWITPlume: false,
  setShowWITPlume: (showWITPlume) => set({ showWITPlume }),
  showWITEJRing: true,
  setShowWITEJRing: (showWITEJRing) => set({ showWITEJRing }),
  witYear: 2023,
  setWitYear: (witYear) => set({ witYear }),
  witPanelOpen: false,
  setWITPanelOpen: (witPanelOpen) => set({ witPanelOpen }),
}));
