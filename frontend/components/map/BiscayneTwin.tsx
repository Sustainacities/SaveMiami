'use client';

import { useCallback, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import type { PickingInfo } from '@deck.gl/core';

import { useMapStore } from '@/store/mapStore';
import { useVesselLayer }       from '@/components/layers/useVesselLayer';
import { useWaterQualityLayer } from '@/components/layers/useWaterQualityLayer';
import { LayerPanel }           from '@/components/panels/LayerPanel';
import { TopBar }               from '@/components/ui/TopBar';
import { MapTooltip }           from '@/components/ui/MapTooltip';
import { useDataRefresh }       from '@/lib/useDataRefresh';

import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ??
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function BiscayneTwin() {
  const { viewState, setViewState, hoverInfo, setHoverInfo } = useMapStore();
  const [cursor, setCursor] = useState<string>('grab');

  // Fetch vessel + water quality data on mount and every 30 s
  useDataRefresh();

  const vesselLayers      = useVesselLayer();
  const waterQualityLayers = useWaterQualityLayer();
  const deckLayers = [...vesselLayers, ...waterQualityLayers];

  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        setCursor('pointer');
      } else {
        setHoverInfo(null);
        setCursor('grab');
      }
    },
    [setHoverInfo]
  );

  return (
    <div className="relative w-full h-full bg-miami-night overflow-hidden">
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
          id="biscayne-twin-map"
          mapStyle={MAP_STYLE}
          attributionControl={false}
        />
      </DeckGL>

      <TopBar />
      <LayerPanel />

      {hoverInfo && <MapTooltip info={hoverInfo} />}

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-600 pointer-events-none">
        © CARTO · © OpenStreetMap · SaveMiami
      </div>
    </div>
  );
}
