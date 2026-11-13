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

/** The most recent complete day, used for the summary cards. */
export function latestDay(series: TownSeries): TownDay | undefined {
  return series.days.at(-1);
}

export function locationsByTerritory(locations: Location[]): [string, Location[]][] {
  const groups = new Map<string, Location[]>();
  for (const location of [...locations].sort((a, b) => a.town.localeCompare(b.town))) {
    groups.set(location.territory, [...(groups.get(location.territory) ?? []), location]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
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
