'use client';

/**
 * WITPanel — Waste Impact Tracker Data Panel
 * ─────────────────────────────────────────────────────────────
 * Displays Full Circle Future · WIT data for Florida landfill #521
 * (Medley Landfill, Miami-Dade County).
 *
 * Source: https://www.wasteimpacttracker.org/#/state/FL?landfillId=521&plume=false
 * Data: EPA ECHO · GHGRP Subpart HH · EJScreen · TROPOMI · Carbon Mapper
 */

import { useState } from 'react';
import {
  X, Wind, AlertTriangle, BarChart2, Users,
  ExternalLink, Flame, Layers, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line,
} from 'recharts';
import { useMapStore } from '@/store/mapStore';
import witData from '@/data/wit-landfill-521.json';

const fac   = witData.facility;
const ch4   = witData.methane_emissions;
const viol  = witData.violations;
const ej    = witData.environmental_justice;
const prox  = witData.proximity_to_project;

type Tab = 'overview' | 'methane' | 'violations' | 'ej' | 'proximity';

export function WITPanel() {
  const {
    setWITPanelOpen,
    showWITLayer,    setShowWITLayer,
    showWITPlume,    setShowWITPlume,
    showWITEJRing,   setShowWITEJRing,
    witYear,         setWitYear,
    setViewState,
  } = useMapStore();

  const [tab, setTab] = useState<Tab>('overview');

  const latestReport = ch4.annual_reports[ch4.annual_reports.length - 1] as {
    year: number; ch4_generated_mmtco2e: number;
    ch4_emitted_mmtco2e: number; ch4_collected_mmtco2e: number;
  };

  const flyToLandfill = () => {
    setViewState({
      longitude: fac.coordinates.lng,
      latitude:  fac.coordinates.lat,
      zoom: 14, pitch: 45, bearing: -15,
      transitionDuration: 1400,
    });
  };

  return (
    <div className="absolute right-3 top-16 bottom-20 w-80 flex flex-col gap-2 z-20 overflow-hidden">
      <div className="glass-panel flex-1 flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-miami-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗑</span>
            <div>
              <p className="font-semibold text-sm text-white leading-none">WIT Landfill #521</p>
              <p className="text-[9px] text-gray-500 leading-none mt-0.5">
                Full Circle Future · WIT · FL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowWITLayer(!showWITLayer)}
              title="Toggle WIT layer"
              className={`transition-colors ${showWITLayer ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {showWITLayer ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <button onClick={() => setWITPanelOpen(false)} className="text-gray-500 hover:text-white transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Source badge ─────────────────────────────────── */}
        <div className="mx-3 mt-2 flex items-center gap-2 flex-wrap">
          {['EPA ECHO', 'GHGRP', 'EJScreen', 'TROPOMI', 'Carbon Mapper'].map((src) => (
            <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-miami-border text-gray-400">
              {src}
            </span>
          ))}
          <a
            href="https://www.wasteimpacttracker.org/#/state/FL?landfillId=521&plume=false"
            target="_blank" rel="noopener noreferrer"
            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-700/30 flex items-center gap-0.5 hover:bg-amber-900/50 transition-colors"
          >
            WIT <ExternalLink size={8} />
          </a>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-miami-border mt-2 overflow-x-auto scrollbar-hide">
          {([
            { id: 'overview',   label: 'Info',      icon: <Layers size={9} /> },
            { id: 'methane',    label: 'CH₄',       icon: <Wind size={9} /> },
            { id: 'violations', label: 'Violations', icon: <AlertTriangle size={9} /> },
            { id: 'ej',         label: 'EJ',        icon: <Users size={9} /> },
            { id: 'proximity',  label: 'Proximity', icon: <Flame size={9} /> },
          ] as Array<{ id: Tab; label: string; icon: React.ReactNode }>).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1 px-2 py-2 text-[10px] font-medium transition-colors ${
                tab === t.id
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

          {/* ══ Overview ══════════════════════════════════ */}
          {tab === 'overview' && (
            <>
              {/* Key stats strip */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Daily Tonnage"    value="~3,000 TPD" color="#F59E0B" />
                <StatCard label="Area"             value="170 acres"  color="#F59E0B" />
                <StatCard label="Opened"           value={String(fac.year_opened)} color="#6B7280" />
                <StatCard label="Planned Closure"  value={String(fac.permitted_closure_year)} color="#6B7280" />
                <StatCard label="CH₄ Emitted 2023" value="0.32 MMTCO₂e" color="#F59E0B" />
                <StatCard label="CH₄ Captured"     value="1.02 MMTCO₂e" color="#10B981" />
              </div>

              {/* Facility info */}
              <div className="rounded-lg border border-miami-border p-3 space-y-1.5 text-[11px]">
                <Row k="Name"     v={fac.name} />
                <Row k="Operator" v={fac.operator} />
                <Row k="County"   v={`${fac.county} County, FL`} />
                <Row k="Type"     v={fac.facility_type} />
                <Row k="Status"   v={fac.status} color="#10B981" />
                <Row k="GHGRP ID" v={fac.epa_ids.ghgrp_facility_id} />
              </div>

              {/* Carbon Mapper highlight */}
              <div className="rounded-lg border border-orange-700/30 bg-orange-900/10 p-3">
                <p className="text-[10px] font-semibold text-orange-400 mb-1 flex items-center gap-1">
                  <BarChart2 size={10} /> Carbon Mapper — Point Source
                </p>
                <p className="text-lg font-bold text-white font-mono">142 kg/hr</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  CH₄ emission rate · AVIRIS-NG · {ch4.carbon_mapper.observation_date}
                </p>
                <a
                  href="https://data.carbonmapper.org"
                  target="_blank" rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-[9px] text-orange-400 hover:text-orange-300"
                >
                  <ExternalLink size={8} /> Carbon Mapper (Modified CC BY-SA 4.0)
                </a>
              </div>

              {/* Map controls */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Map Controls</p>
                {[
                  { label: 'TROPOMI Methane Plume', val: showWITPlume, fn: () => setShowWITPlume(!showWITPlume) },
                  { label: 'EJScreen 3-mi Ring',    val: showWITEJRing, fn: () => setShowWITEJRing(!showWITEJRing) },
                ].map(({ label, val, fn }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={val} onChange={fn} className="accent-amber-400" />
                    <span className="text-xs text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={flyToLandfill}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-amber-500/50 text-amber-400 hover:bg-amber-900/20 transition-colors"
              >
                Fly to Medley Landfill
              </button>
            </>
          )}

          {/* ══ Methane Tab ═══════════════════════════════ */}
          {tab === 'methane' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                EPA GHGRP Subpart HH annual methane generation, collection, and
                net emission data for Medley Landfill (Facility ID: {fac.epa_ids.ghgrp_facility_id}).
              </p>

              {/* Year selector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">View Year</p>
                <div className="flex flex-wrap gap-1">
                  {(ch4.annual_reports as Array<{ year: number }>).map(({ year }) => (
                    <button
                      key={year}
                      onClick={() => setWitYear(year)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        witYear === year
                          ? 'bg-amber-400 text-black font-bold'
                          : 'bg-miami-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart — stacked bar: emitted vs collected */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Annual CH₄ (MMTCO₂e)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={ch4.annual_reports as Array<{ year: number; ch4_emitted_mmtco2e: number; ch4_collected_mmtco2e: number }>}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1F2937', fontSize: 10 }}
                      labelStyle={{ color: '#F9FAFB' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9, color: '#9CA3AF' }} />
                    <Bar dataKey="ch4_emitted_mmtco2e"   name="Emitted"   fill="#DC2626" stackId="a" />
                    <Bar dataKey="ch4_collected_mmtco2e" name="Collected" fill="#10B981" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* TROPOMI satellite data */}
              <div className="rounded-lg border border-miami-border p-3">
                <p className="text-[10px] font-semibold text-white mb-2">
                  TROPOMI / Sentinel-5P Satellite
                </p>
                <div className="space-y-1 text-[11px]">
                  <Row k="Background XCH₄" v="1,874 ppb" />
                  <Row k="Peak XCH₄"       v="1,912 ppb" color="#F59E0B" />
                  <Row k="Excess"           v="+38 ppb"   color="#DC2626" />
                  <Row k="Plume detected"   v="Yes"       color="#F59E0B" />
                  <Row k="Source"           v="Sept 2024 composite" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input type="checkbox" checked={showWITPlume} onChange={() => setShowWITPlume(!showWITPlume)} className="accent-amber-400" />
                  <span className="text-xs text-gray-300">Show plume on map</span>
                </label>
              </div>

              {/* Collection efficiency trend */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Collection Efficiency</p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart
                    data={(ch4.annual_reports as Array<{ year: number; ch4_emitted_mmtco2e: number; ch4_generated_mmtco2e: number }>).map((r) => ({
                      year: r.year,
                      pct: Math.round(((r.ch4_generated_mmtco2e - r.ch4_emitted_mmtco2e) / r.ch4_generated_mmtco2e) * 100),
                    }))}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="year" tick={{ fill: '#6B7280', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 9 }} unit="%" />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', fontSize: 10 }} />
                    <Line type="monotone" dataKey="pct" name="Collection %" stroke="#10B981" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ══ Violations Tab ════════════════════════════ */}
          {tab === 'violations' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Current Violations" value={String(viol.current_significant_violations)} color="#DC2626" />
                <StatCard label="5-yr Inspections"   value={String(viol.five_year_compliance_summary.inspections)} color="#6B7280" />
                <StatCard label="Penalties (5yr)"    value={`$${(viol.five_year_compliance_summary.penalty_total_usd / 1000).toFixed(0)}k`} color="#F59E0B" />
              </div>

              <div className="space-y-2">
                {viol.violation_categories.map((v, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    v.status === 'Unresolved'
                      ? 'border-waste-danger/40 bg-waste-danger/5'
                      : 'border-miami-border'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{v.violation_type}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        v.status === 'Unresolved'
                          ? 'bg-waste-danger/20 text-waste-danger'
                          : 'bg-miami-border text-gray-500'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{v.description}</p>
                    <div className="flex gap-4 mt-1.5 text-[9px] text-gray-600">
                      <span>{v.law}</span>
                      <span>{v.detection_date}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-lg border border-miami-border text-[10px] text-gray-400">
                <p className="font-semibold text-white mb-1">Key Regulation</p>
                40 CFR Part 60 Subpart WWW (NSPS) — surface methane emissions
                &gt;500 ppm at landfill boundary violate EPA standards.
              </div>

              <a
                href={fac.epa_ids.echo_url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-miami-teal hover:text-miami-cyan transition-colors"
              >
                <ExternalLink size={10} /> View on EPA ECHO
              </a>
            </>
          )}

          {/* ══ Environmental Justice Tab ═════════════════ */}
          {tab === 'ej' && (
            <>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                EPA EJScreen data within a {ej.buffer_radius_miles}-mile buffer
                of Medley Landfill. National percentile rankings.
              </p>

              {/* Demographics */}
              <div className="rounded-lg border border-miami-border p-3 space-y-1.5 text-[11px]">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Demographics (3-mi buffer)</p>
                <Row k="Total Population"       v={ej.demographics.total_population.toLocaleString()} />
                <Row k="People of Color"        v={`${ej.demographics.pct_people_of_color}%`} color="#DC2626" />
                <Row k="Hispanic / Latino"      v={`${ej.demographics.pct_hispanic_latino}%`} color="#F59E0B" />
                <Row k="Low Income"             v={`${ej.demographics.pct_low_income}%`} color="#F59E0B" />
                <Row k="Below Poverty"          v={`${ej.demographics.pct_below_poverty}%`} color="#DC2626" />
                <Row k="Linguistically Isolated" v={`${ej.demographics.pct_linguistically_isolated}%`} />
              </div>

              {/* EJ percentiles chart */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">EJScreen Percentiles (National)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    layout="vertical"
                    data={[
                      { name: 'EJ Index',      val: ej.ej_percentiles.ej_index_national_pctile },
                      { name: 'Cancer Risk',   val: ej.ej_percentiles.cancer_risk_national_pctile },
                      { name: 'Diesel PM',     val: ej.ej_percentiles.diesel_pm_national_pctile },
                      { name: 'Traffic',       val: ej.ej_percentiles.traffic_proximity_national_pctile },
                      { name: 'PM 2.5',        val: ej.ej_percentiles.pm25_national_pctile },
                    ]}
                    margin={{ top: 4, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 9 }} unit="%" />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 9 }} width={52} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', fontSize: 10 }} />
                    <Bar dataKey="val" fill="#DC2626" radius={[0, 3, 3, 0]}>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[9px] text-gray-600 mt-1">
                  79th national EJ percentile = more burdened than 79% of US census tracts
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showWITEJRing} onChange={() => setShowWITEJRing(!showWITEJRing)} className="accent-amber-400" />
                <span className="text-xs text-gray-300">Show EJScreen 3-mi ring on map</span>
              </label>

              <a
                href="https://www.epa.gov/ejscreen"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-miami-teal hover:text-miami-cyan transition-colors"
              >
                <ExternalLink size={10} /> EPA EJScreen Tool
              </a>
            </>
          )}

          {/* ══ Proximity Tab ════════════════════════════ */}
          {tab === 'proximity' && (
            <>
              <div className="p-3 rounded-lg border border-waste-danger/30 bg-waste-danger/5">
                <p className="text-xs font-semibold text-waste-danger mb-2">
                  ⚠ Compound Environmental Burden
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {prox.note}
                </p>
                <p className="text-[10px] font-semibold text-waste-danger mt-2">
                  {prox.cumulative_impact}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Distance (sites)" value="1.8 km" color="#DC2626" />
                <StatCard label="Shared Community" value="Medley / Doral" color="#F59E0B" />
              </div>

              <div className="rounded-lg border border-miami-border p-3 text-[11px] space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                  Cumulative Hazards at This Location
                </p>
                {[
                  { hazard: 'Active MSW landfill (WIT #521)',           color: '#F59E0B' },
                  { hazard: 'Methane emissions (1.34 MMTCO₂e/yr)',      color: '#F59E0B' },
                  { hazard: 'Decommissioned WTE incinerator',           color: '#DC2626' },
                  { hazard: 'PFAS contamination (8,900 ppt leachate)',  color: '#7C3AED' },
                  { hazard: '180,000 tons toxic ash on-site',           color: '#DC2626' },
                  { hazard: 'High truck traffic (CAA diesel PM)',       color: '#6B7280' },
                  { hazard: 'EJScreen 79th percentile EJ burden',      color: '#DC2626' },
                  { hazard: '84% people of color within 3 miles',      color: '#DC2626' },
                ].map(({ hazard, color }) => (
                  <div key={hazard} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: color }} />
                    <span className="text-gray-400">{hazard}</span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-lg border border-miami-teal/20 bg-miami-teal/5 text-[10px] text-gray-400 leading-relaxed">
                <p className="font-semibold text-miami-teal mb-1">305 Consortium Opportunity</p>
                Co-locating the Zero Waste Hub at the incinerator site would directly
                serve both the landfill's waste reduction mandate and the EJ community
                surrounding both sites. Proposed Doral Hub (WIT #521 service area).
              </div>

              <button
                onClick={() => {
                  setViewState({
                    longitude: (fac.coordinates.lng + INC_LNG) / 2,
                    latitude:  (fac.coordinates.lat + INC_LAT) / 2,
                    zoom: 13, pitch: 40, bearing: 0,
                    transitionDuration: 1400,
                  });
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-waste-danger/40 text-waste-danger hover:bg-waste-danger/10 transition-colors"
              >
                <Flame size={11} />
                View Both Sites Together
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-miami-night/50 border border-miami-border">
      <p className="text-[9px] text-gray-500 leading-none">{label}</p>
      <p className="text-sm font-bold mt-0.5 font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-mono" style={{ color: color ?? '#F9FAFB' }}>{v}</span>
    </div>
  );
}

// Incinerator coords (referenced in proximity tab)
const INC_LAT = 25.8012;
const INC_LNG = -80.3534;
