'use client';

/**
 * WasteControlPanel — Comprehensive Waste Layer Control
 * ─────────────────────────────────────────────────────────────
 * Right-side panel providing:
 *  • Incinerator fire event info & focus controls
 *  • PFAS scenario selector
 *  • Zero waste / 305 Consortium scenario selector
 *  • Material stream breakdown
 *  • Ash storage status
 *  • Community risk summary
 *  • Historical landfill asset value calculator
 */

import { useState } from 'react';
import { X, Flame, AlertTriangle, Recycle, BarChart2, Info, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useMapStore, type PfasScenario, type WasteScenario } from '@/store/mapStore';
import zeroWasteData from '@/data/zero-waste-scenarios.json';

const PFAS_SCENARIOS: Array<{ id: PfasScenario; label: string; desc: string; color: string }> = [
  { id: 'operations',  label: 'Normal Operations', desc: 'PFAS from routine WtE plant operation (1984–2023)', color: '#F59E0B' },
  { id: 'fire_event',  label: '🔥 Fire Event Nov 2023', desc: 'Acute PFAS/dioxin release during the 96-hour fire', color: '#DC2626' },
  { id: 'combined',    label: 'Combined Exposure',  desc: 'Cumulative lifetime exposure from both sources', color: '#7C3AED' },
  { id: 'ash_leachate',label: 'Ash Leachate Plume', desc: 'Groundwater PFAS from on-site ash storage leaching', color: '#6B7280' },
];

const WASTE_SCENARIOS: Array<{ id: WasteScenario; label: string; color: string }> = [
  { id: 'status_quo',       label: 'Status Quo 2024',          color: '#DC2626' },
  { id: 'zero_waste_2030',  label: 'Zero Waste Miami 2030',     color: '#10B981' },
  { id: 'circular_economy', label: 'Circular Economy 2035',     color: '#00B4D8' },
  { id: 'consortium_305',   label: '305 Consortium Partnership', color: '#F4E285' },
];

const AFFECTED_COMMUNITIES = [
  { name: 'Doral',        dist: '2.1 km', pop: '81,400',  risk: 'critical', color: '#DC2626' },
  { name: 'Medley',       dist: '3.8 km', pop: '1,200',   risk: 'critical', color: '#DC2626' },
  { name: 'Miami Lakes',  dist: '5.2 km', pop: '31,000',  risk: 'high',     color: '#F59E0B' },
  { name: 'Hialeah',      dist: '8.1 km', pop: '225,000', risk: 'high',     color: '#F59E0B' },
  { name: 'Sweetwater',   dist: '9.4 km', pop: '14,000',  risk: 'medium',   color: '#7C3AED' },
  { name: 'West Miami',   dist: '12.3 km',pop: '6,200',   risk: 'medium',   color: '#7C3AED' },
  { name: 'Coral Gables', dist: '14.8 km',pop: '49,700',  risk: 'low',      color: '#00B4D8' },
];

export function WasteControlPanel() {
  const {
    setWastePanelOpen,
    pfasScenario, setPfasScenario,
    wasteScenario, setWasteScenario,
    activeLayers, toggleLayer,
    setIncineratorFocusMode,
    setNvidiaPanelOpen,
  } = useMapStore();

  const [activeTab, setActiveTab]             = useState<'contamination' | 'zerowaste' | 'communities' | 'assets'>('contamination');
  const [ashExpanded, setAshExpanded]         = useState(false);

  const currentWasteData = (zeroWasteData.scenarios as Record<string, {
    name: string; diversion_rate_pct: number; landfill_tons_year: number;
    recycling_tons_year: number; composting_tons_year?: number; jobs: number;
    cost_per_ton_usd: number; co2_eq_tons_year: number; color: string;
  }>)[wasteScenario];

  return (
    <div className="absolute right-3 top-16 bottom-20 w-80 flex flex-col gap-2 z-20 overflow-hidden">
      <div className="glass-panel flex-1 flex flex-col overflow-hidden">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-miami-border">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-waste-danger" />
            <span className="font-semibold text-sm text-white">Waste Intelligence</span>
          </div>
          <button
            onClick={() => setWastePanelOpen(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Incinerator alert ────────────────────────────── */}
        <div className="mx-3 mt-3 p-3 rounded-lg bg-waste-danger/10 border border-waste-danger/30">
          <div className="flex items-start gap-2">
            <Flame size={14} className="text-waste-danger mt-0.5 flex-shrink-0 fire-glow" />
            <div>
              <p className="text-xs font-semibold text-waste-danger">Miami-Dade Incinerator</p>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                Resources Recovery Facility — Doral<br/>
                🔥 Fire event: Nov 15–19, 2023 (96 hrs)<br/>
                180,000 tons toxic ash on-site
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setIncineratorFocusMode(true); }}
                  className="text-[10px] px-2 py-1 rounded bg-waste-danger/20 text-waste-danger border border-waste-danger/40 hover:bg-waste-danger/30 transition-colors"
                >
                  Fly to Site
                </button>
                <button
                  onClick={() => setNvidiaPanelOpen(true)}
                  className="text-[10px] px-2 py-1 rounded bg-[#76B900]/20 text-[#76B900] border border-[#76B900]/40 hover:bg-[#76B900]/30 transition-colors"
                >
                  ⚡ NVIDIA Sim
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-miami-border mt-3">
          {[
            { id: 'contamination', label: 'PFAS',      icon: <AlertTriangle size={11} /> },
            { id: 'zerowaste',     label: 'Zero Waste', icon: <Recycle size={11} /> },
            { id: 'communities',   label: 'Impact',     icon: <Info size={11} /> },
            { id: 'assets',        label: 'Assets',     icon: <BarChart2 size={11} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-miami-teal border-b-2 border-miami-teal'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

          {/* ── PFAS / Contamination tab ─────────────────── */}
          {activeTab === 'contamination' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                NVIDIA Modulus Gaussian-plume model showing PFAS dispersal from the
                incinerator site. Wind-driven atmospheric transport + groundwater leachate.
              </p>

              {/* PFAS scenario selector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">PFAS Scenario</p>
                {PFAS_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPfasScenario(s.id);
                      if (!activeLayers.has('pfas_plume')) toggleLayer('pfas_plume');
                    }}
                    className={`w-full text-left p-2.5 rounded-lg mb-1.5 border text-xs transition-colors ${
                      pfasScenario === s.id
                        ? 'bg-white/5 border-opacity-60'
                        : 'border-miami-border hover:bg-white/3'
                    }`}
                    style={pfasScenario === s.id ? { borderColor: s.color } : {}}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="font-medium" style={{ color: pfasScenario === s.id ? s.color : '#D1D5DB' }}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-4">{s.desc}</p>
                  </button>
                ))}
              </div>

              {/* Ash storage status */}
              <div className="rounded-lg border border-miami-border p-3">
                <button
                  onClick={() => setAshExpanded(!ashExpanded)}
                  className="w-full flex items-center justify-between text-xs font-medium text-gray-300"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    Ash Storage Status
                  </span>
                  {ashExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {ashExpanded && (
                  <div className="mt-2 space-y-1.5 text-[11px]">
                    <StatRow label="Total ash on-site"   value="180,000 tons"  alert />
                    <StatRow label="Fly ash"             value="42,000 tons"   alert />
                    <StatRow label="Bottom ash"          value="138,000 tons"  alert />
                    <StatRow label="PFAS in leachate"    value="8,900 ppt"     alert />
                    <StatRow label="EPA MCL"             value="4 ppt"         />
                    <StatRow label="Exceedance factor"   value="×2,225"        alert />
                    <StatRow label="Groundwater depth"   value="8 ft"          alert />
                    <StatRow label="Remediation cost est." value="$85M"        />
                    <StatRow label="Remediation plan"    value="Not submitted" alert />
                    <div className="mt-2 p-2 rounded bg-waste-danger/10 border border-waste-danger/20 text-[10px] text-waste-danger">
                      ⚠️ Northeast liner cell damaged in fire — active leachate risk
                    </div>
                  </div>
                )}
              </div>

              {/* Key PFAS stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Affected radius',     value: '40 km',    color: '#DC2626' },
                  { label: 'Communities at risk',  value: '7+',       color: '#F59E0B' },
                  { label: 'Pop. in critical zone',value: '313,600+', color: '#DC2626' },
                  { label: 'Compounds detected',   value: '8 PFAS',   color: '#7C3AED' },
                ].map((stat) => (
                  <div key={stat.label} className="p-2 rounded-lg bg-miami-ocean/30 border border-miami-border">
                    <p className="text-[10px] text-gray-500">{stat.label}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Zero Waste tab ───────────────────────────── */}
          {activeTab === 'zerowaste' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Visualize Miami-Dade's path to a hyper-local regenerative circular economy.
                The 305 Consortium model leverages historical landfill assets to build
                zero waste infrastructure.
              </p>

              {/* Scenario selector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Scenario</p>
                {WASTE_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setWasteScenario(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1.5 border text-xs transition-colors ${
                      wasteScenario === s.id ? 'bg-white/5' : 'border-miami-border hover:bg-white/3'
                    }`}
                    style={wasteScenario === s.id ? { borderColor: s.color } : {}}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span style={{ color: wasteScenario === s.id ? s.color : '#D1D5DB' }}>
                        {s.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Scenario metrics */}
              {currentWasteData && (
                <div className="rounded-lg border border-miami-border p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">
                    {currentWasteData.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Diversion Rate"
                      value={`${currentWasteData.diversion_rate_pct}%`}
                      color={currentWasteData.color}
                    />
                    <MetricCard
                      label="Jobs Created"
                      value={currentWasteData.jobs.toLocaleString()}
                      color={currentWasteData.color}
                    />
                    <MetricCard
                      label="CO₂ Saved"
                      value={`${(currentWasteData.co2_eq_tons_year / 1000).toFixed(0)}k t`}
                      color={currentWasteData.color}
                    />
                    <MetricCard
                      label="Cost/Ton"
                      value={`$${currentWasteData.cost_per_ton_usd}`}
                      color={currentWasteData.color}
                    />
                  </div>

                  {/* Diversion bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>Landfill diversion</span>
                      <span>{currentWasteData.diversion_rate_pct}%</span>
                    </div>
                    <div className="h-2 bg-miami-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${currentWasteData.diversion_rate_pct}%`, background: currentWasteData.color }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 305 Consortium info */}
              {wasteScenario === 'consortium_305' && (
                <div className="rounded-lg border border-yellow-500/30 p-3 bg-yellow-500/5">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">305 Consortium Model</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Public-private partnership cooperative led by Sustainacities &
                    local partners. Targets 3 zero waste hubs on former landfill sites
                    and the decommissioned incinerator footprint.
                  </p>
                  <div className="mt-2 space-y-1 text-[10px] text-gray-400">
                    <p>• $203M total investment</p>
                    <p>• 850 direct jobs</p>
                    <p>• $48M/yr materials revenue</p>
                    <p>• 3 zero waste hubs (see map)</p>
                  </div>
                </div>
              )}

              {/* Material streams */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Material Streams (2024)</p>
                {zeroWasteData.material_streams.map((stream) => (
                  <div key={stream.id} className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: stream.color }} />
                    <span className="text-[11px] text-gray-400 flex-1">{stream.name}</span>
                    <span className="text-[11px] font-mono text-gray-300">
                      {(stream.tons_2024 / 1000).toFixed(0)}k t
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Communities Impact tab ───────────────────── */}
          {activeTab === 'communities' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Communities affected by PFAS contamination from the incinerator site.
                Risk levels based on modeled atmospheric deposition and groundwater transport.
              </p>

              <div className="space-y-2">
                {AFFECTED_COMMUNITIES.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-miami-border"
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white">{c.name}</p>
                      <p className="text-[10px] text-gray-500">{c.dist} · Pop. {c.pop}</p>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded capitalize font-medium"
                      style={{ background: c.color + '20', color: c.color, border: `1px solid ${c.color}40` }}
                    >
                      {c.risk}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-miami-ocean/30 border border-miami-border text-[11px] text-gray-400">
                <p className="font-semibold text-white mb-1">Environmental Justice</p>
                Hialeah and Sweetwater (high-risk zone) are majority Latino communities
                with median incomes 35–45% below Miami-Dade average — a systemic
                environmental justice concern.
              </div>

              <a
                href="https://www.epa.gov/ejscreen"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-miami-teal hover:text-miami-cyan transition-colors"
              >
                <ExternalLink size={10} />
                EPA EJScreen for Miami-Dade
              </a>
            </>
          )}

          {/* ── Assets tab ───────────────────────────────── */}
          {activeTab === 'assets' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Historical Miami-Dade landfills contain recoverable metals and materials
                representing significant economic value — a foundation for the 305
                Consortium zero waste hub strategy.
              </p>

              {zeroWasteData.historical_landfill_assets.sites.map((site) => (
                <div key={site.id} className="p-3 rounded-lg border border-miami-border">
                  <p className="text-xs font-semibold text-white">{site.name}</p>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <StatRow label="Recoverable metals" value={`${(site.estimated_metals_tons / 1000).toFixed(0)}k tons`} />
                    <StatRow label="Est. value" value={`$${(site.estimated_value_usd / 1e6).toFixed(0)}M`} color="#10B981" />
                    <StatRow label="Redevelopment" value={site.redevelopment_potential.replace('_', ' ')} color="#00B4D8" />
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-lg border border-miami-teal/30 bg-miami-teal/5">
                <p className="text-[10px] font-semibold text-miami-teal mb-1">Total Asset Value Estimate</p>
                <p className="text-xl font-bold text-white">$99M+</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Historical landfill metals recovery potential across closed sites
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────

function StatRow({ label, value, alert, color }: {
  label: string; value: string; alert?: boolean; color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium font-mono ${alert ? 'text-waste-danger' : ''}`}
            style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-miami-night/50 border border-miami-border">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}
