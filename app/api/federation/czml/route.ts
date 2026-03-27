/**
 * /api/federation/czml — CesiumJS CZML Time-Animation Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a CZML document encoding:
 *  • PFAS plume propagation over time (Gaussian P-G model frames)
 *  • Waste facility markers (billboards + labels)
 *  • Fire event period (Feb 12 – Mar 2, 2023) — emergency plume overlay
 *  • WIT landfill CH₄ methane bubble (annual GHGRP emissions)
 *  • EJ impact rings (3-mile / 1-mile)
 *
 * Consumable by:
 *  • CesiumJS (cesium.com/platform/cesiumjs) — 3D globe viewer
 *  • Nextspace Navigator — nav.nextspace.host (CesiumJS viewer mode)
 *  • MiamiVerse 3D SmartCity Viewer
 *  • NVIDIA Omniverse Cesium for Omniverse plugin
 *
 * CZML spec: https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
 *
 * Query params:
 *  ?scenario=operations|fire_event|combined
 *  ?start=ISO8601 &end=ISO8601 (defaults: 1982-01-01 / 2024-12-31)
 *  ?windSpeed=4.5  &windBearing=110  &stabilityClass=C
 */

import { NextRequest, NextResponse } from 'next/server';
import incineratorHistory from '@/data/incinerator-history.json';
import witData from '@/data/wit-landfill-521.json';

const CORS = { 'Access-Control-Allow-Origin': '*' };

// ── Gaussian σ for CZML ellipse radius ───────────────────────────────────
type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
const SIGMA_Y_PARAMS: Record<StabilityClass, [number, number]> = {
  A: [0.22, 0.16], B: [0.16, 0.12], C: [0.11, 0.08],
  D: [0.08, 0.06], E: [0.06, 0.03], F: [0.04, 0.016],
};
function sigmaY(x: number, cls: StabilityClass): number {
  const [a, b] = SIGMA_Y_PARAMS[cls];
  return a * x * Math.pow(1 + b * x, -0.5);
}

// ── Destination point from bearing + distance ─────────────────────────────
function destPoint(lat: number, lng: number, bearingDeg: number, distM: number) {
  const R = 6_371_000;
  const φ1 = lat * (Math.PI / 180);
  const λ1 = lng * (Math.PI / 180);
  const θ  = bearingDeg * (Math.PI / 180);
  const d  = distM / R;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: φ2 * (180 / Math.PI), lng: λ2 * (180 / Math.PI) };
}

// ── CZML packet builders ──────────────────────────────────────────────────
function clockPacket(start: string, end: string): Record<string, unknown> {
  return {
    id:      'document',
    name:    'SaveMiami PFAS Plume Simulation',
    version: '1.0',
    clock: {
      interval:    `${start}/${end}`,
      currentTime: start,
      multiplier:  86400,  // 1 day/sec default
      range:       'LOOP_STOP',
      step:        'SYSTEM_CLOCK_MULTIPLIER',
    },
  };
}

function facilityPacket(
  id: string, name: string, lng: number, lat: number,
  color: number[], description: string
): Record<string, unknown> {
  return {
    id,
    name,
    description,
    position: { cartographicDegrees: [lng, lat, 0] },
    point: {
      color:       { rgba: color },
      pixelSize:   16,
      outlineColor:{ rgba: [255, 255, 255, 120] },
      outlineWidth: 1.5,
      heightReference: 'CLAMP_TO_GROUND',
    },
    label: {
      text:          name,
      font:          '11px sans-serif',
      fillColor:     { rgba: [255, 255, 255, 220] },
      outlineColor:  { rgba: [0, 0, 0, 180] },
      outlineWidth:  2,
      style:         'FILL_AND_OUTLINE',
      pixelOffset:   { cartesian2: [0, -20] },
      heightReference: 'CLAMP_TO_GROUND',
    },
  };
}

function plumeEllipsePackets(
  scenario: string,
  windBearing: number,
  windSpeed: number,
  stabilityClass: StabilityClass,
  fireStart: string, fireEnd: string
): Record<string, unknown>[] {
  const packets: Record<string, unknown>[] = [];
  const srcLng = -80.3534;
  const srcLat =  25.8012;
  // "Wind going to" direction (meteorological bearing = FROM)
  const goingDeg = (windBearing + 180) % 360;

  // Distances (500m, 2km, 5km, 12km, 25km)
  const distances = [500, 2000, 5000, 12000, 25000];

  distances.forEach((distM, i) => {
    const center = destPoint(srcLat, srcLng, goingDeg, distM);
    const sy  = sigmaY(distM, stabilityClass);
    const concentration = Math.exp(-distM / (windSpeed * 3600)) * (scenario === 'fire_event' ? 4.5 : 1.0);

    const rgba = scenario === 'fire_event'
      ? [220, 50, 20, Math.round(120 * concentration)]
      : scenario === 'ash_leachate'
        ? [100, 100, 100, Math.round(90 * concentration)]
        : [140, 0, 255, Math.round(100 * concentration)];

    const availability = scenario === 'fire_event'
      ? `${fireStart}/${fireEnd}`
      : '1984-01-01T00:00:00Z/2024-12-31T23:59:59Z';

    packets.push({
      id:           `pfas-plume-ring-${i}`,
      name:         `PFAS Plume ${distM >= 1000 ? distM / 1000 + 'km' : distM + 'm'}`,
      availability,
      position:     { cartographicDegrees: [center.lng, center.lat, 0] },
      ellipse: {
        semiMajorAxis: sy * 2,
        semiMinorAxis: sy * 0.6,
        rotation:      -(goingDeg * Math.PI / 180),
        material: {
          solidColor: { color: { rgba } },
        },
        heightReference: 'CLAMP_TO_GROUND',
        classificationType: 'TERRAIN',
      },
      properties: {
        concentration_ugm3: concentration.toFixed(4),
        distanceM: distM,
        sigmaY_m:  sy.toFixed(1),
        scenario,
        dataQuality: 'modelled',
      },
    });
  });

  return packets;
}

// ── Handler ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const scenario       = (p.get('scenario') ?? 'combined') as string;
  const startISO       = p.get('start') ?? '1982-01-01T00:00:00Z';
  const endISO         = p.get('end')   ?? '2024-12-31T23:59:59Z';
  const windBearing    = Number(p.get('windBearing') ?? 110);
  const windSpeed      = Number(p.get('windSpeed')   ?? 4.5);
  const stabilityClass = (p.get('stabilityClass') ?? 'C') as StabilityClass;

  const fireTimeline = (incineratorHistory.operational_timeline as Array<Record<string, unknown>>)
    .find(e => e.phase === 'fire_event') as Record<string, unknown> | undefined;
  const fd = (fireTimeline?.fire_details ?? {}) as Record<string, unknown>;
  const fireStart = (fd.start_date as string ?? '2023-02-12') + 'T00:00:00Z';
  const fireEnd   = (fd.end_date   as string ?? '2023-03-02') + 'T23:59:59Z';

  const fac   = incineratorHistory.facility;
  const witFac = witData.facility;

  const packets: Record<string, unknown>[] = [
    // Document clock
    clockPacket(startISO, endISO),

    // Incinerator marker
    facilityPacket(
      'MD-INC-001',
      'Resources Recovery Facility',
      fac.coordinates[0], fac.coordinates[1],
      [220, 38, 38, 255],
      `<b>Miami-Dade Incinerator</b><br/>Operator: Covanta Energy (closed 2023)<br/>` +
      `Fire: Feb 12–Mar 2, 2023 (18 days)<br/>PFAS in ash leachate: 8,900 ppt (×2,225 EPA MCL)`
    ),

    // Fire event marker (only during fire period)
    {
      id:           'fire-event-2023',
      name:         '🔥 Incinerator Fire — Feb 12, 2023',
      availability: `${fireStart}/${fireEnd}`,
      position:     { cartographicDegrees: [fac.coordinates[0], fac.coordinates[1], 100] },
      point: {
        color:     { rgba: [255, 60, 0, 255] },
        pixelSize: 28,
        outlineColor: { rgba: [255, 200, 0, 255] },
        outlineWidth: 3,
      },
      properties: {
        operator:        'Covanta Energy',
        durationDays:    18,
        buildingsOnFire: 4,
        dataSource:      'Earthjustice/Florida Rising Report (May 2023)',
        pfasNote:        fd._pfas_note ?? 'MODEL ESTIMATE',
      },
    },

    // WIT Landfill marker
    facilityPacket(
      'WIT-LANDFILL-521',
      'Medley Landfill #521 (WIT)',
      witFac.coordinates.lng, witFac.coordinates.lat,
      [251, 191, 36, 255],
      `<b>Medley Landfill (WIT #521)</b><br/>Operator: ${witFac.operator}<br/>` +
      `CH₄: 0.0847 MMTCO2e (2023 GHGRP)<br/>142 kg/hr (Carbon Mapper AVIRIS-NG)<br/>` +
      `EJ: 79th percentile · 84.2% POC`
    ),

    // EJ rings
    {
      id:   'ej-ring-3mi',
      name: 'EJScreen 3-mile ring',
      position: { cartographicDegrees: [witFac.coordinates.lng, witFac.coordinates.lat, 0] },
      ellipse: {
        semiMajorAxis: 4828,
        semiMinorAxis: 4828,
        material: { solidColor: { color: { rgba: [245, 158, 11, 25] } } },
        outline: true,
        outlineColor: { rgba: [245, 158, 11, 150] },
        outlineWidth: 1.5,
        heightReference: 'CLAMP_TO_GROUND',
      },
    },
    {
      id:   'ej-ring-1mi',
      name: 'EJScreen 1-mile inner ring',
      position: { cartographicDegrees: [witFac.coordinates.lng, witFac.coordinates.lat, 0] },
      ellipse: {
        semiMajorAxis: 1609,
        semiMinorAxis: 1609,
        material: { solidColor: { color: { rgba: [239, 68, 68, 35] } } },
        outline: true,
        outlineColor: { rgba: [239, 68, 68, 180] },
        outlineWidth: 2,
        heightReference: 'CLAMP_TO_GROUND',
      },
    },

    // PFAS plume rings
    ...plumeEllipsePackets(scenario, windBearing, windSpeed, stabilityClass, fireStart, fireEnd),
  ];

  return new NextResponse(JSON.stringify(packets, null, 2), {
    headers: {
      ...CORS,
      'Content-Type':  'application/czml+json',
      'Cache-Control': 's-maxage=300',
      'X-Scenario':    scenario,
    },
  });
}
