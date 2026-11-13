"use client";

import { useRouter } from "next/navigation";

import { normalise, rampColor } from "@/lib/colors";
import type { TerritoryMap } from "@/lib/geo";
import { formatValue, type Measure, type TownStat } from "@/lib/measures";

type Props = {
  maps: TerritoryMap[];
  stats: TownStat[];
  measure: Measure;
  highlight: string | null;
  onHighlight: (code: string | null) => void;
};

/** Communes of the six towns coloured by the period figure, on a scale shared by both maps. */
export function TownMap({ maps, stats, measure, highlight, onHighlight }: Props) {
  const router = useRouter();
  const byCode = new Map(stats.map((s) => [s.series.location.location_code, s]));
  const values = stats.map((s) => s.value).filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Start the ramp at 0.25 so the lowest town still stands out from the neutral land.
  const fill = (value: number | null) =>
    value === null ? "var(--land)" : rampColor("blue", 0.25 + 0.75 * normalise(value, min, max));

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        {maps.map((map) => (
          <figure key={map.territory} className="space-y-1">
            <figcaption className="text-sm font-medium text-ink-secondary">{map.territory}</figcaption>
            <svg
              viewBox={`0 0 ${map.width} ${map.height}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Map of ${map.territory}: ${measure.period.toLowerCase()} per town`}
            >
              {map.communes.map((commune) => {
                const stat = commune.locationCode ? byCode.get(commune.locationCode) : undefined;
                if (!stat) {
                  return (
                    <path key={commune.code} d={commune.path} fill="var(--land)" stroke="var(--surface)" strokeWidth={0.75} />
                  );
                }
                const code = stat.series.location.location_code;
                const dimmed = highlight !== null && highlight !== code;
                return (
                  <path
                    key={commune.code}
                    d={commune.path}
                    fill={fill(stat.value)}
                    stroke={highlight === code ? "var(--ink)" : "var(--surface)"}
                    strokeWidth={highlight === code ? 1.5 : 0.75}
                    opacity={dimmed ? 0.45 : 1}
                    onMouseEnter={() => onHighlight(code)}
                    onMouseLeave={() => onHighlight(null)}
                    onClick={() => router.push(`/towns/${code}`)}
                    className="cursor-pointer transition-opacity"
                  >
                    <title>{`${stat.series.location.town}: ${formatValue(measure, stat.value)} ${measure.unit}`}</title>
                  </path>
                );
              })}
              {map.towns.map((town) => {
                const stat = byCode.get(town.locationCode);
                if (!stat) return null;
                const code = town.locationCode;
                // Label to the left near the right edge, or when a neighbour sits just to the right.
                const crowded = map.towns.some(
                  (other) => other !== town && other.x > town.x && other.x - town.x < 90 && Math.abs(other.y - town.y) < 16,
                );
                const labelLeft = crowded || town.x > map.width * 0.7;
                return (
                  <g
                    key={code}
                    className="cursor-pointer"
                    onMouseEnter={() => onHighlight(code)}
                    onMouseLeave={() => onHighlight(null)}
                    onClick={() => router.push(`/towns/${code}`)}
                    opacity={highlight !== null && highlight !== code ? 0.45 : 1}
                  >
                    {/* The communes of Pointe-à-Pitre and Basse-Terre are tiny: the dot carries the value too. */}
                    <circle
                      cx={town.x}
                      cy={town.y}
                      r={7}
                      fill={fill(stat.value)}
                      stroke="var(--ink)"
                      strokeWidth={highlight === code ? 2 : 1}
                    />
                    <text
                      x={town.x + (labelLeft ? -11 : 11)}
                      y={town.y}
                      dy="0.35em"
                      textAnchor={labelLeft ? "end" : "start"}
                      className="fill-ink text-[12px] font-medium"
                      paintOrder="stroke"
                      stroke="var(--surface)"
                      strokeWidth={3}
                      strokeLinejoin="round"
                    >
                      {stat.series.location.town}{" "}
                      <tspan className="font-semibold">{formatValue(measure, stat.value)}</tspan>
                    </text>
                  </g>
                );
              })}
            </svg>
          </figure>
        ))}
      </div>
      {values.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <span className="tabular-nums">{formatValue(measure, min)}</span>
          <span
            aria-hidden
            className="h-2 w-32 rounded-full"
            style={{ background: `linear-gradient(to right, ${rampColor("blue", 0.25)}, ${rampColor("blue", 1)})` }}
          />
          <span className="tabular-nums">
            {formatValue(measure, max)} {measure.unit}
          </span>
          <span>· {measure.period.toLowerCase()}, relative scale across the six towns</span>
        </div>
      )}
    </div>
  );
}
