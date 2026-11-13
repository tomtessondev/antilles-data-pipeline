import type { DailyAirQuality, DailyWeather, Location, Marts } from "./schema";

export const EU_PM10_DAILY_LIMIT_UGM3 = 50;

// The pipeline runs at 06:00 local time, so the last day is always partial.
export function isCompleteDay(row: { hours_observed: number }): boolean {
  return row.hours_observed >= 24;
}

export type TownDay = {
  date: string;
  weather?: DailyWeather;
  airQuality?: DailyAirQuality;
};

export type TownSeries = {
  location: Location;
  days: TownDay[];
};

/** Complete days for one town, oldest first, weather and air quality side by side. */
export function townSeries(marts: Marts, locationCode: string): TownSeries | undefined {
  const location = marts.locations.find((l) => l.location_code === locationCode);
  if (!location) return undefined;

  const byDate = new Map<string, TownDay>();
  const day = (date: string) => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const created: TownDay = { date };
    byDate.set(date, created);
    return created;
  };
  for (const row of marts.weather) {
    if (row.location_code === locationCode && isCompleteDay(row)) day(row.observed_date).weather = row;
  }
  for (const row of marts.air_quality) {
    if (row.location_code === locationCode && isCompleteDay(row)) {
      day(row.observed_date).airQuality = row;
    }
  }
  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { location, days };
}

/** Every town, in a fixed order (by location code) so colours follow the town. */
export function allTownSeries(marts: Marts): TownSeries[] {
  return [...marts.locations]
    .sort((a, b) => a.location_code.localeCompare(b.location_code))
    .map((location) => townSeries(marts, location.location_code))
    .filter((series): series is TownSeries => series !== undefined);
}

/** The most recent complete day, used for the summary cards. */
export function latestDay(series: TownSeries): TownDay | undefined {
  return series.days.at(-1);
}

/** Most recent complete day across all towns: the end of every period window. */
export function latestDate(series: TownSeries[]): string | undefined {
  return series
    .map((s) => s.days.at(-1)?.date)
    .filter((date): date is string => date !== undefined)
    .sort()
    .at(-1);
}

export function locationsByTerritory(locations: Location[]): [string, Location[]][] {
  const groups = new Map<string, Location[]>();
  for (const location of [...locations].sort((a, b) => a.town.localeCompare(b.town))) {
    groups.set(location.territory, [...(groups.get(location.territory) ?? []), location]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/** Calendar arithmetic on ISO dates ("2026-11-05"), timezone-free. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The `length` days ending on `end`, oldest first. */
export function dateRange(end: string, length: number): string[] {
  return Array.from({ length }, (_, i) => addDays(end, i - length + 1));
}

/**
 * Days inside a window of `length` days ending on `end`. `offset` 1 is the window just
 * before it, used to compute trends.
 */
export function windowDays(days: TownDay[], end: string, length: number, offset = 0): TownDay[] {
  const last = addDays(end, -offset * length);
  const first = addDays(last, -(length - 1));
  return days.filter((d) => d.date >= first && d.date <= last);
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "2026-11-05" -> "5 Nov". Dates are local calendar days, so format them as UTC. */
export function formatDay(isoDate: string): string {
  return dayFormat.format(new Date(`${isoDate}T00:00:00Z`));
}
