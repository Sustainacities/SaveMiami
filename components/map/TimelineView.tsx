'use client';

/**
 * TimelineView — Graphical historical timeline overlay
 * ─────────────────────────────────────────────────────────────────────────────
 * Sits above the TimeSlider and shows a multi-metric Recharts area chart
 * spanning Miami-Dade waste history 1970–2024.
 *
 * Tracks (toggle-able):
 *   • Incinerator throughput (tons/yr)  — red area
 *   • Cumulative ash storage (tons)     — grey area
 *   • PFAS contamination (ppt)          — purple line
 *   • Medley CH₄ emitted (MMTCO2e/yr)  — amber line
 *
 * Key events shown as vertical ReferenceLine markers:
 *   incinerator commissioned (1984), dioxin violations (1995),
 *   PFAS groundwater detection (2005), fire event (Nov 2023)
 */

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ComposedChart, Legend,
} from 'recharts';
import { X, TrendingUp } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';
import { format } from 'date-fns';

// ── Historical dataset ─────────────────────────────────────────────────────
// Sources: Miami-Dade SWMD annual reports, EPA GHGRP, incinerator-history.json
const RAW_DATA = [
  { year: 1970, incTons: 0,      ashTons: 0,       pfasPpt: 0,    ch4: 0 },
  { year: 1975, incTons: 0,      ashTons: 0,       pfasPpt: 0,    ch4: 0 },
  { year: 1982, incTons: 0,      ashTons: 0,       pfasPpt: 0,    ch4: 0.005 },
  { year: 1984, incTons: 95_000, ashTons: 4_800,   pfasPpt: 0,    ch4: 0.010 },
  { year: 1986, incTons: 320_000,ashTons: 16_000,  pfasPpt: 2,    ch4: 0.018 },
  { year: 1990, incTons: 640_000,ashTons: 42_000,  pfasPpt: 8,    ch4: 0.032 },
  { year: 1995, incTons: 695_000,ashTons: 74_000,  pfasPpt: 28,   ch4: 0.048 },
  { year: 2000, incTons: 725_000,ashTons: 100_000, pfasPpt: 190,  ch4: 0.058 },
  { year: 2005, incTons: 742_000,ashTons: 120_000, pfasPpt: 520,  ch4: 0.068 },
  { year: 2010, incTons: 750_000,ashTons: 140_000, pfasPpt: 2100, ch4: 0.075 },
  { year: 2015, incTons: 758_000,ashTons: 155_000, pfasPpt: 4800, ch4: 0.0847 },
  { year: 2019, incTons: 762_000,ashTons: 165_000, pfasPpt: 6200, ch4: 0.079 },
  { year: 2021, incTons: 755_000,ashTons: 170_000, pfasPpt: 7100, ch4: 0.076 },
  { year: 2023, incTons: 758_000,ashTons: 180_000, pfasPpt: 8900, ch4: 0.0847 },
  // Fire event — spike
  { year: 2023.9, incTons: 200_000, ashTons: 188_000, pfasPpt: 11_200, ch4: 0.0847 },
  { year: 2024, incTons: 0,       ashTons: 182_000, pfasPpt: 9_200, ch4: 0.082 },
];

// ── Key events for reference lines ────────────────────────────────────────
const EVENTS = [
  { x: 1984,   label: 'Incinerator opens',   color: '#F59E0B', type: 'start' },
  { x: 1995,   label: 'Dioxin violations',   color: '#F97316', type: 'warn' },
  { x: 2005,   label: 'PFAS detected',        color: '#7C3AED', type: 'pfas' },
  { x: 2023.9, label: '🔥 FIRE',              color: '#DC2626', type: 'fire' },
];

// ── Metric definitions ────────────────────────────────────────────────────
type MetricKey = 'pfasPpt' | 'ashTons' | 'incTons' | 'ch4';
const METRICS: Array<{ key: MetricKey; label: string; color: string; unit: string }> = [
  { key: 'incTons',  label: 'Throughput (t/yr)',   color: '#DC2626', unit: 't' },
  { key: 'ashTons',  label: 'Ash stored (tons)',    color: '#6B7280', unit: 't' },
  { key: 'pfasPpt',  label: 'PFAS (ppt)',           color: '#7C3AED', unit: 'ppt' },
  { key: 'ch4',      label: 'CH₄ (MMTCO2e)',        color: '#F59E0B', unit: 'MMTCO2e' },
];

// ── Custom tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const year = Math.floor(label ?? 0);
  return (
    <div
      className="rounded-lg p-3 text-xs"
      style={{ background: 'rgba(2,6,12,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="font-bold text-white mb-1">{year}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000
            ? (p.value / 1000).toFixed(1) + 'k'
            : p.value?.toFixed?.(p.value < 1 ? 4 : 0) ?? p.value}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function TimelineView() {
  const {
    timeRange, setCurrentTime,
    showTimelineView, setShowTimelineView,
  } = useMapStore();

  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(['pfasPpt', 'ashTons'])
  );

  const currentYear = timeRange.current.getFullYear() +
    timeRange.current.getMonth() / 12;

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (!showTimelineView) return null;

  return (
    <div
      className="absolute bottom-20 left-0 right-0 mx-4 rounded-xl overflow-hidden z-20"
      style={{
        height: 180,
        background: 'rgba(4, 8, 16, 0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <TrendingUp size={12} className="text-miami-teal flex-shrink-0" />
        <span className="text-[10px] font-bold text-gray-400 tracking-wide">
          MIAMI-DADE WASTE HISTORY  1970 – 2024
        </span>

        {/* Metric toggles */}
        <div className="flex items-center gap-1.5 ml-2">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium transition-all"
              style={{
                background: activeMetrics.has(m.key) ? m.color + '22' : 'transparent',
                border: `1px solid ${activeMetrics.has(m.key) ? m.color + '66' : 'rgba(255,255,255,0.08)'}`,
                color: activeMetrics.has(m.key) ? m.color : '#4B5563',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: activeMetrics.has(m.key) ? m.color : '#374151' }}
              />
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowTimelineView(false)}
          className="ml-auto p-1 text-gray-600 hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* ── Chart ─────────────────────────────────────────────────── */}
      <div className="px-2" style={{ height: 130 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={RAW_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: '#4B5563' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => Math.floor(v).toString()}
              domain={[1970, 2024]}
              type="number"
              scale="linear"
            />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} />

            {/* Key event reference lines */}
            {EVENTS.map(ev => (
              <ReferenceLine
                key={ev.x}
                x={ev.x}
                stroke={ev.color}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                label={{
                  value: ev.label,
                  fill: ev.color,
                  fontSize: 8,
                  position: 'insideTopRight',
                }}
              />
            ))}

            {/* Current time marker */}
            <ReferenceLine
              x={currentYear}
              stroke="#00B4D8"
              strokeWidth={1.5}
              label={{
                value: `▼ ${Math.floor(currentYear)}`,
                fill: '#00B4D8',
                fontSize: 9,
                position: 'top',
              }}
            />

            {/* Data series */}
            {activeMetrics.has('incTons') && (
              <Area
                type="monotone"
                dataKey="incTons"
                name="Throughput (t/yr)"
                fill="#DC262615"
                stroke="#DC2626"
                strokeWidth={1}
                dot={false}
              />
            )}
            {activeMetrics.has('ashTons') && (
              <Area
                type="monotone"
                dataKey="ashTons"
                name="Ash stored (tons)"
                fill="#6B728018"
                stroke="#6B7280"
                strokeWidth={1}
                dot={false}
              />
            )}
            {activeMetrics.has('pfasPpt') && (
              <Line
                type="monotone"
                dataKey="pfasPpt"
                name="PFAS (ppt)"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={false}
                strokeLinecap="round"
              />
            )}
            {activeMetrics.has('ch4') && (
              <Line
                type="monotone"
                dataKey="ch4"
                name="CH₄ (MMTCO2e)"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
