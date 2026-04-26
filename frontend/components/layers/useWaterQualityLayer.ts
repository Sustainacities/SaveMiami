import { ScatterplotLayer } from '@deck.gl/layers';
import { useMapStore } from '@/store/mapStore';

function phColor(ph: number | null | undefined): [number, number, number, number] {
  if (ph == null) return [100, 100, 100, 180];
  // Blue = acidic (< 7.8), Green = healthy (7.8–8.3), Orange = alkaline (> 8.3)
  if (ph < 7.8) return [14, 165, 233, 200];
  if (ph > 8.3) return [249, 115, 22, 200];
  return [16, 185, 129, 200];
}

export function useWaterQualityLayer() {
  const { waterSamples, activeLayers, setHoverInfo } = useMapStore();

  if (!activeLayers.has('water_quality') || waterSamples.length === 0) return [];

  // Deduplicate to latest sample per station_id
  const latest = new Map<string, (typeof waterSamples)[0]>();
  for (const s of waterSamples) {
    const existing = latest.get(s.station_id);
    if (!existing || s.sampled_at > existing.sampled_at) {
      latest.set(s.station_id, s);
    }
  }
  const points = [...latest.values()].filter((s) => s.longitude != null && s.latitude != null);

  return [
    new ScatterplotLayer({
      id:   'water_quality',
      data: points,
      getPosition: (d) => [d.longitude!, d.latitude!],
      getFillColor: (d) => phColor(d.ph),
      getRadius: 1200,
      radiusUnits: 'meters',
      pickable: true,
      opacity: 0.7,
      stroked: true,
      getLineColor: [255, 255, 255, 60],
      lineWidthMinPixels: 1,
      onHover: (info) => {
        if (info.object) {
          setHoverInfo({
            x: info.x,
            y: info.y,
            type: 'water_quality',
            station_id: info.object.station_id,
            temperature_c: info.object.temperature_c,
            ph: info.object.ph,
            dissolved_oxygen_mgl: info.object.dissolved_oxygen_mgl,
          });
        } else {
          setHoverInfo(null);
        }
      },
    }),
  ];
}
