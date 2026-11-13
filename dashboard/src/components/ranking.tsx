"use client";

import Link from "next/link";

import { formatValue, type Measure, type TownStat } from "@/lib/measures";

function Sparkline({ values, color }: { values: (number | null)[]; color: string }) {
  const points = values
    .map((v, i) => (v === null ? null : ([i, v] as const)))
    .filter((p): p is readonly [number, number] => p !== null);
  if (points.length < 2) return null;
  const ys = points.map(([, v]) => v);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const w = 80;
  const h = 24;
  const x = (i: number) => (i / (values.length - 1)) * (w - 4) + 2;
  const y = (v: number) => (max > min ? h - 3 - ((v - min) / (max - min)) * (h - 6) : h / 2);
  const d = points.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const [lastI, lastV] = points[points.length - 1];
  return (
    <svg width={w} height={h} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(lastI)} cy={y(lastV)} r={2.5} fill={color} />
    </svg>
  );
}

function Delta({ measure, delta }: { measure: Measure; delta: number | null }) {
  if (delta === null) return <span className="text-ink-muted">–</span>;
  const rounded = Number(delta.toFixed(measure.digits));
  if (rounded === 0) return <span className="text-ink-muted">= 0</span>;
  return (
    <span className="text-ink-secondary">
      <span aria-hidden>{rounded > 0 ? "▲" : "▼"}</span>{" "}
      <span className="sr-only">{rounded > 0 ? "up" : "down"} </span>
      {Math.abs(rounded).toFixed(measure.digits)}
    </span>
  );
}

type Props = {
  stats: TownStat[];
  colors: Map<string, string>;
  measure: Measure;
  period: number;
  highlight: string | null;
  onHighlight: (code: string | null) => void;
};

export function Ranking({ stats, colors, measure, period, highlight, onHighlight }: Props) {
  const ranked = [...stats].sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">
        {measure.period} over the last {period} days, per town, with the change versus the {period} days before
      </caption>
      <thead className="text-left text-xs text-ink-muted">
        <tr className="border-b border-border">
          <th className="py-2 pr-2 font-medium">Town</th>
          <th className="py-2 pr-2 text-right font-medium">{measure.unit}</th>
          <th className="py-2 pr-2 text-right font-medium">vs prev. {period} d</th>
          <th className="py-2 font-medium">
            <span className="sr-only">Daily trend</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((stat) => {
          const { location } = stat.series;
          const code = location.location_code;
          const color = colors.get(code) ?? "var(--ink)";
          return (
            <tr
              key={code}
              onMouseEnter={() => onHighlight(code)}
              onMouseLeave={() => onHighlight(null)}
              className={`border-b border-border last:border-0 ${highlight === code ? "bg-grid/60" : ""}`}
            >
              <td className="py-2 pr-2">
                <Link href={`/towns/${code}`} className="flex items-center gap-2 hover:underline">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span>
                    {location.town}
                    <span className="block text-xs text-ink-muted">{location.territory}</span>
                  </span>
                </Link>
              </td>
              <td className="py-2 pr-2 text-right font-medium tabular-nums">{formatValue(measure, stat.value)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">
                <Delta measure={measure} delta={stat.delta} />
              </td>
              <td className="py-2">
                <Sparkline values={stat.daily} color={color} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
