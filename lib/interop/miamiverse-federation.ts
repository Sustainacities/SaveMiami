/**
 * miamiverse-federation.ts — MiamiVerse Confederated Data Model
 * ─────────────────────────────────────────────────────────────────────────────
 * Defines the confederated schema linking SaveMiami (waste/PFAS layer) to the
 * broader MiamiVerse OpenMiami initiative — a public-private-academic
 * collaborative digital twin for Miami-Dade County.
 *
 * MiamiVerse architecture:
 *  • OpenMiami public-private-academic framework (miamiverse.world)
 *  • District nodes federate via shared GeoJSON-LD + REST APIs
 *  • Each district (Miami DDA, Doral, Medley, etc.) publishes a
 *    "district manifest" describing its data layers and endpoints
 *  • Nextspace Navigator serves as the 3D GIS viewer
 *    (nav.nextspace.host — CesiumJS + Ontology engine)
 *  • NVIDIA Omniverse for physics-accurate 3D simulation
 *
 * Interoperability standards used:
 *  - GeoJSON (RFC 7946) — base geometry format
 *  - JSON-LD 1.1 — semantic linked data context (schema.org + custom vocab)
 *  - DTDL (Digital Twin Definition Language) — Azure DT compatible
 *  - OGC API Features — open geospatial REST standard
 *  - STAC (SpatioTemporal Asset Catalog) — satellite + raster data
 *  - CesiumJS CZML — time-animated 3D visualization
 *  - OGC SensorThings API — IoT + live monitoring data
 *
 * Sources:
 *  - https://www.miamiverse.world
 *  - https://www.miamiverse.info
 *  - https://gdsc.idsc.miami.edu (University of Miami GDSC)
 *  - https://gis-mdc.opendata.arcgis.com (Miami-Dade Open GIS)
 *  - https://www.nextspace.com/tags/federated-digital-twins
 */

// ── JSON-LD Context for SaveMiami ─────────────────────────────────────────
export const SAVEMIAMI_JSONLD_CONTEXT = {
  '@context': {
    '@vocab':      'https://openmiami.org/schema/savemiami#',
    'geo':         'http://www.w3.org/2003/01/geo/wgs84_pos#',
    'schema':      'https://schema.org/',
    'xsd':         'http://www.w3.org/2001/XMLSchema#',
    'geojson':     'https://purl.org/geojson/vocab#',
    'dcterms':     'http://purl.org/dc/terms/',
    'prov':        'http://www.w3.org/ns/prov#',
    // Domain terms
    'WasteFacility':   '@vocab:WasteFacility',
    'PFAS':            '@vocab:PFAS',
    'MethaneEmission': '@vocab:MethaneEmission',
    'District':        '@vocab:District',
    'FireEvent':       '@vocab:FireEvent',
    // Property aliases
    'name':       'schema:name',
    'lat':        'geo:lat',
    'lng':        'geo:long',
    'timestamp':  'dcterms:date',
    'source':     'dcterms:source',
    'districtId': '@vocab:districtId',
  },
};

// ── MiamiVerse District Manifest ──────────────────────────────────────────
export interface DistrictManifest {
  districtId:   string;
  name:         string;
  version:      string;
  bbox:         [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  epsg:         string;
  publisher:    string;
  description:  string;
  endpoints:    DistrictEndpoints;
  layers:       DistrictLayer[];
  interop:      InteropCapabilities;
}

interface DistrictEndpoints {
  features:   string;  // OGC API Features
  entities:   string;  // Nextspace Entity REST
  czml:       string;  // CesiumJS time animation
  stac:       string;  // Satellite data catalog
  metrics:    string;  // Time-series metrics
}

interface DistrictLayer {
  id:       string;
  name:     string;
  type:     'vector' | 'raster' | 'point-cloud' | 'simulation';
  format:   'geojson' | 'mvt' | 'czml' | '3dtiles' | 'cog';
  refresh:  number; // seconds
  public:   boolean;
}

interface InteropCapabilities {
  nextspace:    boolean;
  omniverse:    boolean;
  cesiumIon:    boolean;
  arcgis:       boolean;
  jsonld:       boolean;
  dtdl:         boolean;
  ogcFeatures:  boolean;
  stac:         boolean;
}

// ── SaveMiami District Manifest (Waste Layer) ─────────────────────────────
export const SAVEMIAMI_DISTRICT_MANIFEST: DistrictManifest = {
  districtId:  'MVERSE-WASTE-001',
  name:        'SaveMiami — Waste & Environmental Layer',
  version:     '1.0.0',
  bbox:        [-80.60, 25.50, -80.10, 26.00],
  epsg:        'EPSG:4326',
  publisher:   'SaveMiami · 305 Consortium · Open Miami',
  description: 'PFAS contamination, waste facilities, Gaussian plume simulation, ' +
               'GIS sampling protocol, WIT landfill CH₄, and Zero Waste scenarios ' +
               'for Miami-Dade County. Primary focus: Covanta/MD-INC-001 incinerator ' +
               'fire (Feb 2023) and Medley Landfill compound EJ burden.',
  endpoints: {
    features: '/api/federation/geojson',
    entities: '/api/federation',
    czml:     '/api/federation/czml',
    stac:     '/api/federation/stac',
    metrics:  '/api/federation/metrics',
  },
  layers: [
    { id: 'pfas-plume',      name: 'PFAS Atmospheric Plume',     type: 'simulation', format: 'czml',    refresh: 300,   public: true },
    { id: 'waste-sites',     name: 'Waste Facilities',           type: 'vector',     format: 'geojson', refresh: 86400, public: true },
    { id: 'ash-storage',     name: 'Ash Storage Cells',          type: 'vector',     format: 'geojson', refresh: 86400, public: true },
    { id: 'wit-ch4',         name: 'WIT Landfill CH₄ Emissions', type: 'raster',     format: 'czml',    refresh: 3600,  public: true },
    { id: 'sampling-points', name: 'GIS Sampling Protocol',      type: 'point-cloud',format: 'geojson', refresh: 0,     public: true },
    { id: 'zero-waste-hubs', name: '305 Consortium Zero Waste',  type: 'vector',     format: 'geojson', refresh: 86400, public: true },
    { id: 'ej-rings',        name: 'EJScreen Rings (3mi/1mi)',   type: 'vector',     format: 'geojson', refresh: 86400, public: true },
  ],
  interop: {
    nextspace:   true,
    omniverse:   true,
    cesiumIon:   true,
    arcgis:      true,
    jsonld:      true,
    dtdl:        true,
    ogcFeatures: true,
    stac:        true,
  },
};

// ── DTDL Model (Azure Digital Twin compatible) ────────────────────────────
export const WASTE_FACILITY_DTDL = {
  '@context': 'dtmi:dtdl:context;3',
  '@id':      'dtmi:savemiami:WasteFacility;1',
  '@type':    'Interface',
  displayName: 'Waste Facility',
  description: 'Municipal solid waste incinerator or landfill in Miami-Dade County',
  contents: [
    { '@type': 'Property', name: 'facilityId',     schema: 'string' },
    { '@type': 'Property', name: 'facilityType',   schema: { '@type': 'Enum', valueSchema: 'string', enumValues: [
        { name: 'incinerator',    displayName: 'Incinerator',    enumValue: 'incinerator' },
        { name: 'landfill',       displayName: 'Landfill',       enumValue: 'landfill' },
        { name: 'transfer',       displayName: 'Transfer Station',enumValue: 'transfer' },
        { name: 'composting',     displayName: 'Composting',     enumValue: 'composting' },
    ]}},
    { '@type': 'Property', name: 'lat',               schema: 'double' },
    { '@type': 'Property', name: 'lng',               schema: 'double' },
    { '@type': 'Property', name: 'pfasRiskLevel',     schema: { '@type': 'Enum', valueSchema: 'string', enumValues: [
        { name: 'critical',   enumValue: 'critical' },
        { name: 'high',       enumValue: 'high' },
        { name: 'moderate',   enumValue: 'moderate' },
        { name: 'low',        enumValue: 'low' },
    ]}},
    { '@type': 'Property', name: 'capacityTPD',       schema: 'integer' },
    { '@type': 'Property', name: 'operatorName',      schema: 'string' },
    { '@type': 'Telemetry', name: 'windSpeedMs',      schema: 'double' },
    { '@type': 'Telemetry', name: 'windBearingDeg',   schema: 'double' },
    { '@type': 'Telemetry', name: 'pfasConcentration',schema: 'double',
      '@comment': 'µg/m³ — modelled Gaussian plume at this location' },
    { '@type': 'Relationship', name: 'impactsDistrict',
      target: 'dtmi:savemiami:District;1' },
    { '@type': 'Relationship', name: 'generatesPlume',
      target: 'dtmi:savemiami:PFASPlume;1' },
  ],
};

// ── OGC API Features Collection Metadata ─────────────────────────────────
export function buildOGCCollectionMeta(baseUrl: string) {
  return {
    id:          'savemiami-waste-layer',
    title:       'SaveMiami Waste & PFAS Layer',
    description: 'Miami-Dade waste facilities, PFAS contamination plume, and environmental justice data',
    links: [
      { href: `${baseUrl}/api/federation/geojson`, rel: 'items',       type: 'application/geo+json' },
      { href: `${baseUrl}/api/federation`,         rel: 'describedby', type: 'application/json' },
      { href: `${baseUrl}/api/federation/czml`,    rel: 'alternate',   type: 'application/czml+json' },
    ],
    extent: {
      spatial: { bbox: [[-80.60, 25.50, -80.10, 26.00]], crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84' },
      temporal: { interval: [['1982-01-01T00:00:00Z', null]] },
    },
    itemType: 'feature',
    crs: ['http://www.opengis.net/def/crs/OGC/1.3/CRS84'],
  };
}

// ── STAC Collection for satellite data ────────────────────────────────────
export function buildSTACCollection(baseUrl: string) {
  return {
    type:        'Collection',
    id:          'savemiami-environmental',
    stac_version:'1.0.0',
    description: 'TROPOMI CH₄, Carbon Mapper PFAS proxies, PFAS plume time series for Miami-Dade',
    links: [{ href: `${baseUrl}/api/federation/stac`, rel: 'self', type: 'application/json' }],
    title:       'SaveMiami Environmental Data',
    extent: {
      spatial:  { bbox: [[-80.60, 25.50, -80.10, 26.00]] },
      temporal: { interval: [['2015-01-01T00:00:00Z', null]] },
    },
    license:    'CC-BY-4.0',
    providers: [
      { name: 'EPA GHGRP',         roles: ['producer'], url: 'https://ghgdata.epa.gov' },
      { name: 'Carbon Mapper',     roles: ['producer'], url: 'https://carbonmapper.org' },
      { name: 'Copernicus/TROPOMI',roles: ['producer'], url: 'https://sentinels.copernicus.eu' },
      { name: 'SaveMiami',         roles: ['host'],     url: baseUrl },
    ],
    summaries: {
      'eo:bands': [
        { name: 'XCH4_ppb',       description: 'Methane column (TROPOMI)' },
        { name: 'PFAS_ppt',       description: 'PFAS soil concentration (modelled)' },
        { name: 'PM25_ugm3',      description: 'PM2.5 (incinerator fire period)' },
      ],
    },
  };
}
