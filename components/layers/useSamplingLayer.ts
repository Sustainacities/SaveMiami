/**
 * useSamplingLayer — deck.gl Layers for Field Sampling Visualization
 * ─────────────────────────────────────────────────────────────────
 * Renders:
 *   1. Sampling arc (wedge polygon) — western 120° sector around each stack
 *   2. Individual grab sample points (9 per stack, color-coded)
 *   3. Composite sample centroid markers
 *   4. Stack-to-sample leader lines
 *   5. Sampling heatmap — actual or simulated lab results
 *   6. Comparison overlay vs Gaussian plume model
 *
 * Dr. Phil's protocol:
 *   9 grab samples | 1 mi | western arc (easterly winds) | composite
 */

import { useMemo } from 'react';
import {
  ScatterplotLayer,
  LineLayer,
  PolygonLayer,
  TextLayer,
  IconLayer,
} from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import type { Layer } from '@deck.gl/core';

import { useMapStore } from '@/store/mapStore';
import {
  buildAllCompositeSamples,
  generateSamplingArcPolygon,
  samplesToHeatmapPoints,
  INCINERATOR_STACKS,
  type SamplePoint,
  type AnalyteResults,
} from '@/lib/sampling/field-protocol';

// ── Simulated lab results for demonstration ───────────────────
// In production, these come from actual laboratory data loaded from
// the field data connector / LIMS API.

const DEMO_RESULTS: Record<string, AnalyteResults> = {
  // Stack U1 — closest to affected neighborhoods, highest readings
  'STACK-U1-S01': { PFOA_ppt: 48.2,  PFOS_ppt: 62.1, totalPFAS_ppt: 142.8, lead_ppm: 38.4 },
  'STACK-U1-S02': { PFOA_ppt: 31.5,  PFOS_ppt: 44.8, totalPFAS_ppt: 98.2,  lead_ppm: 22.1 },
  'STACK-U1-S03': { PFOA_ppt: 72.4,  PFOS_ppt: 89.3, totalPFAS_ppt: 198.4, lead_ppm: 51.2 },
  'STACK-U1-S04': { PFOA_ppt: 18.9,  PFOS_ppt: 28.7, totalPFAS_ppt: 64.3,  lead_ppm: 14.8 },
  'STACK-U1-S05': { PFOA_ppt: 55.1,  PFOS_ppt: 71.2, totalPFAS_ppt: 168.9, lead_ppm: 42.3 },
  'STACK-U1-S06': { PFOA_ppt: 24.3,  PFOS_ppt: 35.8, totalPFAS_ppt: 78.6,  lead_ppm: 18.9 },
  'STACK-U1-S07': { PFOA_ppt: 41.7,  PFOS_ppt: 53.2, totalPFAS_ppt: 118.4, lead_ppm: 32.1 },
  'STACK-U1-S08': { PFOA_ppt: 63.8,  PFOS_ppt: 78.4, totalPFAS_ppt: 182.1, lead_ppm: 47.6 },
  'STACK-U1-S09': { PFOA_ppt: 29.4,  PFOS_ppt: 41.2, totalPFAS_ppt: 88.7,  lead_ppm: 20.3 },
  // Stack U2
  'STACK-U2-S01': { PFOA_ppt: 22.1,  PFOS_ppt: 31.4, totalPFAS_ppt: 72.1,  lead_ppm: 16.8 },
  'STACK-U2-S02': { PFOA_ppt: 38.7,  PFOS_ppt: 49.2, totalPFAS_ppt: 108.6, lead_ppm: 29.4 },
  'STACK-U2-S03': { PFOA_ppt: 15.3,  PFOS_ppt: 22.8, totalPFAS_ppt: 48.2,  lead_ppm: 11.2 },
  'STACK-U2-S04': { PFOA_ppt: 51.4,  PFOS_ppt: 64.7, totalPFAS_ppt: 148.3, lead_ppm: 38.9 },
  'STACK-U2-S05': { PFOA_ppt: 29.8,  PFOS_ppt: 40.1, totalPFAS_ppt: 88.1,  lead_ppm: 22.4 },
  'STACK-U2-S06': { PFOA_ppt: 44.2,  PFOS_ppt: 57.8, totalPFAS_ppt: 128.4, lead_ppm: 34.1 },
  'STACK-U2-S07': { PFOA_ppt: 18.6,  PFOS_ppt: 27.3, totalPFAS_ppt: 58.9,  lead_ppm: 14.2 },
  'STACK-U2-S08': { PFOA_ppt: 33.9,  PFOS_ppt: 45.6, totalPFAS_ppt: 98.4,  lead_ppm: 25.7 },
  'STACK-U2-S09': { PFOA_ppt: 62.1,  PFOS_ppt: 76.8, totalPFAS_ppt: 178.2, lead_ppm: 46.3 },
  // Stack U3
  'STACK-U3-S01': { PFOA_ppt: 12.4,  PFOS_ppt: 18.9, totalPFAS_ppt: 38.2,  lead_ppm: 9.1 },
  'STACK-U3-S02': { PFOA_ppt: 28.7,  PFOS_ppt: 38.4, totalPFAS_ppt: 82.4,  lead_ppm: 21.3 },
  'STACK-U3-S03': { PFOA_ppt: 45.3,  PFOS_ppt: 58.1, totalPFAS_ppt: 132.8, lead_ppm: 35.6 },
  'STACK-U3-S04': { PFOA_ppt: 19.8,  PFOS_ppt: 29.2, totalPFAS_ppt: 62.1,  lead_ppm: 15.4 },
  'STACK-U3-S05': { PFOA_ppt: 37.2,  PFOS_ppt: 48.6, totalPFAS_ppt: 108.1, lead_ppm: 28.3 },
  'STACK-U3-S06': { PFOA_ppt: 56.4,  PFOS_ppt: 69.8, totalPFAS_ppt: 162.3, lead_ppm: 43.2 },
  'STACK-U3-S07': { PFOA_ppt: 8.2,   PFOS_ppt: 13.4, totalPFAS_ppt: 24.8,  lead_ppm: 6.3 },
  'STACK-U3-S08': { PFOA_ppt: 41.9,  PFOS_ppt: 54.3, totalPFAS_ppt: 118.7, lead_ppm: 32.8 },
  'STACK-U3-S09': { PFOA_ppt: 24.1,  PFOS_ppt: 34.7, totalPFAS_ppt: 72.4,  lead_ppm: 18.6 },
};

// ── Color scale for PFOA concentration ───────────────────────
// EPA MCL = 4 ppt → anything above is a concern
function pfasConcentrationColor(ppt: number | undefined): [number, number, number, number] {
  if (ppt === undefined) return [100, 100, 100, 180]; // grey = no data
  if (ppt > 70)  return [220,  38,  38, 255]; // critical   (>17× MCL)
  if (ppt > 40)  return [234,  88,  12, 240]; // very high
  if (ppt > 20)  return [245, 158,  11, 220]; // high
  if (ppt > 10)  return [161, 112, 241, 200]; // elevated
  if (ppt >  4)  return [  0, 180, 216, 180]; // above MCL
  return             [  16, 185, 129, 160];   // below MCL (safe)
}

// ── Main hook ─────────────────────────────────────────────────
export function useSamplingLayer(): Layer[] {
  const { samplingConfig, showSamplingLayer, samplingAnalyte, showArcZone } =
    useMapStore();

  // Build composite samples for all 3 stacks
  const allComposites = useMemo(
    () => buildAllCompositeSamples(INCINERATOR_STACKS, samplingConfig),
    [samplingConfig]
  );

  // Flatten all grab samples + inject demo results
  const allSamples = useMemo(() => {
    const samples: SamplePoint[] = allComposites.flatMap((c) =>
      c.samples.map((s) => ({
        ...s,
        results: DEMO_RESULTS[s.id],
      }))
    );
    return samples;
  }, [allComposites]);

  // Composite centroid points
  const compositePoints = useMemo(
    () => allComposites.map((c) => ({
      ...c.composite,
      results: {
        // Average of all grab samples for this stack
        PFOA_ppt: c.samples.reduce(
          (sum, s) => sum + (DEMO_RESULTS[s.id]?.PFOA_ppt ?? 0), 0
        ) / c.samples.length,
        PFOS_ppt: c.samples.reduce(
          (sum, s) => sum + (DEMO_RESULTS[s.id]?.PFOS_ppt ?? 0), 0
        ) / c.samples.length,
        totalPFAS_ppt: c.samples.reduce(
          (sum, s) => sum + (DEMO_RESULTS[s.id]?.totalPFAS_ppt ?? 0), 0
        ) / c.samples.length,
      } as AnalyteResults,
      protocol: c.protocol,
    })),
    [allComposites]
  );

  // Arc zone polygons
  const arcPolygons = useMemo(
    () => INCINERATOR_STACKS.map((stack) => ({
      contour: [generateSamplingArcPolygon(stack, samplingConfig)],
      stackId: stack.id,
    })),
    [samplingConfig]
  );

  // Leader lines from stacks to sample points
  const leaderLines = useMemo(() => {
    if (!showSamplingLayer) return [];
    return INCINERATOR_STACKS.flatMap((stack) => {
      const composite = allComposites.find((c) => c.stackId === stack.id);
      if (!composite) return [];
      return composite.samples.map((s) => ({
        from: [stack.lng, stack.lat, 0] as [number, number, number],
        to:   [s.lng,     s.lat,    0] as [number, number, number],
        color: [124, 58, 237, 60] as [number, number, number, number],
      }));
    });
  }, [allComposites, showSamplingLayer]);

  // Heatmap points from sample results
  const heatmapPoints = useMemo(
    () => samplesToHeatmapPoints(allSamples, samplingAnalyte),
    [allSamples, samplingAnalyte]
  );

  // ── Build layer array ─────────────────────────────────────
  return useMemo(() => {
    if (!showSamplingLayer) return [];

    const layers: Layer[] = [];

    // 1. Sampling arc zone polygons
    if (showArcZone) {
      layers.push(
        new PolygonLayer({
          id:               'sampling-arc-zones',
          data:              arcPolygons,
          getPolygon:       (d) => d.contour,
          getFillColor:     [124, 58, 237, 18],
          getLineColor:     [124, 58, 237, 160],
          getLineWidth:     2,
          lineWidthMinPixels: 1,
          stroked:          true,
          filled:           true,
          pickable:         false,
        })
      );
    }

    // 2. Leader lines stack → sample points
    layers.push(
      new LineLayer({
        id:               'sampling-leader-lines',
        data:              leaderLines,
        getSourcePosition:(d) => d.from,
        getTargetPosition:(d) => d.to,
        getColor:         (d) => d.color,
        getWidth:         1,
        widthMinPixels:   1,
        pickable:         false,
        getDashArray:     [4, 4],
        extensions:       [],
      })
    );

    // 3. Individual grab sample points
    layers.push(
      new ScatterplotLayer({
        id:             'grab-sample-points',
        data:            allSamples,
        getPosition:    (d) => [d.lng, d.lat] as [number, number],
        getRadius:      40,
        radiusMinPixels:5,
        radiusMaxPixels:14,
        getFillColor:   (d) => pfasConcentrationColor(d.results?.PFOA_ppt),
        getLineColor:   [255, 255, 255, 180],
        lineWidthMinPixels: 1.5,
        stroked:        true,
        filled:         true,
        pickable:       true,
        autoHighlight:  true,
        highlightColor: [255, 255, 255, 60],
      })
    );

    // 4. Sample point labels (index numbers)
    layers.push(
      new TextLayer({
        id:              'grab-sample-labels',
        data:             allSamples,
        getPosition:     (d) => [d.lng, d.lat, 0] as [number, number, number],
        getText:         (d) => `S${d.sampleIndex}`,
        getSize:         9,
        getColor:        [255, 255, 255, 220],
        getTextAnchor:   'middle',
        getAlignmentBaseline: 'center',
        pickable:        false,
      })
    );

    // 5. Composite centroid markers (diamonds / larger)
    layers.push(
      new ScatterplotLayer({
        id:             'composite-markers',
        data:            compositePoints,
        getPosition:    (d) => [d.lng, d.lat] as [number, number],
        getRadius:      80,
        radiusMinPixels:10,
        radiusMaxPixels:22,
        getFillColor:   (d) => pfasConcentrationColor(d.results?.PFOA_ppt),
        getLineColor:   [255, 255, 255, 240],
        lineWidthMinPixels: 2.5,
        stroked:        true,
        filled:         true,
        pickable:       true,
        autoHighlight:  true,
        highlightColor: [255, 255, 255, 60],
      })
    );

    // 6. Composite labels
    layers.push(
      new TextLayer({
        id:              'composite-labels',
        data:             compositePoints,
        getPosition:     (d) => [d.lng, d.lat, 0] as [number, number, number],
        getText:         (d) => `⊕ ${d.stackId.replace('STACK-', '')}`,
        getSize:         11,
        getColor:        [255, 255, 255, 240],
        getTextAnchor:   'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset:  [0, -16],
        pickable:        false,
        fontWeight:      700,
      })
    );

    // 7. Stack source markers
    layers.push(
      new ScatterplotLayer({
        id:             'stack-markers',
        data:            INCINERATOR_STACKS,
        getPosition:    (d) => [d.lng, d.lat] as [number, number],
        getRadius:      60,
        radiusMinPixels:8,
        getFillColor:   [220, 38, 38, 220],
        getLineColor:   [255, 120, 0, 255],
        lineWidthMinPixels: 2,
        stroked:        true,
        filled:         true,
        pickable:       true,
      })
    );

    layers.push(
      new TextLayer({
        id:              'stack-labels',
        data:             INCINERATOR_STACKS,
        getPosition:     (d) => [d.lng, d.lat, 0] as [number, number, number],
        getText:         (d) => `🏭 ${d.name}`,
        getSize:         10,
        getColor:        [255, 120, 0, 240],
        getTextAnchor:   'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset:  [0, -14],
        pickable:        false,
      })
    );

    // 8. Sampling result heatmap (actual data overlay)
    if (heatmapPoints.some((p) => p.weight > 0)) {
      layers.push(
        new HeatmapLayer({
          id:           'sampling-result-heatmap',
          data:          heatmapPoints,
          getPosition:  (d) => d.position,
          getWeight:    (d) => d.weight,
          radiusPixels: 80,
          intensity:    2.0,
          threshold:    0.03,
          colorRange: [
            [16,  185, 129, 0],    // transparent (below MCL)
            [0,   180, 216, 100],  // above MCL
            [161, 112, 241, 160],  // elevated
            [245, 158,  11, 200],  // high
            [220,  38,  38, 230],  // critical
            [180,   0,   0, 255],  // extreme
          ],
          pickable: false,
        })
      );
    }

    return layers;
  }, [
    showSamplingLayer, showArcZone, arcPolygons, leaderLines,
    allSamples, compositePoints, heatmapPoints,
  ]);
}
