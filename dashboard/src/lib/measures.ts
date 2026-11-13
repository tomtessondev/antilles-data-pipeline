import { type TownDay, type TownSeries, windowDays } from "./analysis";

export type MeasureKey = "temperature" | "rain" | "pm10" | "dust";

export type Measure = {
  key: MeasureKey;
  label: string;
  /** What one daily point is. */
  daily: string;
  /** What the period figure is (map, ranking, trend). */
  period: string;
  unit: string;
  digits: number;
  aggregate: "mean" | "sum" | "max";
  value: (day: TownDay) => number | null;
};

export const MEASURES: Measure[] = [
  {
    key: "temperature",
    label: "Temperature",
    daily: "Daily mean temperature",
    period: "Mean temperature",
    unit: "°C",
    digits: 1,
    aggregate: "mean",
    value: (d) => d.weather?.temp_avg_c ?? null,
  },
  {
    key: "rain",
    label: "Rain",
    daily: "Daily rainfall",
    period: "Total rainfall",
    unit: "mm",
    digits: 0,
    aggregate: "sum",
    value: (d) => d.weather?.rain_total_mm ?? null,
  },
  {
    key: "pm10",
    label: "PM10",
    daily: "PM10 daily mean",
    period: "Mean PM10",
    unit: "µg/m³",
    digits: 0,
    aggregate: "mean",
    value: (d) => d.airQuality?.pm10_avg_ugm3 ?? null,
  },
  {
    key: "dust",
    label: "Saharan dust",
    daily: "Dust hourly peak",
    period: "Highest dust peak",
    unit: "µg/m³",
    digits: 0,
    aggregate: "max",
    value: (d) => d.airQuality?.dust_max_ugm3 ?? null,
  },
];

export function measureByKey(key: MeasureKey): Measure {
  const measure = MEASURES.find((m) => m.key === key);
  if (!measure) throw new Error(`Unknown measure ${key}`);
  return measure;
}

export function aggregate(measure: Measure, days: TownDay[]): number | null {
  const values = days.map(measure.value).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  switch (measure.aggregate) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "max":
      return Math.max(...values);
    case "mean":
      return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export type TownStat = {
  series: TownSeries;
  value: number | null;
  /** Change versus the previous window of the same length; null when it is incomplete. */
  delta: number | null;
  daily: (number | null)[];
};

export function townStat(
  measure: Measure,
  series: TownSeries,
  end: string,
  length: number,
): TownStat {
  const current = windowDays(series.days, end, length);
  const previous = windowDays(series.days, end, length, 1);
  const value = aggregate(measure, current);
  const before = previous.length === length ? aggregate(measure, previous) : null;
  return {
    series,
    value,
    delta: value !== null && before !== null ? value - before : null,
    daily: current.map(measure.value),
  };
}

export type Extreme = { value: number; town: string; date?: string };

export type PeriodHighlights = {
  /** Days on which at least one town was above the EU PM10 daily limit. */
  exceedanceDays: number;
  days: number;
  dustPeak?: Extreme;
  hottest?: Extreme;
  wettestTown?: Extreme;
};

function maxBy<T>(
  items: T[],
  key: (item: T) => number | null | undefined,
): { item: T; value: number } | undefined {
  let best: { item: T; value: number } | undefined;
  for (const item of items) {
    const value = key(item);
    if (value != null && (best === undefined || value > best.value)) best = { item, value };
  }
  return best;
}

export function periodHighlights(series: TownSeries[], end: string, length: number): PeriodHighlights {
  const rows = series.flatMap((s) =>
    windowDays(s.days, end, length).map((day) => ({ town: s.location.town, date: day.date, day })),
  );
  const exceedanceDates = new Set(
    rows.filter((r) => r.day.airQuality?.exceeds_pm10_daily_limit).map((r) => r.date),
  );
  const rain = measureByKey("rain");
  const totals = series.map((s) => ({
    town: s.location.town,
    total: aggregate(rain, windowDays(s.days, end, length)),
  }));

  const dust = maxBy(rows, (r) => r.day.airQuality?.dust_max_ugm3);
  const hot = maxBy(rows, (r) => r.day.weather?.temp_max_c);
  const wet = maxBy(totals, (t) => t.total);

  return {
    exceedanceDays: exceedanceDates.size,
    days: length,
    dustPeak: dust && { value: dust.value, town: dust.item.town, date: dust.item.date },
    hottest: hot && { value: hot.value, town: hot.item.town, date: hot.item.date },
    wettestTown: wet && { value: wet.value, town: wet.item.town },
  };
}

export function formatValue(measure: Measure, value: number | null): string {
  return value === null ? "–" : value.toFixed(measure.digits);
}
