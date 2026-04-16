/**
 * useWasteLayers — deck.gl Layer Factory
 * ─────────────────────────────────────────────────────────────
 * Assembles all deck.gl layers for the Miami Digital Twin
 * waste tracking visualization. GPU-accelerated via WebGL.
 *
 * Layers built:
 *  1. Landfill sites      — ScatterplotLayer + IconLayer
 *  2. Incinerator site    — IconLayer + fire animation
 *  3. PFAS plume          — HeatmapLayer (Gaussian dispersion)
 *  4. Wind vectors        — LineLayer arrows
 *  5. Ash storage zone    — PolygonLayer
 *  6. Zero waste hubs     — ScatterplotLayer (scenario)
 *  7. Affected radius     — PolygonLayer (risk rings)
 *  8. Recycling stations  — ScatterplotLayer
 *  9. Composting sites    — ScatterplotLayer
 * 10. EPA superfund sites — IconLayer
 */

import { useMemo } from 'react';
import { ScatterplotLayer, LineLayer, PolygonLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Layer } from '@deck.gl/core';

import { useMapStore } from '@/store/mapStore';
import { generatePlumeGrid, PFAS_RISK_THRESHOLDS } from '@/lib/simulation/gaussian-plume';
import wasteSitesGeoJSON from '@/data/waste-sites.geojson';
import zeroWasteData from '@/data/zero-waste-scenarios.json';

// ── Type shorthands ───────────────────────────────────────────
type RGBAColor = [number, number, number, number];

// ── Helper: degrees → radians ─────────────────────────────────
function deg2rad(d: number) { return d * Math.PI / 180; }

// ── Helper: destination point given bearing + distance ────────
function destinationPoint(
  lat: number, lng: number,
  bearingDeg: number, distanceKm: number
): [number, number] {
  const R = 6371;
  const δ = distanceKm / R;
  const θ = deg2rad(bearingDeg);
  const φ1 = deg2rad(lat);
  const λ1 = deg2rad(lng);
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );
  return [λ2 * 180 / Math.PI, φ2 * 180 / Math.PI];
}

/** Generate a circle polygon for risk rings */
function circlePolygon(
  lat: number, lng: number, radiusKm: number, segments = 64
): [number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const bearing = (360 / segments) * i;
    return destinationPoint(lat, lng, bearing, radiusKm);
  });
}

// ── Main hook ─────────────────────────────────────────────────
export function useWasteLayers(): Layer[] {
  const {
    activeLayers,
    nvidiaSimConfig,
    pfasScenario,
    wasteScenario,
    timeRange,
  } = useMapStore();

  // Extract incinerator feature
  const incineratorFeature = wasteSitesGeoJSON.features.find(
    (f) => f.id === 'MD-INC-001'
  );
  const incLat = (incineratorFeature?.geometry as GeoJSON.Point)?.coordinates?.[1] ?? 25.8012;
  const incLng = (incineratorFeature?.geometry as GeoJSON.Point)?.coordinates?.[0] ?? -80.3534;

  // ── PFAS plume generation ──────────────────────────────────
  const plumePoints = useMemo(() => {
    if (!activeLayers.has('pfas_plume') || !nvidiaSimConfig.enabled) return [];

    // Scenario-specific emission rates
    const emissionRates: Record<string, number> = {
      operations:  0.8,
      fire_event:  2.8,
      combined:    3.4,
      ash_leachate:0.3,
    };

    const grid = generatePlumeGrid({
      sourceLat:       incLat,
      sourceLng:       incLng,
      stackHeightM:    pfasScenario === 'fire_event' ? 2800 : nvidiaSimConfig.releaseHeight,
      emissionRateGS:  emissionRates[pfasScenario] ?? 2.8,
      windSpeedMS:     nvidiaSimConfig.windSpeed,
      windDirectionDeg:nvidiaSimConfig.windBearing,
      stabilityClass:  nvidiaSimConfig.stabilityClass,
      gridResolutionDeg: 0.008,
      maxDistanceKm:   40,
    });

    return grid.map((s) => ({
      position: [s.lng, s.lat] as [number, number],
      weight:   Math.min(s.concentration * 100, 1),
    }));
  }, [activeLayers, nvidiaSimConfig, pfasScenario, incLat, incLng]);

  // ── Wind arrow vectors ────────────────────────────────────
  const windArrows = useMemo(() => {
    if (!activeLayers.has('wind_field')) return [];
    const arrows = [];
    const spacing = 0.08;
    const bounds = { latMin: 25.4, latMax: 26.1, lngMin: -80.8, lngMax: -80.1 };
    const windRad = deg2rad(nvidiaSimConfig.windBearing + 180); // transport direction
    const arrowLen = 0.04;

    for (let lat = bounds.latMin; lat <= bounds.latMax; lat += spacing) {
      for (let lng = bounds.lngMin; lng <= bounds.lngMax; lng += spacing) {
        const dx = Math.sin(windRad) * arrowLen;
        const dy = Math.cos(windRad) * arrowLen;
        arrows.push({
          from: [lng, lat] as [number, number],
          to:   [lng + dx, lat + dy] as [number, number],
          speed: nvidiaSimConfig.windSpeed,
        });
      }
    }
    return arrows;
  }, [activeLayers, nvidiaSimConfig]);

  // ── Landfill sites ────────────────────────────────────────
  const landfillPoints = useMemo(() => {
    if (!activeLayers.has('landfills')) return [];
    return wasteSitesGeoJSON.features
      .filter((f) => ['landfill', 'transfer_station'].includes(f.properties.type as string))
      .map((f) => ({
        position: (f.geometry as GeoJSON.Point).coordinates as [number, number],
        properties: f.properties,
      }));
  }, [activeLayers]);

  // ── Zero waste hubs (scenario) ────────────────────────────
  const zeroWasteHubs = useMemo(() => {
    if (!activeLayers.has('zero_waste')) return [];
    const scenario = (zeroWasteData.scenarios as Record<string, { hubs?: Array<{ coordinates: number[]; name: string; capacity_tpd: number; jobs: number; status: string }>}>)[wasteScenario];
    return (scenario?.hubs ?? []).map((hub) => ({
      position: hub.coordinates as [number, number],
      name:     hub.name,
      capacity: hub.capacity_tpd,
      jobs:     hub.jobs,
      status:   hub.status,
    }));
  }, [activeLayers, wasteScenario]);

  // ── Risk rings (PFAS contamination radius) ────────────────
  const riskRings = useMemo(() => {
    if (!activeLayers.has('pfas_plume')) return [];
    return [
      { radiusKm: 5,  color: [220, 38, 38, 40]   as RGBAColor, border: [220, 38, 38, 180]  as RGBAColor, label: 'Critical' },
      { radiusKm: 15, color: [245, 158, 11, 25]  as RGBAColor, border: [245, 158, 11, 120] as RGBAColor, label: 'High' },
      { radiusKm: 25, color: [124, 58, 237, 15]  as RGBAColor, border: [124, 58, 237, 80]  as RGBAColor, label: 'Elevated' },
      { radiusKm: 40, color: [0, 180, 216, 8]    as RGBAColor, border: [0, 180, 216, 50]   as RGBAColor, label: 'Detectable' },
    ].map((ring) => ({
      contour:    [circlePolygon(incLat, incLng, ring.radiusKm)],
      fillColor:  ring.color,
      lineColor:  ring.border,
      label:      ring.label,
      radiusKm:   ring.radiusKm,
    }));
  }, [activeLayers, incLat, incLng]);

  // ── EPA monitoring points ─────────────────────────────────
  const epaPoints = useMemo(() => {
    if (!activeLayers.has('epa_superfund')) return [];
    return wasteSitesGeoJSON.features
      .filter((f) => f.properties.type === 'epa_monitoring')
      .map((f) => ({
        position: (f.geometry as GeoJSON.Point).coordinates as [number, number],
        properties: f.properties,
      }));
  }, [activeLayers]);

  // ── Build deck.gl layer array ─────────────────────────────
  return useMemo(() => {
    const layers: Layer[] = [];

    // 1. PFAS Heatmap (Gaussian plume)
    if (plumePoints.length > 0) {
      layers.push(
        new HeatmapLayer({
          id:          'pfas-heatmap',
          data:        plumePoints,
          getPosition: (d) => d.position,
          getWeight:   (d) => d.weight,
          radiusPixels:60,
          intensity:   1.5,
          threshold:   0.05,
          colorRange: [
            [0, 180, 216, 0],
            [124, 58, 237, 120],
            [180, 30, 200, 180],
            [220, 38, 38, 220],
            [255, 100, 0, 255],
          ],
          pickable: false,
        })
      );
    }

    // 2. Risk rings
    if (riskRings.length > 0) {
      layers.push(
        new PolygonLayer({
          id:                   'risk-rings',
          data:                  riskRings,
          getPolygon:           (d) => d.contour,
          getFillColor:         (d) => d.fillColor,
          getLineColor:         (d) => d.lineColor,
          getLineWidth:         1,
          lineWidthMinPixels:   1,
          stroked:              true,
          filled:               true,
          pickable:             true,
        })
      );
    }

    // 3. Landfill sites
    if (landfillPoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id:             'landfill-sites',
          data:            landfillPoints,
          getPosition:    (d) => d.position,
          getRadius:      800,
          getFillColor:   [107, 114, 128, 180],
          getLineColor:   [245, 158, 11, 220],
          lineWidthMinPixels: 2,
          stroked:        true,
          filled:         true,
          pickable:       true,
          autoHighlight:  true,
          highlightColor: [245, 158, 11, 60],
        })
      );
    }

    // 4. Incinerator site — always shown if waste layer active
    if (activeLayers.has('incinerator')) {
      layers.push(
        new ScatterplotLayer({
          id:           'incinerator-site',
          data:         [{ position: [incLng, incLat] as [number, number] }],
          getPosition:  (d) => d.position,
          getRadius:    600,
          getFillColor: [220, 38, 38, 200],
          getLineColor: [255, 120, 0, 255],
          lineWidthMinPixels: 3,
          stroked:      true,
          filled:       true,
          pickable:     true,
        }),
        // Pulsing outer ring for fire event
        new ScatterplotLayer({
          id:           'incinerator-pulse',
          data:         [{ position: [incLng, incLat] as [number, number] }],
          getPosition:  (d) => d.position,
          getRadius:    1200,
          getFillColor: [220, 38, 38, 0],
          getLineColor: [255, 80, 0, 140],
          lineWidthMinPixels: 2,
          stroked:      true,
          filled:       true,
          pickable:     false,
        })
      );
    }

    // 5. Ash storage zone
    if (activeLayers.has('ash_storage')) {
      layers.push(
        new ScatterplotLayer({
          id:           'ash-storage',
          data:         [{ position: [-80.3510, 25.8030] as [number, number] }],
          getPosition:  (d) => d.position,
          getRadius:    300,
          getFillColor: [107, 114, 128, 180],
          getLineColor: [220, 38, 38, 200],
          lineWidthMinPixels: 2,
          stroked:      true,
          filled:       true,
          pickable:     true,
        })
      );
    }

    // 6. Wind field arrows
    if (windArrows.length > 0) {
      layers.push(
        new LineLayer({
          id:           'wind-arrows',
          data:          windArrows,
          getSourcePosition: (d) => [...d.from, 0] as [number, number, number],
          getTargetPosition: (d) => [...d.to, 0]   as [number, number, number],
          getColor:     [0, 180, 216, 120],
          getWidth:     1,
          widthMinPixels: 1,
          pickable:     false,
        })
      );
    }

    // 7. Zero waste hubs
    if (zeroWasteHubs.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id:           'zero-waste-hubs',
          data:          zeroWasteHubs,
          getPosition:  (d) => d.position,
          getRadius:    500,
          getFillColor: [16, 185, 129, 200],
          getLineColor: [116, 198, 157, 255],
          lineWidthMinPixels: 2,
          stroked:      true,
          filled:       true,
          pickable:     true,
          autoHighlight:true,
          highlightColor:[16, 185, 129, 60],
        }),
        new TextLayer({
          id:           'zero-waste-labels',
          data:          zeroWasteHubs,
          getPosition:  (d) => [...d.position, 0] as [number, number, number],
          getText:      (d) => `${d.name.split('—')[1]?.trim() ?? d.name}`,
          getSize:      12,
          getColor:     [116, 198, 157, 220],
          getTextAnchor:'middle',
          getAlignmentBaseline:'bottom',
          getPixelOffset:[0, -20],
          pickable:     false,
        })
      );
    }

    // 8. EPA monitoring points
    if (epaPoints.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id:           'epa-monitoring',
          data:          epaPoints,
          getPosition:  (d) => d.position,
          getRadius:    400,
          getFillColor: [245, 158, 11, 180],
          getLineColor: [245, 158, 11, 255],
          lineWidthMinPixels: 2,
          stroked:      true,
          filled:       true,
          pickable:     true,
        })
      );
    }

    return layers;
  }, [
    plumePoints, riskRings, landfillPoints, zeroWasteHubs,
    windArrows, epaPoints, activeLayers, incLat, incLng,
  ]);
}
