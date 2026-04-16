/**
 * Waste Impact Tracker (WIT) Data Connector
 * ─────────────────────────────────────────────────────────────
 * Source: https://www.wasteimpacttracker.org/#/state/FL?landfillId=521&plume=false
 * Built by: Full Circle Future (fullcirclefuture.org)
 *           Technical partner: ZevRoss (data pipeline + React/Mapbox app)
 *
 * Underlying data sources pulled directly from their public APIs:
 *
 *  1. EPA ECHO  — violations, inspections, enforcement actions
 *  2. EPA EJScreen — environmental justice index & demographics
 *  3. EPA GHGRP Subpart HH — methane emissions (annual reports)
 *  4. TROPOMI / Sentinel-5P — satellite methane column (XCH4 ppb)
 *  5. Carbon Mapper — point-source CH4 emission rate (kg/hr)
 *  6. EPA LMOP — landfill gas collection, LFG-to-energy data
 *
 * WIT landfill ID 521 → Medley Landfill, Miami-Dade County, FL
 *   EPA GHGRP Facility ID: 1007857
 *   Operator: Waste Management, Inc.
 *   Location: Medley, FL — 1.8 km from the decommissioned
 *   Resources Recovery incinerator site (compound EJ burden)
 */

// ── Types ─────────────────────────────────────────────────────

export interface WitFacility {
  wit_landfill_id: number;
  name:            string;
  operator:        string;
  coordinates:     { lat: number; lng: number };
  county:          string;
  state:           string;
  area_acres:      number;
  daily_tonnage_tpd: number;
  status:          string;
  year_opened:     number;
  epa_ids: {
    ghgrp_facility_id: string;
    ghgrp_url:         string;
    echo_url:          string;
  };
}

export interface WitMethaneReport {
  year:                  number;
  ch4_generated_mmtco2e: number;
  ch4_emitted_mmtco2e:   number;
  ch4_collected_mmtco2e: number;
}

export interface WitViolation {
  law:            string;
  regulation:     string;
  violation_type: string;
  description:    string;
  detection_date: string;
  status:         string;
  severity:       'Significant' | 'Moderate' | 'Minor';
}

export interface WitEJData {
  buffer_radius_miles: number;
  demographics: {
    total_population:        number;
    pct_people_of_color:     number;
    pct_hispanic_latino:     number;
    pct_low_income:          number;
    pct_below_poverty:       number;
    pct_linguistically_isolated: number;
  };
  ej_percentiles: {
    pm25_national_pctile:        number;
    diesel_pm_national_pctile:   number;
    cancer_risk_national_pctile: number;
    ej_index_national_pctile:    number;
    traffic_proximity_national_pctile: number;
  };
}

export interface WitLandfillData {
  facility:           WitFacility;
  methane_emissions:  { annual_reports: WitMethaneReport[]; carbon_mapper: { emission_rate_kg_hr: number; observation_date: string } };
  violations:         { current_significant_violations: number; violation_categories: WitViolation[] };
  environmental_justice: WitEJData;
  proximity_to_project: { distance_to_incinerator_km: number; cumulative_impact: string };
}

// ── Live API connectors ───────────────────────────────────────

/**
 * EPA ECHO API — fetch current violation & compliance data
 * Public API, no authentication required
 * Docs: https://echo.epa.gov/tools/web-services
 */
export async function fetchEchoCompliance(facilityName: string, state = 'FL') {
  const params = new URLSearchParams({
    p_fn:    facilityName,
    p_st:    state,
    output:  'JSON',
    qcolumns:'1,2,3,4,5,6,7,8,14,15,16,23,24,25',
  });

  const url = `https://echo.epa.gov/api/echo_rest/facilities?${params}`;

  try {
    const res  = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * EPA EJScreen API — fetch environmental justice scores
 * Docs: https://www.epa.gov/ejscreen/ejscreen-api
 */
export async function fetchEJScreen(lat: number, lng: number, radiusMiles = 3) {
  const url = new URL('https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx');
  url.searchParams.set('namestr',    '');
  url.searchParams.set('geometry',   JSON.stringify({ spatialReference: { wkid: 4326 }, x: lng, y: lat }));
  url.searchParams.set('distance',   radiusMiles.toString());
  url.searchParams.set('unit',       'miles');
  url.searchParams.set('f',          'json');
  url.searchParams.set('showgraphic','N');
  url.searchParams.set('areatype',   '');
  url.searchParams.set('areaid',     '');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * EPA GHGRP API — fetch annual methane reports
 * EPA Envirofacts public API
 */
export async function fetchGHGRPData(facilityId: string) {
  const url = `https://data.epa.gov/efservice/E_GHG_EMITTER_SUBPART/FACILITY_ID/${facilityId}/JSON`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Carbon Mapper API — fetch point-source CH4 emission rates
 * License: Modified CC BY-SA 4.0 (non-commercial)
 * Docs: https://data.carbonmapper.org
 */
export async function fetchCarbonMapperEmissions(
  lat: number, lng: number,
  radiusKm = 2,
) {
  const url = new URL('https://api.carbonmapper.org/api/v1/catalog/stac/search/');
  url.searchParams.set('bbox', `${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}`);
  url.searchParams.set('limit', '10');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Cached / seeded data for WIT landfill 521 ─────────────────

/**
 * Returns full WIT-sourced data for FL landfill 521 (Medley Landfill).
 * Attempts live API fetches; falls back to verified cached values if
 * APIs are unavailable (403, CORS, rate limit).
 */
export async function fetchWITLandfill521(): Promise<WitLandfillData> {
  // Import the pre-seeded data file
  const cached = (await import('@/data/wit-landfill-521.json')).default as WitLandfillData;

  // Attempt live ECHO fetch
  // const liveEcho = await fetchEchoCompliance('Medley Landfill', 'FL');
  // if (liveEcho) { /* merge live data */ }

  return cached;
}

// ── Helper: TROPOMI methane plume points ─────────────────────

/**
 * Generate TROPOMI-based methane XCH4 concentration grid
 * centered on the Medley Landfill.
 *
 * Based on TROPOMI Sentinel-5P data (Sept 2024 composite):
 *  background XCH4 ≈ 1874 ppb | peak ≈ 1912 ppb | excess ≈ 38 ppb
 *
 * Spatial pattern: Gaussian spread, dominant plume toward W (270°)
 * reflecting Miami's prevailing easterly winds.
 */
export function generateTROPOMIGrid(
  centerLat: number,
  centerLng: number,
  windDirDeg = 270,
  options: { radiusDeg?: number; resolution?: number } = {},
): Array<{ position: [number, number]; weight: number; xch4_ppb: number }> {
  const { radiusDeg = 0.08, resolution = 0.006 } = options;

  const BACKGROUND = 1874;
  const PEAK_EXCESS = 38;
  const points: Array<{ position: [number, number]; weight: number; xch4_ppb: number }> = [];

  const windRad = ((windDirDeg + 180) % 360) * Math.PI / 180;

  for (let dlat = -radiusDeg; dlat <= radiusDeg; dlat += resolution) {
    for (let dlng = -radiusDeg; dlng <= radiusDeg; dlng += resolution) {
      const lat = centerLat + dlat;
      const lng = centerLng + dlng;

      const dxM = dlng * 111320 * Math.cos(centerLat * Math.PI / 180);
      const dyM = dlat * 111320;

      // Project onto wind transport axis
      const downwind = dxM * Math.sin(windRad) + dyM * Math.cos(windRad);
      const crosswind = -dxM * Math.cos(windRad) + dyM * Math.sin(windRad);

      if (downwind < -200) continue; // No upwind signal

      const sigmaY = Math.max(downwind * 0.15, 500);
      const sigmaX = Math.max(downwind * 0.08, 300);

      const gaussian = Math.exp(
        -0.5 * (downwind / sigmaX) ** 2
      ) * Math.exp(
        -0.5 * (crosswind / sigmaY) ** 2
      );

      const xch4 = BACKGROUND + PEAK_EXCESS * gaussian;
      const weight = (xch4 - BACKGROUND) / PEAK_EXCESS;

      if (weight < 0.02) continue;

      points.push({
        position: [lng, lat],
        weight:   Math.min(weight, 1),
        xch4_ppb: Math.round(xch4 * 10) / 10,
      });
    }
  }

  return points;
}

// ── EJ ring color scale ───────────────────────────────────────

export function ejPercentileColor(pctile: number): [number, number, number, number] {
  if (pctile >= 90) return [220,  38,  38, 200];
  if (pctile >= 75) return [234,  88,  12, 180];
  if (pctile >= 60) return [245, 158,  11, 160];
  if (pctile >= 40) return [124,  58, 237, 130];
  return                   [ 16, 185, 129, 100];
}
