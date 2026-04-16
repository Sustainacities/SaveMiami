'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { MapLoadingScreen } from '@/components/ui/MapLoadingScreen';

// Dynamically import the map to avoid SSR issues with WebGL
const MiamiDigitalTwin = dynamic(
  () => import('@/components/map/MiamiDigitalTwin'),
  {
    ssr: false,
    loading: () => <MapLoadingScreen />,
  }
);

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-miami-night">
      <Suspense fallback={<MapLoadingScreen />}>
        <MiamiDigitalTwin />
      </Suspense>
    </main>
  );
}
