import { create } from 'zustand';

// ── Layer identifiers ──────────────────────────────────────────
export type LayerId =
  | 'vessels'
  | 'water_quality'
  | 'flood_risk'
  | 'canopy'
  | 'heat_islands'
  | 'coral_reefs'
  | 'seagrass';

// ── View state ─────────────────────────────────────────────────
export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}

// ── Simulation modes ───────────────────────────────────────────
export type SimulationMode = 'live' | 'historical';

// ── Vessel record from backend ─────────────────────────────────
export interface VesselRecord {
  id: number;
  mmsi: string;
  name: string | null;
  vessel_type: string | null;
  flag: string | null;
  longitude: number;
  latitude: number;
  speed_knots: number | null;
  heading: number | null;
  status: string | null;
  observed_at: string;
}

// ── Water quality sample from backend ──────────────────────────
export interface WaterQualitySample {
  id: number;
  station_id: string;
  temperature_c: number | null;
  salinity_ppt: number | null;
  dissolved_oxygen_mgl: number | null;
  ph: number | null;
  turbidity_ntu: number | null;
  chlorophyll_ugl: number | null;
  longitude: number | null;
  latitude: number | null;
  sampled_at: string;
}

// ── Map store ─────────────────────────────────────────────────
interface MapStore {
  viewState: ViewState;
  setViewState: (vs: Partial<ViewState>) => void;

  activeLayers: Set<LayerId>;
  toggleLayer: (id: LayerId) => void;
  setLayerActive: (id: LayerId, active: boolean) => void;

  simulationMode: SimulationMode;
  setSimulationMode: (m: SimulationMode) => void;

  hoverInfo: Record<string, unknown> | null;
  setHoverInfo: (info: Record<string, unknown> | null) => void;

  // Live data
  vessels: VesselRecord[];
  setVessels: (v: VesselRecord[]) => void;

  waterSamples: WaterQualitySample[];
  setWaterSamples: (s: WaterQualitySample[]) => void;

  // Data loading state
  loading: boolean;
  setLoading: (v: boolean) => void;
  lastRefresh: Date | null;
  setLastRefresh: (d: Date) => void;
}

const BISCAYNE_BAY_CENTER: ViewState = {
  longitude: -80.19,
  latitude:  25.66,
  zoom:      10,
  pitch:     30,
  bearing:   0,
};

export const useMapStore = create<MapStore>((set) => ({
  viewState: BISCAYNE_BAY_CENTER,
  setViewState: (vs) =>
    set((state) => ({ viewState: { ...state.viewState, ...vs } })),

  activeLayers: new Set<LayerId>(['vessels', 'water_quality']),
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

  simulationMode: 'live',
  setSimulationMode: (simulationMode) => set({ simulationMode }),

  hoverInfo: null,
  setHoverInfo: (hoverInfo) => set({ hoverInfo }),

  vessels: [],
  setVessels: (vessels) => set({ vessels }),

  waterSamples: [],
  setWaterSamples: (waterSamples) => set({ waterSamples }),

  loading: false,
  setLoading: (loading) => set({ loading }),
  lastRefresh: null,
  setLastRefresh: (lastRefresh) => set({ lastRefresh }),
}));
