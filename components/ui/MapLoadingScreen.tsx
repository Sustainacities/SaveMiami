'use client';

import { useEffect, useState } from 'react';

const LOADING_STEPS = [
  'Initializing Miami Digital Twin...',
  'Loading waste site data (EPA · FDEP · Miami-Dade)...',
  'Connecting NVIDIA GPU simulation engine...',
  'Building Gaussian plume PFAS dispersal model...',
  'Fetching wind field data (NOAA / Open-Meteo)...',
  'Rendering deck.gl WebGL layers...',
  'MiamiVerse ready.',
];

export function MapLoadingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress]   = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => {
        const next = Math.min(i + 1, LOADING_STEPS.length - 1);
        setProgress((next / (LOADING_STEPS.length - 1)) * 100);
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-miami-night flex flex-col items-center justify-center z-50">
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,180,216,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,216,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-miami-teal/20 border border-miami-teal/40 flex items-center justify-center">
            <span className="text-3xl">🌊</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">SaveMiami</h1>
            <p className="text-miami-teal text-sm">Miami Digital Twin · Open Data Hub</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-1 bg-miami-border rounded-full overflow-hidden">
            <div
              className="h-full bg-miami-teal rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading step */}
        <p className="text-xs text-gray-500 font-mono text-center min-h-[18px] transition-all">
          {LOADING_STEPS[stepIndex]}
        </p>

        {/* Partner logos */}
        <div className="flex items-center gap-4 text-[10px]">
          <span className="px-2 py-1 rounded font-bold text-black" style={{ background: '#76B900' }}>
            NVIDIA INCEPTION
          </span>
          <span className="text-miami-teal border border-miami-teal/30 px-2 py-1 rounded">
            Water.org
          </span>
          <span className="text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded">
            305 Consortium
          </span>
        </div>

        {/* Waste focus alert */}
        <div className="w-full p-3 rounded-lg border border-waste-danger/30 bg-waste-danger/5 text-center">
          <p className="text-xs text-waste-danger font-medium">
            🔥 New: Miami-Dade Incinerator Fire Event — Nov 2023
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            PFAS · Ash Storage · NVIDIA Physics Simulation
          </p>
        </div>
      </div>
    </div>
  );
}
