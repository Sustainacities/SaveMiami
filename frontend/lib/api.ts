const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const WS_BASE  = process.env.NEXT_PUBLIC_WS_URL  ?? 'ws://localhost:8000';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health:              () => apiFetch<{ status: string; db: string }>('/health'),
  vessels:             () => apiFetch<unknown[]>('/api/v1/vessels'),
  vessel:              (mmsi: string) => apiFetch<unknown>(`/api/v1/vessels/${mmsi}`),
  waterStations:       () => apiFetch<unknown[]>('/api/v1/water-quality/stations'),
  waterSamples:        (params?: { station_id?: string; hours?: number }) => {
    const qs = new URLSearchParams();
    if (params?.station_id) qs.set('station_id', params.station_id);
    if (params?.hours)      qs.set('hours', String(params.hours));
    const query = qs.toString() ? `?${qs}` : '';
    return apiFetch<unknown[]>(`/api/v1/water-quality/samples${query}`);
  },
  telemetryWs: () => new WebSocket(`${WS_BASE}/ws/telemetry`),
};
