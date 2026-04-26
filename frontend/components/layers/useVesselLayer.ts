import { IconLayer } from '@deck.gl/layers';
import { useMapStore } from '@/store/mapStore';

const VESSEL_COLOR_MAP: Record<string, [number, number, number]> = {
  passenger: [0, 180, 216],
  cargo:     [245, 158, 11],
  tanker:    [220, 38, 38],
  fishing:   [16, 185, 129],
  tug:       [139, 92, 246],
  research:  [34, 211, 238],
  pleasure:  [251, 191, 36],
};

function vesselColor(type: string | null | undefined): [number, number, number] {
  return VESSEL_COLOR_MAP[type ?? ''] ?? [156, 163, 175];
}

export function useVesselLayer() {
  const { vessels, activeLayers, setHoverInfo } = useMapStore();

  if (!activeLayers.has('vessels') || vessels.length === 0) return [];

  return [
    new IconLayer({
      id:   'vessels',
      data: vessels,
      getPosition: (d) => [d.longitude, d.latitude],
      getColor: (d) => vesselColor(d.vessel_type),
      getSize: 20,
      // Simple circle icon — avoids needing an icon atlas
      getIcon: () => ({
        url: `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="rgba(0,180,216,0.9)" stroke="white" stroke-width="2"/><polygon points="12,4 16,14 12,12 8,14" fill="white"/></svg>`,
        width: 24,
        height: 24,
        anchorX: 12,
        anchorY: 12,
      }),
      sizeScale: 1,
      pickable: true,
      onHover: (info) => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            type: 'vessel',
            name: info.object.name,
            mmsi: info.object.mmsi,
            speed_knots: info.object.speed_knots,
          });
        } else {
          setHoverInfo(null);
        }
      },
    }),
  ];
}
