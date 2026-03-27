/**
 * /api/federation — MiamiVerse Federation REST Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * OGC API Features + Nextspace Entity + MiamiVerse confederated data
 * for the SaveMiami waste/PFAS layer.
 *
 * Routes:
 *  GET /api/federation               → Nextspace entity list (JSON)
 *  GET /api/federation?district=X    → Filter by MiamiVerse district
 *  GET /api/federation?format=geojson→ OGC API Features FeatureCollection
 *  GET /api/federation?format=dtdl   → DTDL model definitions
 *  GET /api/federation?format=stac   → STAC collection metadata
 *  GET /api/federation?format=manifest → District manifest
 *
 * CORS: open — designed for cross-district Nextspace Navigator queries
 * Cache: 5 minutes (ISR revalidate: 300)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  buildNextspaceEntityList,
  buildFederationResponse,
  MIAMIVERSE_DISTRICTS,
} from '@/lib/interop/nextspace-adapter';
import {
  SAVEMIAMI_JSONLD_CONTEXT,
  SAVEMIAMI_DISTRICT_MANIFEST,
  WASTE_FACILITY_DTDL,
  buildOGCCollectionMeta,
  buildSTACCollection,
} from '@/lib/interop/miamiverse-federation';
import wasteSites from '@/data/waste-sites.geojson';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Nextspace-Client, X-MiamiVerse-District',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const format   = searchParams.get('format')   ?? 'entities';
  const district = searchParams.get('district') ?? null;
  const baseUrl  = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // ── 1. District manifest ──────────────────────────────────────────────
  if (format === 'manifest') {
    return NextResponse.json(
      {
        ...SAVEMIAMI_DISTRICT_MANIFEST,
        endpoints: Object.fromEntries(
          Object.entries(SAVEMIAMI_DISTRICT_MANIFEST.endpoints).map(
            ([k, v]) => [k, `${baseUrl}${v}`]
          )
        ),
      },
      { headers: { ...CORS, 'Cache-Control': 's-maxage=3600' } }
    );
  }

  // ── 2. DTDL model definitions ─────────────────────────────────────────
  if (format === 'dtdl') {
    return NextResponse.json(
      { models: [WASTE_FACILITY_DTDL] },
      { headers: { ...CORS, 'Cache-Control': 's-maxage=86400' } }
    );
  }

  // ── 3. STAC collection ────────────────────────────────────────────────
  if (format === 'stac') {
    return NextResponse.json(
      buildSTACCollection(baseUrl),
      { headers: { ...CORS, 'Cache-Control': 's-maxage=3600' } }
    );
  }

  // ── 4. OGC GeoJSON FeatureCollection ─────────────────────────────────
  if (format === 'geojson') {
    const collection = wasteSites as GeoJSON.FeatureCollection;
    const filtered = district
      ? { ...collection, features: collection.features.filter(f =>
          (f.properties?.district ?? '').toLowerCase() === district.toLowerCase()
        )}
      : collection;

    return NextResponse.json(
      {
        ...filtered,
        '@context': SAVEMIAMI_JSONLD_CONTEXT['@context'],
        links: [
          { href: `${baseUrl}/api/federation?format=geojson`, rel: 'self', type: 'application/geo+json' },
          { href: `${baseUrl}/api/federation/czml`,           rel: 'alternate', type: 'application/czml+json' },
        ],
      },
      { headers: { ...CORS, 'Cache-Control': 's-maxage=300' } }
    );
  }

  // ── 5. OGC collection metadata ────────────────────────────────────────
  if (format === 'ogc-meta') {
    return NextResponse.json(
      buildOGCCollectionMeta(baseUrl),
      { headers: { ...CORS, 'Cache-Control': 's-maxage=3600' } }
    );
  }

  // ── 6. Default: Nextspace entity list ────────────────────────────────
  let entities = buildNextspaceEntityList();

  if (district) {
    const districtKey = district.toLowerCase();
    entities = entities.filter(e =>
      e.metadata.district === districtKey ||
      e.relationships.some(r => r.targetId === MIAMIVERSE_DISTRICTS[districtKey]?.id)
    );
  }

  const response = buildFederationResponse(entities, district, baseUrl);

  return NextResponse.json(
    {
      '@context': SAVEMIAMI_JSONLD_CONTEXT['@context'],
      ...response,
    },
    {
      headers: {
        ...CORS,
        'Cache-Control':     's-maxage=300, stale-while-revalidate=60',
        'X-MiamiVerse-Node': 'savemiami-waste-layer',
        'X-Ontology-Version': '1.0.0-savemiami',
      },
    }
  );
}
