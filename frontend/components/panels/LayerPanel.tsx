'use client';

import { useState } from 'react';
import {
  Anchor, ChevronLeft, ChevronRight, Droplets,
  Flame, Layers, Leaf, Map,
} from 'lucide-react';
import { useMapStore, type LayerId } from '@/store/mapStore';

interface LayerDef {
  id: LayerId;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface LayerGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  layers: LayerDef[];
}

const GROUPS: LayerGroup[] = [
  {
    id:    'marine',
    label: 'MARINE',
    icon:  <Anchor size={16} />,
    layers: [
      { id: 'vessels',       label: 'AIS Vessels',    icon: <Anchor size={12} />,   color: '#00B4D8' },
      { id: 'coral_reefs',   label: 'Coral Reefs',    icon: <Droplets size={12} />, color: '#F97316' },
      { id: 'seagrass',      label: 'Seagrass Beds',  icon: <Leaf size={12} />,     color: '#16A34A' },
    ],
  },
  {
    id:    'water',
    label: 'WATER QUALITY',
    icon:  <Droplets size={16} />,
    layers: [
      { id: 'water_quality', label: 'Sensor Stations',icon: <Droplets size={12} />, color: '#0EA5E9' },
    ],
  },
  {
    id:    'climate',
    label: 'CLIMATE',
    icon:  <Flame size={16} />,
    layers: [
      { id: 'flood_risk',   label: 'Flood Risk',    icon: <Droplets size={12} />, color: '#06B6D4' },
      { id: 'canopy',       label: 'Tree Canopy',   icon: <Leaf size={12} />,     color: '#16A34A' },
      { id: 'heat_islands', label: 'Heat Islands',  icon: <Flame size={12} />,    color: '#F97316' },
    ],
  },
];

export function LayerPanel() {
  const { activeLayers, toggleLayer, setViewState } = useMapStore();
  const [collapsed, setCollapsed]           = useState(false);
  const [expandedGroup, setExpandedGroup]   = useState<string | null>('marine');

  return (
    <div
      className={`absolute left-3 top-20 flex flex-col gap-2 z-20 transition-all duration-300 ${
        collapsed ? 'w-12' : 'w-52'
      }`}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="self-end p-1.5 rounded-lg glass-panel text-gray-400 hover:text-white transition-colors"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Layer groups */}
      {GROUPS.map((group) => (
        <div key={group.id} className="glass-panel overflow-hidden">
          <button
            onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold
                       tracking-wider text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span className="text-gray-400">{group.icon}</span>
            {!collapsed && <span className="flex-1 text-left">{group.label}</span>}
          </button>

          {!collapsed && expandedGroup === group.id && (
            <div className="border-t border-miami-border divide-y divide-miami-border/50">
              {group.layers.map((layer) => {
                const active = activeLayers.has(layer.id);
                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      active ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: active ? layer.color : '#374151' }}
                    />
                    <span style={{ color: active ? layer.color : undefined }}>{layer.icon}</span>
                    <span className="flex-1 text-left">{layer.label}</span>
                    {/* Toggle */}
                    <span
                      className="w-7 h-4 rounded-full flex-shrink-0 flex items-center"
                      style={{
                        background: active ? layer.color + '40' : undefined,
                        border: `1px solid ${active ? layer.color : '#374151'}`,
                      }}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full transition-transform m-0.5 ${
                          active ? 'translate-x-3' : 'translate-x-0'
                        }`}
                        style={{ background: active ? layer.color : '#6B7280' }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Quick actions */}
      {!collapsed && (
        <div className="glass-panel p-2 flex flex-col gap-1.5">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider px-1">Quick Actions</p>
          <button
            onClick={() =>
              setViewState({
                longitude: -80.19, latitude: 25.66,
                zoom: 10, pitch: 30, bearing: 0,
                transitionDuration: 1000,
              })
            }
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium
                       text-gray-400 hover:text-white hover:bg-white/5 transition-colors
                       flex items-center gap-2"
          >
            <Map size={12} />
            Reset View
          </button>
        </div>
      )}

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
