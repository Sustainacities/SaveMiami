'use client';

interface TooltipProps {
  info: Record<string, unknown>;
}

export function MapTooltip({ info }: TooltipProps) {
  const { x, y, type, name, mmsi, speed_knots, temperature_c, ph, station_id } =
    info as Record<string, string | number | undefined>;

  if (!x || !y) return null;

  return (
    <div
      className="absolute pointer-events-none z-40 bg-miami-panel/95 border border-miami-border
                 rounded-lg px-3 py-2 text-xs shadow-xl max-w-[220px] animate-fade-in"
      style={{ left: Number(x) + 12, top: Number(y) - 12 }}
    >
      {/* Vessel tooltip */}
      {type === 'vessel' && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-miami-teal">🚢 {name ?? 'Unknown Vessel'}</p>
          {mmsi && <p className="text-gray-400">MMSI: {mmsi}</p>}
          {speed_knots != null && (
            <p className="text-gray-300">{Number(speed_knots).toFixed(1)} kn</p>
          )}
        </div>
      )}

      {/* Water quality tooltip */}
      {type === 'water_quality' && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-blue-400">💧 {station_id ?? 'Sample'}</p>
          {temperature_c != null && (
            <p className="text-gray-300">Temp: {Number(temperature_c).toFixed(1)} °C</p>
          )}
          {ph != null && (
            <p className="text-gray-300">pH: {Number(ph).toFixed(2)}</p>
          )}
        </div>
      )}

      {/* Generic */}
      {!type && name && (
        <p className="text-gray-100">{String(name)}</p>
      )}
    </div>
  );
}
