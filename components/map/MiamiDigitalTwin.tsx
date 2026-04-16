'use client';

/**
 * MiamiDigitalTwin — Main Map Component
 * ─────────────────────────────────────────────────────────────
 * GPU-accelerated Digital Twin of Miami-Dade powered by:
 *  • deck.gl     — WebGL / GPU layer rendering
 *  • MapLibre    — Base map tiles (CARTO Dark Matter)
 *  • Zustand     — Reactive state management
 *  • NVIDIA APIs — Physics simulation (Modulus / Omniverse)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import type { PickingInfo } from '@deck.gl/core';
import { useMapStore } from '@/store/mapStore';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { WasteControlPanel } from '@/components/panels/WasteControlPanel';
import { NvidiaSimPanel } from '@/components/panels/NvidiaSimPanel';
import { SamplingPanel } from '@/components/panels/SamplingPanel';
import { WITPanel } from '@/components/panels/WITPanel';
import { TimeSlider } from '@/components/map/TimeSlider';
import { TopBar } from '@/components/ui/TopBar';
import { MapTooltip } from '@/components/ui/MapTooltip';
import { useWasteLayers } from '@/components/layers/useWasteLayers';
import { useSamplingLayer } from '@/components/layers/useSamplingLayer';
import { useWITLayer } from '@/components/layers/useWITLayer';
import { useParticleLayer } from '@/components/layers/useParticleLayer';
import { SimConsole } from '@/components/ui/SimConsole';
import { TimelineView } from '@/components/map/TimelineView';
import { useSimLogger } from '@/lib/simulation/sim-logger';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ??
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function MiamiDigitalTwin() {
  const mapRef = useRef<MapRef>(null);
  const {
    viewState,
    setViewState,
    wastePanelOpen,
    nvidiaPanelOpen,
    samplingPanelOpen,
    witPanelOpen,
    hoverInfo,
    setHoverInfo,
    activeLayers,
    incineratorFocusMode,
  } = useMapStore();

  const [cursor, setCursor] = useState<string>('grab');

  // ── Deck.gl layers (waste, PFAS, particles, WIT...) ───────
  const wasteLayers    = useWasteLayers();
  const samplingLayers = useSamplingLayer();
  const witLayers      = useWITLayer();
  const particleLayers = useParticleLayer();
  const deckLayers     = [...wasteLayers, ...samplingLayers, ...witLayers, ...particleLayers];

  // ── Auto-log simulation events to SimConsole ───────────────
  useSimLogger();

  // ── Tooltip on hover ──────────────────────────────────────
  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        setHoverInfo({
          x: info.x,
          y: info.y,
          ...info.object,
        });
        setCursor('pointer');
      } else {
        setHoverInfo(null);
        setCursor('grab');
      }
    },
    [setHoverInfo]
  );

  // ── Fly to incinerator when focus mode enabled ────────────
  useEffect(() => {
    if (incineratorFocusMode && mapRef.current) {
      setViewState({
        longitude: -80.3534,
        latitude:  25.8012,
        zoom:      14,
        pitch:     55,
        bearing:   -20,
        transitionDuration: 1800,
      });
    }
  }, [incineratorFocusMode, setViewState]);

  // ── Keyboard shortcut: W = toggle waste panel ─────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        useMapStore.getState().setWastePanelOpen(
          !useMapStore.getState().wastePanelOpen
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative w-full h-full bg-miami-night overflow-hidden">
      {/* ── Base map + deck.gl overlay ──────────────────── */}
      <DeckGL
        viewState={{
          ...viewState,
          transitionDuration: viewState.transitionDuration,
        }}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
        layers={deckLayers}
        onHover={handleHover}
        getCursor={() => cursor}
        controller={{ dragPan: true, scrollZoom: true, touchZoom: true }}
      >
        <Map
          ref={mapRef}
          id="miami-twin-map"
          mapStyle={MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>

      {/* ── Top bar ─────────────────────────────────────── */}
      <TopBar />

      {/* ── Layer control panel (left) ───────────────────── */}
      <LayerPanel />

      {/* ── Waste control panel (right, opens on W key) ──── */}
      {wastePanelOpen && <WasteControlPanel />}

      {/* ── NVIDIA simulation panel (bottom-right) ───────── */}
      {nvidiaPanelOpen && <NvidiaSimPanel />}

      {/* ── Sampling / GIS heatmap panel ─────────────────── */}
      {samplingPanelOpen && <SamplingPanel />}

      {/* ── Waste Impact Tracker panel (FCF / landfill 521) ── */}
      {witPanelOpen && <WITPanel />}

      {/* ── Simulation console (bottom-left) ─────────────── */}
      <SimConsole />

      {/* ── Graphical timeline view (above time slider) ───── */}
      <TimelineView />

      {/* ── Time slider (bottom) ─────────────────────────── */}
      <TimeSlider />

      {/* ── Hover tooltip ────────────────────────────────── */}
      {hoverInfo && <MapTooltip info={hoverInfo} />}

      {/* ── Active layer indicators ──────────────────────── */}
      <ActiveLayerBadges activeLayers={activeLayers} />

      {/* ── Attribution ──────────────────────────────────── */}
      <div className="absolute bottom-10 right-2 text-xs text-gray-600 pointer-events-none">
        © CARTO · © OpenStreetMap · SaveMiami
      </div>
    </div>
  );
}

// ── Small badge list showing active layers ────────────────────
function ActiveLayerBadges({ activeLayers }: { activeLayers: Set<string> }) {
  const labels: Record<string, { label: string; color: string }> = {
    incinerator: { label: 'Incinerator', color: '#DC2626' },
    pfas_plume:  { label: 'PFAS Plume',  color: '#7C3AED' },
    wind_field:  { label: 'Wind Field',  color: '#00B4D8' },
    ash_storage: { label: 'Ash Storage', color: '#6B7280' },
    zero_waste:  { label: 'Zero Waste',  color: '#10B981' },
    recycling:   { label: 'Recycling',   color: '#00B4D8' },
    composting:  { label: 'Composting',  color: '#2D6A4F' },
    epa_superfund:{ label: 'EPA Sites',  color: '#F59E0B' },
  };

  const active = [...activeLayers].filter((id) => labels[id]);
  if (active.length === 0) return null;

  return (
    <div className="absolute top-16 right-4 flex flex-col gap-1 pointer-events-none">
      {active.map((id) => (
        <span
          key={id}
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: labels[id].color + '22',
            border:     `1px solid ${labels[id].color}66`,
            color:       labels[id].color,
          }}
        >
          ● {labels[id].label}
        </span>
      ))}
    </div>
  );
}
