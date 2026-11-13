"use client";

import {
  Bar,
  BarChart,
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

export type ChartPoint = {
  day: string;
  tempMin: number | null;
  tempMax: number | null;
  rain: number | null;
  pm10: number | null;
  dust: number | null;
};

type SeriesKey = Exclude<keyof ChartPoint, "day">;
type Series = { key: SeriesKey; label: string; color: string };

const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 12 };
const CHART_HEIGHT = 220;

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex gap-4 text-sm text-ink-secondary">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function makeTooltip(series: Series[], unit: string) {
  return function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as ChartPoint;
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
        <p className="mb-1 font-medium">{label}</p>
        {series.map((s) => (
          <p key={s.key} className="flex items-center gap-2 text-ink-secondary">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="ml-auto pl-3 font-medium text-ink tabular-nums">
              {point[s.key] == null ? "–" : `${point[s.key]} ${unit}`}
            </span>
          </p>
        ))}
      </div>
    );
  };
}

function ChartFrame({
  title,
  subtitle,
  series,
  children,
}: {
  title: string;
  subtitle: string;
  series?: Series[];
  children: React.ReactElement;
}) {
  return (
    <figure className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <figcaption className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </figcaption>
      {series && <Legend series={series} />}
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        {children}
      </ResponsiveContainer>
    </figure>
  );
}

function LinesChart({ data, series, unit, limit }: {
  data: ChartPoint[];
  series: Series[];
  unit: string;
  limit?: { value: number; label: string };
}) {
  return (
    <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
      <CartesianGrid vertical={false} stroke="var(--grid)" />
      <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
      <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
      <Tooltip content={makeTooltip(series, unit)} cursor={{ stroke: "var(--baseline)" }} />
      {limit && (
        <ReferenceLine
          y={limit.value}
          ifOverflow="extendDomain"
          stroke="var(--critical)"
          label={{ value: limit.label, position: "insideTopRight", fill: "var(--ink-secondary)", fontSize: 12 }}
        />
      )}
      {series.map((s) => (
        <Line
          key={s.key}
          dataKey={s.key}
          name={s.label}
          stroke={s.color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  );
}

const TEMPERATURE: Series[] = [
  { key: "tempMin", label: "Daily low", color: "var(--series-1)" },
  { key: "tempMax", label: "Daily high", color: "var(--series-2)" },
];

const AIR: Series[] = [
  { key: "pm10", label: "PM10 daily mean", color: "var(--series-1)" },
  { key: "dust", label: "Dust hourly peak", color: "var(--series-2)" },
];

const RAIN: Series[] = [{ key: "rain", label: "Rain", color: "var(--series-1)" }];

export function TemperatureChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartFrame title="Temperature" subtitle="Lowest and highest hourly value, °C" series={TEMPERATURE}>
      <LinesChart data={data} series={TEMPERATURE} unit="°C" />
    </ChartFrame>
  );
}

export function RainChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartFrame title="Rainfall" subtitle="Daily total, mm">
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <Tooltip content={makeTooltip(RAIN, "mm")} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
        <Bar
          dataKey="rain"
          name="Rain"
          fill="var(--series-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}

export function AirQualityChart({ data, limit }: { data: ChartPoint[]; limit: number }) {
  return (
    <ChartFrame
      title="Particulate matter and Saharan dust"
      subtitle="µg/m³. The EU limit applies to the PM10 daily mean."
      series={AIR}
    >
      <LinesChart data={data} series={AIR} unit="µg/m³" limit={{ value: limit, label: `EU PM10 limit (${limit})` }} />
    </ChartFrame>
  );
}
