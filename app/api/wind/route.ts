/**
 * GET /api/wind?lat=25.8&lng=-80.35&start=2023-11-15&end=2023-11-19
 * Proxies Open-Meteo wind data for the incinerator area
 */

import { NextResponse } from 'next/server';
import { fetchWindData, fetchCurrentWind } from '@/lib/connectors';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat   = parseFloat(searchParams.get('lat')   ?? '25.8012');
  const lng   = parseFloat(searchParams.get('lng')   ?? '-80.3534');
  const start = searchParams.get('start') ?? '2023-11-15';
  const end   = searchParams.get('end')   ?? '2023-11-19';
  const live  = searchParams.get('live')  === 'true';

  try {
    if (live) {
      const current = await fetchCurrentWind(lat, lng);
      return NextResponse.json({ live: true, ...current });
    }

    const data = await fetchWindData(lat, lng, start, end);
    return NextResponse.json({ count: data.length, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
