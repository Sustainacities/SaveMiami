'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  'Initializing AquaDome Digital Twin...',
  'Connecting to Biscayne Bay data feeds...',
  'Loading USGS / NOAA water quality streams...',
  'Fetching AIS vessel positions...',
  'Rendering deck.gl WebGL layers...',
  'AquaDome ready.',
];

export function MapLoadingScreen() {
  const [step, setStep]     = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((i) => {
        const next = Math.min(i + 1, STEPS.length - 1);
        setProgress((next / (STEPS.length - 1)) * 100);
        return next;
      });
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 bg-miami-night flex flex-col items-center justify-center z-50">
      {/* Grid background */}
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

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-miami-teal/20 border border-miami-teal/40 flex items-center justify-center">
            <span className="text-3xl">🌊</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">AquaDome</h1>
            <p className="text-miami-teal text-sm">Biscayne Bay Digital Twin · Open Data Hub</p>
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

        <p className="text-xs text-gray-500 font-mono text-center min-h-[18px]">
          {STEPS[step]}
        </p>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-miami-teal border border-miami-teal/30 px-2 py-1 rounded">
            SaveMiami
          </span>
          <span className="text-gray-400 border border-gray-700 px-2 py-1 rounded">
            OpenClimateFL
          </span>
        </div>
      </div>
    </div>
  );
}
