import { useCallback, useEffect } from 'react';
import { api } from './api';
import { useMapStore, type VesselRecord, type WaterQualitySample } from '@/store/mapStore';

const REFRESH_INTERVAL_MS = 30_000; // 30 s

export function useDataRefresh() {
  const { setVessels, setWaterSamples, setLoading, setLastRefresh } = useMapStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [vessels, samples] = await Promise.all([
        api.vessels(),
        api.waterSamples({ hours: 6 }),
      ]);
      setVessels(vessels as VesselRecord[]);
      setWaterSamples(samples as WaterQualitySample[]);
      setLastRefresh(new Date());
    } catch {
      // graceful — data may be unavailable during local dev
    } finally {
      setLoading(false);
    }
  }, [setVessels, setWaterSamples, setLoading, setLastRefresh]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);
}
