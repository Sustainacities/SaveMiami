/**
 * POST /api/simulate
 * ─────────────────────────────────────────────────────────────
 * Server-side PFAS simulation endpoint.
 * Routes to NVIDIA Modulus when configured, falls back to
 * local Gaussian plume model.
 */

import { NextResponse } from 'next/server';
import { generatePlumeGrid } from '@/lib/simulation/gaussian-plume';
import { NvidiaModulusClient } from '@/lib/nvidia/modulus-client';
import type { PlumeConfig } from '@/lib/simulation/gaussian-plume';

export async function POST(request: Request) {
  try {
    const body = await request.json() as PlumeConfig & { useNvidiaModulus?: boolean };
    const { useNvidiaModulus = false, ...config } = body;

    if (useNvidiaModulus) {
      const client = new NvidiaModulusClient();
      if (client.isConfigured) {
        const req = NvidiaModulusClient.fromPlumeConfig(config, new Date());
        const result = await client.submitPfasSimulation(req);
        return NextResponse.json({ source: 'nvidia_modulus', result });
      }
    }

    // Local Gaussian plume fallback
    const samples = generatePlumeGrid({
      ...config,
      gridResolutionDeg: config.gridResolutionDeg ?? 0.008,
      maxDistanceKm:     config.maxDistanceKm ?? 40,
    });

    return NextResponse.json({
      source:   'gaussian_plume_local',
      count:    samples.length,
      samples:  samples.slice(0, 5000), // Cap response size
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service:  'SaveMiami PFAS Simulation API',
    version:  '0.2.0',
    engines:  ['gaussian_plume_local', 'nvidia_modulus'],
    docs:     'POST /api/simulate with PlumeConfig body',
  });
}
