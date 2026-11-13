"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { dateRange, EU_PM10_DAILY_LIMIT_UGM3, formatDay, type TownSeries } from "@/lib/analysis";
import { formatValue, type Measure } from "@/lib/measures";

type Row = { day: string } & Record<string, number | string | null>;

type Props = {
  series: TownSeries[];
  colors: Map<string, string>;
  measure: Measure;
  end: string;
  period: number;
  highlight: string | null;
  onHighlight: (code: string | null) => void;
};

const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 12 };

export function ComparisonChart({ series, colors, measure, end, period, highlight, onHighlight }: Props) {
  const rows: Row[] = dateRange(end, period).map((date) => {
    const row: Row = { day: formatDay(date) };
    for (const s of series) {
      const day = s.days.find((d) => d.date === date);
      row[s.location.location_code] = day ? measure.value(day) : null;
    }
    return row;
  });

  function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as Row;
    const towns = [...series].sort(
      (a, b) => Number(row[b.location.location_code] ?? -Infinity) - Number(row[a.location.location_code] ?? -Infinity),
    );
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
        <p className="mb-1 font-medium">{label}</p>
        {towns.map((s) => {
          const code = s.location.location_code;
          const value = row[code];
          return (
            <p key={code} className="flex items-center gap-2 text-ink-secondary">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: colors.get(code) }} />
              {s.location.town}
              <span className="ml-auto pl-4 font-medium text-ink tabular-nums">
                {typeof value === "number" ? `${formatValue(measure, value)} ${measure.unit}` : "–"}
              </span>
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-secondary">
        {series.map((s) => {
          const code = s.location.location_code;
          return (
            <li key={code}>
              <button
                type="button"
                onMouseEnter={() => onHighlight(code)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(code)}
                onBlur={() => onHighlight(null)}
                className={`flex items-center gap-1.5 ${highlight === code ? "text-ink" : ""}`}
              >
                <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: colors.get(code) }} />
                {s.location.town}
              </button>
            </li>
          );
        })}
      </ul>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} minTickGap={24} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--baseline)" }} />
          {measure.key === "pm10" && (
            <ReferenceLine
              y={EU_PM10_DAILY_LIMIT_UGM3}
              ifOverflow="extendDomain"
              stroke="var(--critical)"
              label={{
                value: `EU daily limit (${EU_PM10_DAILY_LIMIT_UGM3})`,
                position: "insideTopRight",
                fill: "var(--ink-secondary)",
                fontSize: 12,
              }}
            />
          )}
          {series.map((s) => {
            const code = s.location.location_code;
            const dimmed = highlight !== null && highlight !== code;
            return (
              <Line
                key={code}
                dataKey={code}
                name={s.location.town}
                stroke={colors.get(code)}
                strokeWidth={highlight === code ? 3 : 2}
                strokeOpacity={dimmed ? 0.2 : 1}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
