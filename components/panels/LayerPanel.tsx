'use client';

/**
 * LayerPanel — Left sidebar with all layer toggles
 * The WASTE button is the primary feature entry point.
 */

import { useState } from 'react';
import {
  Flame, Trash2, Wind, Leaf, Recycle, Droplets,
  AlertTriangle, ChevronLeft, ChevronRight, Map, Layers,
  Zap, FlaskConical, BarChart2,
} from 'lucide-react';
import { useMapStore, type LayerId } from '@/store/mapStore';

interface LayerGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  isPrimary?: boolean;
  layers: Array<{
    id: LayerId;
    label: string;
    icon: React.ReactNode;
    color: string;
  }>;
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    id:        'waste',
    label:     'WASTE',
    icon:      <Flame size={16} />,
    isPrimary: true,
    layers: [
      { id: 'incinerator', label: 'Incinerator',  icon: <Flame size={12} />,        color: '#DC2626' },
      { id: 'landfills',   label: 'Landfills',    icon: <Trash2 size={12} />,       color: '#F59E0B' },
      { id: 'ash_storage', label: 'Ash Storage',  icon: <AlertTriangle size={12} />,color: '#6B7280' },
      { id: 'pfas_plume',  label: 'PFAS Plume',   icon: <Zap size={12} />,          color: '#7C3AED' },
      { id: 'wind_field',  label: 'Wind Field',   icon: <Wind size={12} />,         color: '#00B4D8' },
      { id: 'epa_superfund', label:'EPA Sites',   icon: <AlertTriangle size={12} />,color: '#F59E0B' },
    ],
  },
  {
    id:    'zero_waste',
    label: 'ZERO WASTE',
    icon:  <Recycle size={16} />,
    layers: [
      { id: 'zero_waste',  label: '305 Hubs',     icon: <Recycle size={12} />,    color: '#10B981' },
      { id: 'recycling',   label: 'Recycling',    icon: <Recycle size={12} />,    color: '#00B4D8' },
      { id: 'composting',  label: 'Composting',   icon: <Leaf size={12} />,       color: '#2D6A4F' },
    ],
  },
  {
    id:    'environment',
    label: 'ENVIRONMENT',
    icon:  <Droplets size={16} />,
    layers: [
      { id: 'water',       label: 'Water Quality',icon: <Droplets size={12} />,   color: '#0EA5E9' },
      { id: 'flood_risk',  label: 'Flood Risk',   icon: <Droplets size={12} />,   color: '#06B6D4' },
      { id: 'canopy',      label: 'Tree Canopy',  icon: <Leaf size={12} />,       color: '#16A34A' },
      { id: 'heat_islands',label: 'Heat Islands', icon: <Flame size={12} />,      color: '#F97316' },
    ],
  },
];

export function LayerPanel() {
  const {
    activeLayers,
    toggleLayer,
    wastePanelOpen,
    setWastePanelOpen,
    nvidiaPanelOpen,
    setNvidiaPanelOpen,
    samplingPanelOpen,
    setSamplingPanelOpen,
    showSamplingLayer,
    setShowSamplingLayer,
    incineratorFocusMode,
    setIncineratorFocusMode,
    witPanelOpen,
    setWITPanelOpen,
    showWITLayer,
    setShowWITLayer,
  } = useMapStore();

  const [collapsed, setCollapsed]         = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('waste');

  return (
    <div
      className={`absolute left-3 top-20 flex flex-col gap-2 z-20 transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-52'
      }`}
    >
      {/* ── Collapse toggle ─────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="self-end p-1.5 rounded-lg glass-panel text-gray-400 hover:text-white transition-colors"
        title={collapsed ? 'Expand layers' : 'Collapse'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* ── Layer groups ────────────────────────────────────── */}
      {LAYER_GROUPS.map((group) => (
        <div key={group.id} className="glass-panel overflow-hidden">
          {/* Group header */}
          <button
            onClick={() => {
              setExpandedGroup(expandedGroup === group.id ? null : group.id);
              if (group.id === 'waste') {
                setWastePanelOpen(!wastePanelOpen);
              }
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold tracking-wider transition-colors ${
              group.isPrimary
                ? 'text-waste-danger hover:bg-waste-danger/10'
                : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <span className={group.isPrimary ? 'text-waste-danger' : 'text-gray-400'}>
              {group.icon}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{group.label}</span>
                {group.isPrimary && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-waste-danger/20 text-waste-danger border border-waste-danger/30">
                    NEW
                  </span>
                )}
              </>
            )}
          </button>

          {/* Layer toggles */}
          {!collapsed && expandedGroup === group.id && (
            <div className="border-t border-miami-border divide-y divide-miami-border/50">
              {group.layers.map((layer) => {
                const isActive = activeLayers.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'text-white bg-white/5'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isActive ? layer.color : '#374151' }}
                    />
                    <span style={{ color: isActive ? layer.color : undefined }}>
                      {layer.icon}
                    </span>
                    <span className="flex-1 text-left">{layer.label}</span>
                    <span
                      className={`w-7 h-4 rounded-full transition-colors flex-shrink-0 ${
                        isActive ? '' : 'bg-gray-700'
                      }`}
                      style={{ background: isActive ? layer.color + '40' : undefined,
                               border: `1px solid ${isActive ? layer.color : '#374151'}` }}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full transition-transform m-0.5 ${
                          isActive ? 'translate-x-3' : 'translate-x-0'
                        }`}
                        style={{ background: isActive ? layer.color : '#6B7280' }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* ── Quick actions ────────────────────────────────────── */}
      {!collapsed && (
        <div className="glass-panel p-2 flex flex-col gap-1.5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider px-1">Quick Actions</p>

          <button
            onClick={() => setIncineratorFocusMode(!incineratorFocusMode)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              incineratorFocusMode
                ? 'bg-waste-danger/20 text-waste-danger border border-waste-danger/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame size={12} />
            Focus: Incinerator
          </button>

          <button
            onClick={() => setNvidiaPanelOpen(!nvidiaPanelOpen)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              nvidiaPanelOpen
                ? 'text-[#76B900] bg-[#76B900]/10 border border-[#76B900]/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Zap size={12} />
            NVIDIA Simulation
          </button>

          <button
            onClick={() => {
              setSamplingPanelOpen(!samplingPanelOpen);
              if (!samplingPanelOpen) setShowSamplingLayer(true);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              samplingPanelOpen
                ? 'text-[#A170F1] bg-[#7C3AED]/10 border border-[#7C3AED]/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FlaskConical size={12} />
            GIS Sampling
            {showSamplingLayer && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse-slow" />
            )}
          </button>

          <button
            onClick={() => {
              setWITPanelOpen(!witPanelOpen);
              if (!showWITLayer) setShowWITLayer(true);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              witPanelOpen
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 size={12} />
            WIT Landfill #521
            {showWITLayer && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => {
              useMapStore.getState().setViewState({
                longitude: -80.2, latitude: 25.775,
                zoom: 10.5, pitch: 30, bearing: 0,
                transitionDuration: 1000,
              });
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Map size={12} />
            Reset View
          </button>
        </div>
      )}

      {/* ── Layer count badge ────────────────────────────────── */}
      {!collapsed && (
        <div className="text-center">
          <span className="text-[10px] text-gray-600">
            <Layers size={10} className="inline mr-1" />
            {activeLayers.size} active layers
          </span>
        </div>
      )}
    </div>
  );
}
