'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { MapLoadingScreen } from '@/components/ui/MapLoadingScreen';

const BiscayneTwin = dynamic(
  () => import('@/components/map/BiscayneTwin'),
  { ssr: false, loading: () => <MapLoadingScreen /> }
);

export default function HomePage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-miami-night">
      <Suspense fallback={<MapLoadingScreen />}>
        <BiscayneTwin />
      </Suspense>
    </main>
  );
}
