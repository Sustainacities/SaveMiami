'use client';

import { useState } from 'react';
import { Waves, Menu, X, ExternalLink, FlaskConical, Trash2 } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

export function TopBar() {
  const {
    simulationMode, setSimulationMode,
    wastePanelOpen, setWastePanelOpen,
    samplingPanelOpen, setSamplingPanelOpen,
    showSamplingLayer, setShowSamplingLayer,
    witPanelOpen, setWITPanelOpen,
    showWITLayer, setShowWITLayer,
  } = useMapStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 bg-gradient-to-b from-miami-night/95 to-transparent">
      {/* ── Logo ────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-miami-teal/20 border border-miami-teal/40 flex items-center justify-center">
          <Waves size={16} className="text-miami-teal" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">SaveMiami</p>
          <p className="text-[10px] text-gray-500 leading-none">Miami Digital Twin · Open Data Hub</p>
        </div>

        {/* Mode pills */}
        <div className="ml-3 flex items-center gap-1 hidden sm:flex">
          {(['historical', 'live', 'scenario'] as const).map((mode) => (
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

      {/* ── Right side ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* WASTE button — primary CTA */}
        <button
          onClick={() => setWastePanelOpen(!wastePanelOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            wastePanelOpen
              ? 'bg-waste-danger/20 text-waste-danger border-waste-danger/60'
              : 'bg-waste-danger text-white border-waste-danger hover:bg-waste-danger/90'
          }`}
        >
          🗑️ WASTE
        </button>

        {/* WIT / EDF Landfill 521 button */}
        <button
          onClick={() => {
            setWITPanelOpen(!witPanelOpen);
            if (!showWITLayer) setShowWITLayer(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            witPanelOpen
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/60'
              : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
          }`}
          title="Waste Impact Tracker — EDF · FL Landfill #521 (Medley)"
        >
          <Trash2 size={12} />
          WIT
          {showWITLayer && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow" />
          )}
        </button>

        {/* GIS SAMPLING button */}
        <button
          onClick={() => {
            setSamplingPanelOpen(!samplingPanelOpen);
            if (!samplingPanelOpen) setShowSamplingLayer(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            samplingPanelOpen
              ? 'bg-[#7C3AED]/20 text-[#A170F1] border-[#7C3AED]/60'
              : 'border-[#7C3AED]/60 text-[#A170F1] hover:bg-[#7C3AED]/10'
          }`}
          title="GIS Sampling Protocol — Dr. Phil's 9-point composite method"
        >
          <FlaskConical size={12} />
          GIS SAMPLE
          {showSamplingLayer && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse-slow" />
          )}
        </button>

        {/* Partner badges */}
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-[10px] px-2 py-1 rounded font-bold text-black" style={{ background: '#76B900' }}>
            NVIDIA
          </span>
          <span className="text-[10px] px-2 py-1 rounded font-medium text-miami-teal border border-miami-teal/30">
            Water.org
          </span>
          <span className="text-[10px] px-2 py-1 rounded font-medium text-yellow-400 border border-yellow-400/30">
            305 Consortium
          </span>
        </div>

        {/* External link */}
        <a
          href="https://sustainacities.org"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-500 hover:text-white transition-colors"
          title="Sustainacities"
        >
          <ExternalLink size={14} />
        </a>

        {/* Mobile menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 text-gray-500 hover:text-white transition-colors md:hidden"
        >
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
    </div>
  );
}
