/**
 * useWITLayer — Waste Impact Tracker deck.gl Layer Hook
 * ─────────────────────────────────────────────────────────────
 * Renders Full Circle Future Waste Impact Tracker data for FL landfill 521
 * (Medley Landfill, Miami-Dade) on the Miami Digital Twin map.
 *
 * Layers:
 *  1. Facility footprint polygon (170-acre landfill boundary approx)
 *  2. GHGRP methane bubble (proportional to annual CH4 emitted)
 *  3. TROPOMI methane plume (XCH4 ppb concentration heatmap)
 *  4. Carbon Mapper point-source pin (142 kg/hr)
 *  5. EJScreen demographic ring (3-mile buffer)
 *  6. EJ percentile donut segments
 *  7. Violation alert markers
 *  8. Proximity-to-incinerator connector line
 *  9. Labels & annotations
 */

import { useMemo } from 'react';
import {
  ScatterplotLayer,
  LineLayer,
  PolygonLayer,
  TextLayer,
  ArcLayer,
} from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Layer } from '@deck.gl/core';

import { useMapStore } from '@/store/mapStore';
import { generateTROPOMIGrid, ejPercentileColor } from '@/lib/connectors/waste-impact-tracker';
import witData from '@/data/wit-landfill-521.json';

// ── Constants pulled from data file ──────────────────────────
const FAC_LAT  = witData.facility.coordinates.lat;
const FAC_LNG  = witData.facility.coordinates.lng;
const INC_LAT  = 25.8012;   // incinerator site
const INC_LNG  = -80.3534;

// Approximate landfill boundary polygon (170 acres ≈ 0.69 km²)
// Centered at [FAC_LNG, FAC_LAT], roughly 1.05km × 0.66km rectangle
function landfillBoundary(): [number, number][] {
  const latDelta = 0.003;
  const lngDelta = 0.005;
  return [
    [FAC_LNG - lngDelta, FAC_LAT - latDelta],
    [FAC_LNG + lngDelta, FAC_LAT - latDelta],
    [FAC_LNG + lngDelta, FAC_LAT + latDelta],
    [FAC_LNG - lngDelta, FAC_LAT + latDelta],
    [FAC_LNG - lngDelta, FAC_LAT - latDelta],
  ];
}

/** Generate EJScreen 3-mile buffer ring polygon */
function ejRingPolygon(
  lat: number, lng: number, radiusMiles: number, segments = 64
): [number, number][] {
  const radiusKm = radiusMiles * 1.60934;
  const R = 6371;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const θ = (2 * Math.PI * i) / segments;
    const δ = radiusKm / R;
    const φ2 = Math.asin(Math.sin(lat * Math.PI / 180) * Math.cos(δ) +
      Math.cos(lat * Math.PI / 180) * Math.sin(δ) * Math.cos(θ));
    const λ2 = lng * Math.PI / 180 +
      Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(lat * Math.PI / 180),
        Math.cos(δ) - Math.sin(lat * Math.PI / 180) * Math.sin(φ2));
    return [λ2 * 180 / Math.PI, φ2 * 180 / Math.PI] as [number, number];
  });
}

/** Proportional bubble radius for methane emissions */
function methaneRadius(mmtco2e: number): number {
  // 1 MMTCO2e → ~800m radius at map scale
  return Math.sqrt(mmtco2e) * 900;
}

// ── Main hook ─────────────────────────────────────────────────
export function useWITLayer(): Layer[] {
  const { showWITLayer, showWITPlume, showWITEJRing, witYear, nvidiaSimConfig } =
    useMapStore();

  // Methane report for selected year
  const yearReport = useMemo(() => {
    const reports = witData.methane_emissions.annual_reports as Array<{
      year: number; ch4_emitted_mmtco2e: number; ch4_generated_mmtco2e: number; ch4_collected_mmtco2e: number;
    }>;
    return reports.find((r) => r.year === witYear) ?? reports[reports.length - 1];
  }, [witYear]);

  // TROPOMI methane plume grid
  const tropomiPoints = useMemo(() => {
    if (!showWITPlume) return [];
    return generateTROPOMIGrid(FAC_LAT, FAC_LNG, nvidiaSimConfig.windBearing);
  }, [showWITPlume, nvidiaSimConfig.windBearing]);

  // Violation markers
  const violations = useMemo(() => {
    return witData.violations.violation_categories
      .filter((v) => v.status === 'Unresolved')
      .map((v, i) => ({
        position: [FAC_LNG + i * 0.001, FAC_LAT + 0.003] as [number, number],
        ...v,
      }));
  }, []);

  // EJ percentile colors
  const ejColor = ejPercentileColor(
    witData.environmental_justice.ej_percentiles.ej_index_national_pctile
  );

  return useMemo(() => {
    if (!showWITLayer) return [];

    const layers: Layer[] = [];

    // 1. ── TROPOMI methane plume heatmap ──────────────────
    if (showWITPlume && tropomiPoints.length > 0) {
      layers.push(
        new HeatmapLayer({
          id:           'wit-tropomi-plume',
          data:          tropomiPoints,
          getPosition:  (d) => d.position,
          getWeight:    (d) => d.weight,
          radiusPixels: 70,
          intensity:    1.8,
          threshold:    0.05,
          colorRange: [
            [16,  185, 129, 0],   // transparent (background)
            [245, 158,  11, 60],  // slight excess
            [234,  88,  12, 120], // moderate
            [220,  38,  38, 180], // significant
            [139,   0,   0, 220], // peak
          ],
          pickable: false,
        })
      );
    }

    // 2. ── EJScreen 3-mile buffer ring ────────────────────
    if (showWITEJRing) {
      layers.push(
        new PolygonLayer({
          id:               'wit-ej-ring',
          data: [{
            contour: [ejRingPolygon(FAC_LAT, FAC_LNG, 3)],
            color:   [...ejColor.slice(0, 3), 18] as [number, number, number, number],
            border:  ejColor,
          }],
          getPolygon:       (d) => d.contour,
          getFillColor:     (d) => d.color,
          getLineColor:     (d) => d.border,
          getLineWidth:     2,
          lineWidthMinPixels: 1.5,
          stroked:          true,
          filled:           true,
          pickable:         false,
          dashJustified:    true,
        })
      );

      // 1-mile inner ring
      layers.push(
        new PolygonLayer({
          id:               'wit-ej-ring-1mi',
          data: [{
            contour: [ejRingPolygon(FAC_LAT, FAC_LNG, 1)],
          }],
          getPolygon:       (d) => d.contour,
          getFillColor:     [220, 38, 38, 8],
          getLineColor:     [220, 38, 38, 120],
          getLineWidth:     1,
          lineWidthMinPixels: 1,
          stroked:          true,
          filled:           true,
          pickable:         false,
        })
      );
    }

    // 3. ── Landfill footprint polygon ─────────────────────
    layers.push(
      new PolygonLayer({
        id:               'wit-landfill-footprint',
        data: [{ contour: [landfillBoundary()] }],
        getPolygon:       (d) => d.contour,
        getFillColor:     [245, 158, 11, 35],
        getLineColor:     [245, 158, 11, 200],
        getLineWidth:     3,
        lineWidthMinPixels: 2,
        stroked:          true,
        filled:           true,
        pickable:         true,
      })
    );

    // 4. ── GHGRP methane bubble (proportional) ───────────
    const emitted = yearReport?.ch4_emitted_mmtco2e ?? 0.31;
    layers.push(
      new ScatterplotLayer({
        id:           'wit-methane-bubble',
        data:         [{ position: [FAC_LNG, FAC_LAT] as [number, number] }],
        getPosition:  (d) => d.position,
        getRadius:    methaneRadius(emitted),
        getFillColor: [245, 158, 11, 25],
        getLineColor: [245, 158, 11, 120],
        lineWidthMinPixels: 2,
        stroked:      true,
        filled:       true,
        pickable:     false,
      })
    );

    // 5. ── Carbon Mapper point-source pin ─────────────────
    layers.push(
      new ScatterplotLayer({
        id:           'wit-carbon-mapper-pin',
        data:         [{ position: [FAC_LNG, FAC_LAT] as [number, number] }],
        getPosition:  (d) => d.position,
        getRadius:    180,
        radiusMinPixels: 10,
        radiusMaxPixels: 24,
        getFillColor: [255, 140, 0, 240],
        getLineColor: [255, 200, 0, 255],
        lineWidthMinPixels: 2.5,
        stroked:      true,
        filled:       true,
        pickable:     true,
        autoHighlight:true,
        highlightColor: [255, 200, 0, 60],
      })
    );

    // 6. ── Carbon Mapper emission label ───────────────────
    layers.push(
      new TextLayer({
        id:              'wit-carbon-mapper-label',
        data:             [{ position: [FAC_LNG, FAC_LAT, 0] as [number, number, number] }],
        getPosition:     (d) => d.position,
        getText:         () => `CH₄ 142 kg/hr`,
        getSize:         11,
        getColor:        [255, 200, 0, 240],
        getTextAnchor:   'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset:  [0, -22],
        pickable:        false,
        fontWeight:      700,
      })
    );

    // 7. ── Facility name label ────────────────────────────
    layers.push(
      new TextLayer({
        id:              'wit-facility-label',
        data:             [{ position: [FAC_LNG, FAC_LAT, 0] as [number, number, number] }],
        getPosition:     (d) => d.position,
        getText:         () => '🗑 Medley Landfill (WIT #521)',
        getSize:         12,
        getColor:        [245, 158, 11, 240],
        getTextAnchor:   'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset:  [0, -38],
        pickable:        false,
      })
    );

    // 8. ── Proximity arc to incinerator ───────────────────
    layers.push(
      new ArcLayer({
        id:              'wit-incinerator-proximity-arc',
        data: [{
          source: [FAC_LNG, FAC_LAT] as [number, number],
          target: [INC_LNG, INC_LAT] as [number, number],
        }],
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getSourceColor:   [245, 158, 11, 180],
        getTargetColor:   [220,  38,  38, 180],
        getWidth:         3,
        widthMinPixels:   2,
        greatCircle:      false,
        getHeight:        0.3,
        pickable:         true,
      })
    );

    // 9. ── Proximity label ────────────────────────────────
    const midLat = (FAC_LAT + INC_LAT) / 2 + 0.004;
    const midLng = (FAC_LNG + INC_LNG) / 2;
    layers.push(
      new TextLayer({
        id:              'wit-proximity-label',
        data:             [{ position: [midLng, midLat, 0] as [number, number, number] }],
        getPosition:     (d) => d.position,
        getText:         () => '⚠ 1.8 km apart — compound burden',
        getSize:         10,
        getColor:        [245, 158, 11, 200],
        getTextAnchor:   'middle',
        pickable:        false,
      })
    );

    // 10. ── Violation markers ─────────────────────────────
    if (violations.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id:           'wit-violation-markers',
          data:          violations,
          getPosition:  (d) => d.position,
          getRadius:    120,
          radiusMinPixels: 8,
          getFillColor: [220, 38, 38, 220],
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
          stroked:      true,
          filled:       true,
          pickable:     true,
          autoHighlight:true,
        }),
        new TextLayer({
          id:              'wit-violation-icons',
          data:             violations,
          getPosition:     (d) => [...d.position, 0] as [number, number, number],
          getText:         () => '!',
          getSize:         12,
          getColor:        [255, 255, 255, 255],
          getTextAnchor:   'middle',
          getAlignmentBaseline: 'center',
          fontWeight:      700,
          pickable:        false,
        })
      );
    }

    return layers;
  }, [
    showWITLayer, showWITPlume, showWITEJRing,
    tropomiPoints, yearReport, violations, ejColor,
  ]);
}
