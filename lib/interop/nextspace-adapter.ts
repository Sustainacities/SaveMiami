/**
 * nextspace-adapter.ts — Nextspace Digital Twin Entity Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts SaveMiami waste facility, plume, and sampling data into the
 * Nextspace "Universal Entity Schema" — an ontology-first data model used
 * by the Nextspace Navigator (nav.nextspace.host) and compatible with
 * NVIDIA Omniverse federation.
 *
 * Nextspace schema:
 *  • Ontology-driven: every physical object = one Entity with unique ID
 *  • Universal Schema maps source attributes without changing source data
 *  • REST + GraphQL API with JSON body
 *  • MCP (Model Context Protocol) compatible for AI agent queries
 *  • CesiumJS 3D Tiles + CZML for time-animated geospatial views
 *
 * Sources:
 *  - https://www.nextspace.com/platform
 *  - https://www.fierceelectronics.com/embedded/nextspace-help-nvidia-enable-digital-twin-federation
 *  - https://www.nextspace.com/tags/federated-digital-twins
 */

import wasteSites from '@/data/waste-sites.geojson';
import incineratorHistory from '@/data/incinerator-history.json';
import witData from '@/data/wit-landfill-521.json';

// ── Nextspace Universal Entity Schema ─────────────────────────────────────
export interface NextspaceEntity {
  entityId:    string;
  entityType:  NextspaceEntityType;
  name:        string;
  description: string;
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString';
    coordinates: number[] | number[][] | number[][][];
  };
  properties:  Record<string, unknown>;
  relationships: NextspaceRelationship[];
  metadata: {
    source:           string;
    district:         string;   // MiamiVerse district ID
    dataQuality:      'confirmed' | 'estimated' | 'modelled';
    ontologyVersion:  string;
    lastUpdated:      string;
    tags:             string[];
  };
}

export type NextspaceEntityType =
  | 'WasteFacility'
  | 'PFASMonitoringPoint'
  | 'AirEmissionSource'
  | 'ContaminationPlume'
  | 'EnvironmentalJusticeZone'
  | 'SamplingStation'
  | 'ZeroWasteHub'
  | 'Landfill'
  | 'FireEvent'
  | 'MethaneEmissionSource';

export interface NextspaceRelationship {
  type:     'CONTAINS' | 'MONITORS' | 'IMPACTS' | 'LOCATED_IN' | 'GENERATES' | 'PROXIMATES';
  targetId: string;
  label?:   string;
}

// ── MiamiVerse District IDs ───────────────────────────────────────────────
export const MIAMIVERSE_DISTRICTS: Record<string, { id: string; name: string; epsg: string }> = {
  'miami-dda':    { id: 'MVERSE-DIST-001', name: 'Miami Downtown Development Authority', epsg: 'EPSG:4326' },
  'doral':        { id: 'MVERSE-DIST-002', name: 'City of Doral',        epsg: 'EPSG:4326' },
  'medley':       { id: 'MVERSE-DIST-003', name: 'Town of Medley',       epsg: 'EPSG:4326' },
  'hialeah':      { id: 'MVERSE-DIST-004', name: 'City of Hialeah',      epsg: 'EPSG:4326' },
  'miami-lakes':  { id: 'MVERSE-DIST-005', name: 'Town of Miami Lakes',  epsg: 'EPSG:4326' },
  'brickell':     { id: 'MVERSE-DIST-006', name: 'Brickell',             epsg: 'EPSG:4326' },
  'miami-beach':  { id: 'MVERSE-DIST-007', name: 'Miami Beach',          epsg: 'EPSG:4326' },
};

const ONTOLOGY_VERSION = '1.0.0-savemiami';

// ── Factory: GeoJSON waste site → Nextspace Entity ─────────────────────────
function wasteFeatureToEntity(feature: GeoJSON.Feature): NextspaceEntity {
  const p   = feature.properties ?? {};
  const geo = feature.geometry as GeoJSON.Point;
  const id  = (p.id as string) ?? `WF-${Math.random().toString(36).slice(2,8)}`;
  const type = p.type as string;

  const entityType: NextspaceEntityType =
    type === 'incinerator'    ? 'AirEmissionSource' :
    type === 'landfill'       ? 'Landfill'          :
    type === 'transfer'       ? 'WasteFacility'     :
    type === 'composting'     ? 'ZeroWasteHub'      :
    type === 'zero_waste_hub' ? 'ZeroWasteHub'      :
    type === 'monitoring'     ? 'PFASMonitoringPoint':
    'WasteFacility';

  return {
    entityId:    id,
    entityType,
    name:        p.name as string,
    description: p.description as string ?? '',
    geometry:    geo,
    properties: {
      ...p,
      // Normalized Nextspace property names
      facilityStatus:    p.status,
      operatorName:      p.operator,
      annualThroughputT: p.capacity_tpd ? (p.capacity_tpd as number) * 365 : null,
      pfasRiskLevel:     p.pfas_risk_level ?? null,
      communityImpact:   p.affected_communities ?? [],
      dataSource:        'SaveMiami · EPA ECHO · Miami-Dade SWMD',
    },
    relationships: buildWasteRelationships(id, type, p),
    metadata: {
      source:          'SaveMiami Open Data Hub',
      district:        resolveDistrict(geo.coordinates as [number, number]),
      dataQuality:     p.status === 'proposed' ? 'modelled' : 'confirmed',
      ontologyVersion: ONTOLOGY_VERSION,
      lastUpdated:     new Date().toISOString(),
      tags:            ['waste', 'pfas', 'miami-dade', type, 'savemiami'],
    },
  };
}

function buildWasteRelationships(
  id: string,
  type: string,
  props: Record<string, unknown>
): NextspaceRelationship[] {
  const rels: NextspaceRelationship[] = [
    { type: 'LOCATED_IN', targetId: 'MVERSE-DIST-002', label: 'City of Doral / Miami-Dade' },
  ];

  if (type === 'incinerator') {
    rels.push({ type: 'GENERATES',  targetId: 'PFAS-PLUME-001',    label: 'PFAS atmospheric plume' });
    rels.push({ type: 'GENERATES',  targetId: 'ASH-STORAGE-001',   label: 'Ash storage on-site' });
    rels.push({ type: 'IMPACTS',    targetId: 'BISCAYNE-AQUIFER',  label: 'Groundwater PFAS risk' });
    rels.push({ type: 'PROXIMATES', targetId: 'WIT-LANDFILL-521',  label: '1.8 km compound burden' });
  }
  if (type === 'monitoring') {
    rels.push({ type: 'MONITORS',   targetId: 'MD-INC-001',        label: 'Incinerator PFAS monitoring' });
  }
  return rels;
}

// ── Factory: WIT Landfill → Nextspace Entity ───────────────────────────────
function witToEntity(): NextspaceEntity {
  const fac = witData.facility;
  return {
    entityId:    'WIT-LANDFILL-521',
    entityType:  'MethaneEmissionSource',
    name:        fac.name,
    description: `${fac.operator}-operated MSW landfill. ${fac.capacity_tpd} TPD. EPA GHGRP ID: ${fac.ghgrp_facility_id}. 1.8 km from incinerator — compound EJ burden.`,
    geometry: {
      type: 'Point',
      coordinates: [fac.coordinates.lng, fac.coordinates.lat, 0],
    },
    properties: {
      ghgrpId:              fac.ghgrp_facility_id,
      operator:             fac.operator,
      capacityTPD:          fac.capacity_tpd,
      areaAcres:            fac.area_acres,
      ejPercentile:         witData.environmental_justice.ejscreen_percentile,
      ch4EmittedMMTCO2e:    witData.methane_emissions.annual_reports.at(-1)?.ch4_emitted_mmtco2e ?? 0,
      carbonMapperKgHr:     witData.carbon_mapper?.emission_rate_kg_hr ?? 142,
      tropomiExcessPpb:     witData.tropomi_data?.excess_ppb ?? 38,
      asbestosNote:         'Asbestos demolition materials from Feb 2023 incinerator fire transported here',
      dataSource:           'Full Circle Future Waste Impact Tracker · EPA GHGRP · Carbon Mapper · TROPOMI',
    },
    relationships: [
      { type: 'LOCATED_IN',   targetId: 'MVERSE-DIST-003', label: 'Town of Medley' },
      { type: 'PROXIMATES',   targetId: 'MD-INC-001',       label: '1.8 km — compound burden' },
      { type: 'IMPACTS',      targetId: 'BISCAYNE-AQUIFER', label: 'Methane & leachate pathway' },
    ],
    metadata: {
      source:          'Full Circle Future Waste Impact Tracker (wasteimpacttracker.org) · EDF',
      district:        'medley',
      dataQuality:     'confirmed',
      ontologyVersion: ONTOLOGY_VERSION,
      lastUpdated:     new Date().toISOString(),
      tags:            ['landfill', 'methane', 'ch4', 'ej', 'pfas', 'miami-dade', 'wit-521'],
    },
  };
}

// ── Factory: Fire Event → Nextspace FireEvent Entity ──────────────────────
function fireEventToEntity(): NextspaceEntity {
  const fire = (incineratorHistory.operational_timeline as Array<Record<string, unknown>>)
    .find(e => e.phase === 'fire_event') as Record<string, unknown> | undefined;
  const fd = (fire?.fire_details ?? {}) as Record<string, unknown>;

  return {
    entityId:    'FIRE-EVENT-2023-02',
    entityType:  'FireEvent',
    name:        'Covanta Doral Incinerator Fire — Feb 12, 2023',
    description: '18-day uncontrolled fire at Miami-Dade Resources Recovery Facility. PM2.5 reached EPA "unhealthy" levels by Feb 14. Dioxins, HCl, asbestos released. Four buildings of eleven destroyed.',
    geometry: { type: 'Point', coordinates: [-80.3534, 25.8012, 85] },
    properties: {
      startDate:          fd.start_date ?? '2023-02-12',
      endDate:            fd.end_date   ?? '2023-03-02',
      durationDays:       18,
      buildingsAffected:  fd.buildings_involved ?? 4,
      wasteBurnedTons:    fd.waste_burned_tons ?? 8500,
      pfasReleaseKg:      fd.estimated_pfas_release_kg ?? 12.4,
      pfasReleaseNote:    'MODEL ESTIMATE — see _pfas_note in incinerator-history.json for methodology',
      airExceedances:     fd.air_quality_exceedances ?? ['PM2.5', 'HCl', 'Dioxin/Furan', 'Asbestos'],
      earthjusticeReport: fd.earthjustice_report,
      priorFires:         fd.prior_fires ?? 4,
      dataSource:         'Miami-Dade County · Earthjustice/Florida Rising May 2023 Report · EPA',
    },
    relationships: [
      { type: 'CONTAINS',  targetId: 'MD-INC-001',        label: 'Occurred at incinerator' },
      { type: 'IMPACTS',   targetId: 'MVERSE-DIST-002',   label: 'Doral — 75k residents' },
      { type: 'GENERATES', targetId: 'PFAS-PLUME-001',    label: 'Emergency PFAS plume' },
    ],
    metadata: {
      source:          'Earthjustice Doral Incinerator Fire Report (May 2023)',
      district:        'doral',
      dataQuality:     'confirmed',
      ontologyVersion: ONTOLOGY_VERSION,
      lastUpdated:     '2023-05-31T00:00:00Z',
      tags:            ['fire', 'emergency', 'pfas', 'dioxin', 'pm25', 'doral', '2023'],
    },
  };
}

// ── Resolve district from coordinates ─────────────────────────────────────
function resolveDistrict([lng, lat]: [number, number]): string {
  // Rough bounding-box assignment
  if (lng > -80.40 && lng < -80.30 && lat > 25.78 && lat < 25.85) return 'doral';
  if (lng > -80.42 && lng < -80.35 && lat > 25.81 && lat < 25.87) return 'medley';
  if (lng > -80.32 && lng < -80.20 && lat > 25.77 && lat < 25.90) return 'hialeah';
  if (lng > -80.28 && lng < -80.18 && lat > 25.74 && lat < 25.78) return 'miami-dda';
  return 'miami-dade-unincorporated';
}

// ── Main export: all SaveMiami entities as Nextspace array ─────────────────
export function buildNextspaceEntityList(): NextspaceEntity[] {
  const wasteFeatures = (wasteSites as GeoJSON.FeatureCollection).features;
  const entities: NextspaceEntity[] = [
    ...wasteFeatures.map(wasteFeatureToEntity),
    witToEntity(),
    fireEventToEntity(),
  ];
  return entities;
}

// ── OpenAPI-compatible envelope for REST response ──────────────────────────
export interface NextspaceFederationResponse {
  schemaVersion: string;
  platform:      'SaveMiami MiamiVerse Federation';
  district:      string | null;
  entityCount:   number;
  generatedAt:   string;
  entities:      NextspaceEntity[];
  _links: {
    self:  string;
    czml:  string;
    geojson: string;
  };
}

export function buildFederationResponse(
  entities: NextspaceEntity[],
  district: string | null,
  baseUrl: string
): NextspaceFederationResponse {
  return {
    schemaVersion: ONTOLOGY_VERSION,
    platform:      'SaveMiami MiamiVerse Federation',
    district,
    entityCount:   entities.length,
    generatedAt:   new Date().toISOString(),
    entities,
    _links: {
      self:    `${baseUrl}/api/federation${district ? `?district=${district}` : ''}`,
      czml:    `${baseUrl}/api/federation/czml`,
      geojson: `${baseUrl}/api/federation/geojson`,
    },
  };
}
