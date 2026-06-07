'use client';

import { RefreshCw, Waves } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

export function TopBar() {
  const {
    simulationMode,
    setSimulationMode,
    loading,
    lastRefresh,
    vessels,
    activeLayers,
  } = useMapStore();

  return (
    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30
                    bg-gradient-to-b from-miami-night/95 to-transparent pointer-events-none">

      {/* Logo */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        <div className="w-8 h-8 rounded-lg bg-miami-teal/20 border border-miami-teal/40
                        flex items-center justify-center">
          <Waves size={16} className="text-miami-teal" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">AquaDome</p>
          <p className="text-[10px] text-gray-500 leading-none">
            Biscayne Bay Digital Twin · SaveMiami
          </p>
        </div>

        {/* Mode pills */}
        <div className="ml-3 hidden sm:flex items-center gap-1">
          {(['live', 'historical'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSimulationMode(mode)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-colors ${
                simulationMode === mode
                  ? 'bg-miami-teal text-miami-night'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Right side status */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Live indicator */}
        {simulationMode === 'live' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="hidden sm:inline">
              {vessels.length} vessels · {activeLayers.size} layers
            </span>
          </div>
        )}

        {/* Last refresh */}
        {lastRefresh && (
          <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-600">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            {lastRefresh.toLocaleTimeString()}
          </div>
        )}

        {/* Partner badge */}
        <span className="text-[10px] px-2 py-1 rounded font-medium text-miami-teal
                         border border-miami-teal/30 hidden md:block">
          OpenClimateFL
        </span>
      </div>
    </div>
  );
}
