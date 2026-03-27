'use client';

/**
 * SimConsole — Real-time simulation CLI
 * ─────────────────────────────────────────────────────────────────────────────
 * Terminal-style panel showing live simulation logic, data source reads,
 * and calculation steps as they compute.
 *
 * Log levels:
 *   [SIM]  — simulation engine lifecycle
 *   [DATA] — external data source reads (GHGRP, TROPOMI, ECHO, Meteo)
 *   [CALC] — Gaussian plume / dispersion math
 *   [PFAS] — PFAS concentration results
 *   [WARN] — threshold exceedances / violations
 *   [WIT]  — Waste Impact Tracker layer events
 *   [PART] — particle physics system stats
 *   [ERR]  — errors / API failures
 */

import { useEffect, useRef, useState } from 'react';
import { Terminal, X, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { useMapStore, type LogLevel, type LogEntry } from '@/store/mapStore';

// ── Colour mapping ────────────────────────────────────────────────────────
const LEVEL_COLOR: Record<LogLevel, string> = {
  SIM:  '#76B900',   // NVIDIA green
  DATA: '#00B4D8',   // Miami teal
  CALC: '#A78BFA',   // purple
  PFAS: '#F59E0B',   // amber
  WARN: '#F97316',   // orange
  WIT:  '#FCD34D',   // yellow
  PART: '#34D399',   // emerald
  ERR:  '#EF4444',   // red
};

const ALL_LEVELS: (LogLevel | 'ALL')[] = ['ALL', 'SIM', 'DATA', 'CALC', 'PFAS', 'WARN', 'WIT', 'PART'];

function ts(t: number) {
  return new Date(t).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function SimConsole() {
  const {
    simConsoleOpen, setSimConsoleOpen,
    simLogs, clearSimLogs,
    particleLayerActive, nvidiaSimConfig,
  } = useMapStore();

  const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [pinned, setPinned] = useState(true);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  const filtered = filter === 'ALL'
    ? simLogs
    : simLogs.filter(e => e.level === filter);

  // Auto-scroll when pinned
  useEffect(() => {
    if (pinned && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simLogs.length, pinned]);

  if (!simConsoleOpen) return null;

  return (
    <div
      className="absolute bottom-24 left-4 w-[540px] flex flex-col z-30 rounded-xl overflow-hidden"
      style={{
        maxHeight: 300,
        background: 'rgba(2, 5, 10, 0.97)',
        border: '1px solid rgba(118, 185, 0, 0.25)',
        boxShadow: '0 0 24px rgba(118, 185, 0, 0.08)',
      }}
    >
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(118, 185, 0, 0.15)' }}
      >
        <Terminal size={12} style={{ color: '#76B900' }} />
        <span className="text-[11px] font-bold font-mono" style={{ color: '#76B900' }}>
          SIMULATION CONSOLE
        </span>

        {/* Live indicator */}
        <span className="flex items-center gap-1 ml-1">
          {particleLayerActive
            ? <Wifi size={10} className="text-emerald-400" />
            : <WifiOff size={10} className="text-gray-600" />}
          <span className="text-[9px] font-mono text-gray-600">
            {particleLayerActive ? 'LIVE' : 'IDLE'}
          </span>
        </span>

        {/* Level filters */}
        <div className="flex items-center gap-0.5 ml-2">
          {ALL_LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all"
              style={{
                background: filter === lvl ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === lvl && lvl !== 'ALL'
                  ? LEVEL_COLOR[lvl as LogLevel]
                  : filter === lvl
                    ? '#fff'
                    : '#4B5563',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setPinned(p => !p)}
            title={pinned ? 'Unpin scroll' : 'Pin to bottom'}
            className="p-1 rounded transition-colors"
            style={{ color: pinned ? '#00B4D8' : '#4B5563' }}
          >
            <ChevronDown size={11} />
          </button>
          <button
            onClick={() => clearSimLogs()}
            className="px-1.5 py-0.5 rounded text-[9px] font-mono text-gray-600 hover:text-gray-300 transition-colors"
          >
            CLR
          </button>
          <button
            onClick={() => setSimConsoleOpen(false)}
            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* ── Log output ─────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-px"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 10 }}
      >
        {filtered.length === 0 ? (
          <p className="text-gray-700 italic py-3 px-1">
            {`> No entries for filter "${filter}". Toggle particle layer or run simulation.`}
          </p>
        ) : (
          filtered.map(entry => (
            <LogLine key={entry.id} entry={entry} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Status footer ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 py-1 flex-shrink-0 text-[9px] font-mono"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#374151' }}
      >
        <span>
          {filtered.length} lines
          &nbsp;·&nbsp;wind {nvidiaSimConfig.windSpeed} m/s @ {nvidiaSimConfig.windBearing}°
          &nbsp;·&nbsp;stability {nvidiaSimConfig.stabilityClass}
        </span>
        <span>
          GHGRP · EJScreen · TROPOMI · Carbon Mapper · Open-Meteo
        </span>
      </div>
    </div>
  );
}

// ── Individual log line ───────────────────────────────────────────────────
function LogLine({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[entry.level];

  return (
    <div
      className="flex gap-2 rounded px-1 py-0.5 hover:bg-white/[0.02] cursor-default transition-colors group"
      onClick={() => entry.detail && setOpen(o => !o)}
    >
      {/* Timestamp */}
      <span className="text-gray-700 flex-shrink-0 tabular-nums">
        {ts(entry.ts)}
      </span>

      {/* Level badge */}
      <span
        className="flex-shrink-0 font-bold w-9 text-center"
        style={{ color }}
      >
        [{entry.level}]
      </span>

      {/* Message + optional detail */}
      <div className="min-w-0">
        <span style={{ color: entry.level === 'ERR' ? '#FCA5A5' : '#D1D5DB' }}>
          {entry.msg}
        </span>
        {entry.detail && (
          <span className="text-gray-600 ml-1 text-[9px]">
            {open ? '▾' : '▸'}
          </span>
        )}
        {entry.detail && open && (
          <div
            className="mt-0.5 pl-2 leading-relaxed"
            style={{
              color: '#6B7280',
              borderLeft: `2px solid ${color}33`,
            }}
          >
            {entry.detail}
          </div>
        )}
      </div>
    </div>
  );
}
