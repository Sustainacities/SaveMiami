'use client';

/**
 * TimeSlider — 5D Historical Timeline Control
 * ─────────────────────────────────────────────────────────────
 * Allows users to scrub through Miami-Dade waste history from
 * 1970 to present, animating landfill growth (5D = x,y,z,time,data).
 * Key milestone dates are marked (incinerator fire, closures, etc.)
 */

import { useCallback, useEffect, useRef } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Play, Pause, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { useMapStore } from '@/store/mapStore';

// ── Key historical milestones ──────────────────────────────────
const MILESTONES = [
  { date: new Date('1978-01-01'), label: 'South Dade Landfill opens', icon: '🏗️', type: 'landfill' },
  { date: new Date('1984-01-01'), label: 'Incinerator commissioned', icon: '🏭', type: 'incinerator' },
  { date: new Date('1986-01-01'), label: 'NW 58th St Landfill closes', icon: '🔒', type: 'landfill' },
  { date: new Date('1995-06-01'), label: 'Dioxin violations detected', icon: '⚠️', type: 'violation' },
  { date: new Date('2005-03-01'), label: 'PFAS first detected in groundwater', icon: '☣️', type: 'pfas' },
  { date: new Date('2010-01-01'), label: 'Ash classified as hazardous', icon: '🔴', type: 'regulatory' },
  { date: new Date('2019-01-01'), label: 'Community opposition begins', icon: '✊', type: 'community' },
  { date: new Date('2023-11-15'), label: 'Incinerator FIRE event', icon: '🔥', type: 'fire' },
  { date: new Date('2024-03-01'), label: 'EPA Superfund assessment', icon: '🏛️', type: 'regulatory' },
] as const;

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10] as const;

export function TimeSlider() {
  const {
    timeRange,
    setCurrentTime,
    togglePlayback,
    setPlaybackSpeed,
    show5DEvolution,
    setShow5DEvolution,
  } = useMapStore();

  const { start, end, current, playing, speed } = timeRange;

  const totalDays     = differenceInDays(end, start);
  const currentOffset = differenceInDays(current, start);
  const progress      = (currentOffset / totalDays) * 100;

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // ── Animation loop ────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      if (delta > 100) { // throttle to 10fps max
        lastTimeRef.current = now;
        const daysPerTick = speed * 30; // advance N months per tick
        const next = addDays(useMapStore.getState().timeRange.current, daysPerTick);
        if (next >= end) {
          setCurrentTime(start);
          useMapStore.getState().togglePlayback(); // stop at end
        } else {
          setCurrentTime(next);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, end, start, setCurrentTime]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value, 10);
      setCurrentTime(addDays(start, val));
    },
    [start, setCurrentTime]
  );

  const stepBackward = () => setCurrentTime(addDays(current, -365));
  const stepForward  = () => setCurrentTime(addDays(current,  365));
  const jumpToFire   = () => setCurrentTime(new Date('2023-11-15'));
  const jumpToStart  = () => setCurrentTime(start);

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-2 bg-gradient-to-t from-miami-night/95 to-transparent pointer-events-none">
      <div className="pointer-events-auto max-w-5xl mx-auto">
        {/* ── Controls row ─────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-2">
          {/* Jump to start */}
          <button
            onClick={jumpToStart}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Jump to 1970"
          >
            <SkipBack size={14} />
          </button>

          {/* Step backward 1 year */}
          <button
            onClick={stepBackward}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="-1 Year"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayback}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-miami-teal hover:bg-miami-teal/80 text-miami-night transition-colors"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Step forward 1 year */}
          <button
            onClick={stepForward}
            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="+1 Year"
          >
            <ChevronRight size={14} />
          </button>

          {/* Jump to fire event */}
          <button
            onClick={jumpToFire}
            className="px-2 py-1 rounded text-xs font-medium bg-waste-danger/20 text-waste-danger border border-waste-danger/30 hover:bg-waste-danger/30 transition-colors"
            title="Jump to Fire Event"
          >
            🔥 Nov 2023
          </button>

          {/* Speed selector */}
          <select
            value={speed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="ml-auto text-xs bg-miami-panel border border-miami-border rounded px-2 py-1 text-gray-300 cursor-pointer"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>

          {/* 5D Toggle */}
          <button
            onClick={() => setShow5DEvolution(!show5DEvolution)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
              show5DEvolution
                ? 'bg-miami-teal/20 text-miami-teal border-miami-teal/50'
                : 'bg-miami-panel text-gray-400 border-miami-border hover:border-gray-500'
            }`}
            title="5D Landfill Volume Evolution"
          >
            5D
          </button>

          {/* Current date display */}
          <div className="text-sm font-mono text-white min-w-[100px] text-right">
            {format(current, 'MMM yyyy')}
          </div>
        </div>

        {/* ── Main timeline slider ──────────────────────────── */}
        <div className="relative">
          {/* Milestone markers */}
          <div className="absolute top-0 left-0 right-0 h-2 pointer-events-none">
            {MILESTONES.map((m) => {
              const mOffset = differenceInDays(m.date, start);
              const mPct = (mOffset / totalDays) * 100;
              const isFire = m.type === 'fire';
              return (
                <div
                  key={m.label}
                  className="absolute -top-0.5 transform -translate-x-1/2 pointer-events-auto cursor-pointer group"
                  style={{ left: `${mPct}%` }}
                  onClick={() => setCurrentTime(m.date)}
                  title={`${format(m.date, 'MMM d, yyyy')}: ${m.label}`}
                >
                  <div
                    className={`w-1.5 h-3.5 rounded-sm ${isFire ? 'bg-waste-danger fire-glow' : 'bg-gray-500 group-hover:bg-white'} transition-colors`}
                  />
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap">
                    <div className="glass-panel text-xs px-2 py-1 text-gray-200">
                      {m.icon} {m.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Range input */}
          <input
            type="range"
            className="time-slider w-full mt-3"
            min={0}
            max={totalDays}
            value={currentOffset}
            onChange={handleSliderChange}
          />

          {/* Start / end labels */}
          <div className="flex justify-between text-xs text-gray-600 mt-0.5">
            <span>{format(start, 'yyyy')}</span>
            <span className="text-gray-500 text-[10px]">
              Miami-Dade Waste History ← drag or click milestones →
            </span>
            <span>{format(end, 'yyyy')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
