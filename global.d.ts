// ── JSON module declarations ────────────────────────────────
declare module '*.geojson' {
  import type { FeatureCollection } from 'geojson';
  const value: FeatureCollection & {
    metadata?: Record<string, unknown>;
    features: Array<{
      type: 'Feature';
      id?: string;
      properties: Record<string, unknown>;
      geometry: GeoJSON.Geometry;
    }>;
  };
  export default value;
}
