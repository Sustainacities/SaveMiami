'use client';

import dynamic from 'next/dynamic';

const SamplingPlanMap = dynamic(
  () => import('@/components/map/SamplingPlanMap'),
  { ssr: false, loading: () => (
    <div className="w-screen h-screen bg-miami-night flex items-center justify-center">
      <div className="text-miami-teal text-sm animate-pulse">Loading sampling plan map…</div>
    </div>
  )}
);

export default function SamplingPlanPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-miami-night">
      <SamplingPlanMap />
    </main>
  );
}
