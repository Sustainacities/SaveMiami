'use client';

/**
 * MapTooltip — Context-aware hover tooltip for map features
 */

interface Props {
  info: Record<string, unknown>;
}

export function MapTooltip({ info }: Props) {
  const x = (info.x as number) ?? 0;
  const y = (info.y as number) ?? 0;
  const props = (info.properties as Record<string, unknown>) ?? info;

  const name   = (props.name as string) ?? '';
  const type   = (props.type as string) ?? '';
  const status = (props.status as string) ?? '';

  const isIncinerator = type === 'incinerator';
  const isLandfill    = type === 'landfill' || type === 'transfer_station';
  const isZeroWaste   = type === 'zero_waste_hub' || (info.name as string)?.includes('305');

  const tooltipX = Math.min(x + 12, window.innerWidth  - 300);
  const tooltipY = Math.min(y + 12, window.innerHeight - 200);

  return (
    <div
      className="map-tooltip"
      style={{ left: tooltipX, top: tooltipY }}
    >
      {isIncinerator && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-base">🔥</span>
            <span className="font-semibold text-waste-danger text-xs">{name}</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <Row k="Status"      v={status.replace('_', ' ')} alert />
            <Row k="Fire date"   v="Nov 15–19, 2023" alert />
            <Row k="Ash on-site" v="180,000 tons" alert />
            <Row k="PFAS in leachate" v="8,900 ppt (×2,225 EPA MCL)" alert />
            <Row k="PFAS risk"   v={(props.pfas_risk_level as string) ?? 'critical'} alert />
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Click NVIDIA Sim to model plume</p>
        </>
      )}

      {isLandfill && (
        <>
          <div className="font-semibold text-xs text-white mb-2">{name}</div>
          <div className="space-y-1 text-[11px]">
            <Row k="Type"        v={type.replace('_', ' ')} />
            <Row k="Status"      v={status.replace(/_/g, ' ')} />
            {props.area_acres && <Row k="Area" v={`${props.area_acres} acres`} />}
            {props.pfas_risk_level && <Row k="PFAS Risk" v={props.pfas_risk_level as string} alert={(props.pfas_risk_level as string) === 'high'} />}
            {props.zero_waste_potential && <Row k="ZW Potential" v={props.zero_waste_potential as string} />}
          </div>
        </>
      )}

      {isZeroWaste && (
        <>
          <div className="flex items-center gap-1.5 mb-2">
            <span>♻️</span>
            <span className="font-semibold text-miami-lime text-xs">{name || (info.name as string)}</span>
          </div>
          <div className="space-y-1 text-[11px]">
            {info.capacity && <Row k="Capacity" v={`${info.capacity} TPD`} />}
            {info.jobs     && <Row k="Jobs" v={(info.jobs as number).toLocaleString()} />}
            {info.status   && <Row k="Status" v={info.status as string} />}
          </div>
        </>
      )}

      {!isIncinerator && !isLandfill && !isZeroWaste && name && (
        <>
          <div className="font-semibold text-xs text-white mb-1">{name}</div>
          {type && <p className="text-[10px] text-gray-400 capitalize">{type.replace(/_/g, ' ')}</p>}
        </>
      )}
    </div>
  );
}

function Row({ k, v, alert }: { k: string; v: string | number; alert?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{k}</span>
      <span className={`text-right ${alert ? 'text-waste-danger' : 'text-gray-200'}`}>{v}</span>
    </div>
  );
}
