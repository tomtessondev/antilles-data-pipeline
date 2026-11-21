import type { Feature, FeatureCollection, LineString } from "geojson";

import { rampColor } from "./colors";
import type { Category, ExplorerHurricanes, Passage, PassageWeather, Track } from "./hurricanes";

/* Pure helpers of the hurricane explorer: no React, no MapLibre, safe in client bundles. */

/** Weakest to strongest; also the contract's accepted values. */
export const CATEGORIES = ["Depression", "Tropical storm", "Cat 1", "Cat 2", "Cat 3", "Cat 4", "Cat 5"] as const;

export const CATEGORY_LABELS: Record<Category | "Unknown", string> = {
  Depression: "Dépression",
  "Tropical storm": "Tempête tropicale",
  "Cat 1": "Catégorie 1",
  "Cat 2": "Catégorie 2",
  "Cat 3": "Catégorie 3",
  "Cat 4": "Catégorie 4",
  "Cat 5": "Catégorie 5",
  Unknown: "Inconnue",
};

export const ISLAND_LABELS: Record<string, string> = {
  Guadeloupe: "Guadeloupe",
  Martinique: "Martinique",
  "Saint-Barthelemy": "Saint-Barthélemy",
  "Saint-Martin": "Saint-Martin",
  Dominica: "Dominique",
  "Saint Lucia": "Sainte-Lucie",
};

export const islandLabel = (island: string) => ISLAND_LABELS[island] ?? island;

/** Saffir-Simpson category from the maximum sustained wind in knots (same thresholds as the warehouse). */
export function categoryFromWind(kt: number | null): Category | null {
  if (kt === null) return null;
  if (kt >= 137) return "Cat 5";
  if (kt >= 113) return "Cat 4";
  if (kt >= 96) return "Cat 3";
  if (kt >= 83) return "Cat 2";
  if (kt >= 64) return "Cat 1";
  if (kt >= 34) return "Tropical storm";
  return "Depression";
}

/** 0 for a depression to 6 for a category 5; -1 when unknown. */
export function categoryRank(category: Category | "Unknown" | null): number {
  return category === null || category === "Unknown" ? -1 : CATEGORIES.indexOf(category);
}

/** Where a category sits on the site's ramps: below hurricane force in blue, hurricanes in orange. */
export function categoryStep(category: Category | "Unknown" | null): { ramp: "blue" | "orange"; t: number } | null {
  const rank = categoryRank(category);
  if (rank < 0) return null;
  if (rank < 2) return { ramp: "blue", t: rank === 0 ? 0.35 : 0.7 };
  return { ramp: "orange", t: 0.4 + (rank - 2) * 0.15 };
}

export function categoryColor(category: Category | "Unknown" | null): string {
  const step = categoryStep(category);
  return step ? rampColor(step.ramp, step.t) : "var(--baseline)";
}

/** "MARIA" → "Maria"; IBTrACS names unnamed storms NOT_NAMED. */
export function stormLabel(name: string): string {
  if (name === "NOT_NAMED" || name === "UNNAMED" || name === "") return "Sans nom";
  return name
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (match) => match.toUpperCase());
}

export type Storm = {
  sid: string;
  name: string;
  season: number;
  passages: Passage[];
  /** Strongest category of its passages (of the selected island's when one is chosen). */
  category: Category | null;
};

export type StormFilters = { from: number; to: number; island: string | null; minCategory: number };

/** The storms with a passage matching the filters, most recent first. */
export function filterStorms(passages: Passage[], filters: StormFilters): Storm[] {
  const storms = new Map<string, Storm>();
  for (const passage of passages) {
    if (passage.season < filters.from || passage.season > filters.to) continue;
    if (filters.island && passage.island !== filters.island) continue;
    const storm = storms.get(passage.sid) ?? {
      sid: passage.sid,
      name: passage.name,
      season: passage.season,
      passages: [],
      category: null,
    };
    storm.passages.push(passage);
    if (categoryRank(passage.category) > categoryRank(storm.category)) storm.category = passage.category;
    storms.set(passage.sid, storm);
  }
  return [...storms.values()]
    .filter((storm) => categoryRank(storm.category) >= filters.minCategory)
    .sort((a, b) => b.season - a.season || a.name.localeCompare(b.name));
}

export type SegmentProperties = { sid: string; category: Category | null };

/**
 * A track as one line per pair of fixes, each coloured by the category of the wind at its
 * start (at its end when the start is unknown), so a line changes colour as the storm does.
 */
export function trackSegments(tracks: Track[], sids: Set<string>): FeatureCollection<LineString, SegmentProperties> {
  const features: Feature<LineString, SegmentProperties>[] = [];
  for (const track of tracks) {
    if (!sids.has(track.sid)) continue;
    for (let i = 1; i < track.points.length; i++) {
      const [lon0, lat0, wind0] = track.points[i - 1];
      const [lon1, lat1, wind1] = track.points[i];
      features.push({
        type: "Feature",
        properties: { sid: track.sid, category: categoryFromWind(wind0 ?? wind1) },
        geometry: { type: "LineString", coordinates: [[lon0, lat0], [lon1, lat1]] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export const DAY_LABELS: Record<number, string> = { [-1]: "J−1", 0: "J", 1: "J+1" };

export type PassageDay = { offset: number; label: string; rain: number | null; wind: number | null; gust: number | null };

/** The island's weather the day before, the day of and the day after the closest approach. */
export function passageDays(weather: PassageWeather[], passageId: string): PassageDay[] {
  return weather
    .filter((row) => row.passage_id === passageId && row.day_offset >= -1 && row.day_offset <= 1)
    .sort((a, b) => a.day_offset - b.day_offset)
    .map((row) => ({
      offset: row.day_offset,
      label: DAY_LABELS[row.day_offset],
      rain: row.precipitation_mm,
      wind: row.wind_max_kmh,
      gust: row.gust_max_kmh,
    }));
}

export type DecadeRow = { decade: number; label: string; total: number } & Partial<Record<Category | "Unknown", number>>;

export const DECADE_CATEGORIES = ["Unknown", ...CATEGORIES] as const;

/** Passages per decade, stacked by category, with the map's season range and island. */
export function decadeRows(passages: Passage[], filters: StormFilters): DecadeRow[] {
  const rows = new Map<number, DecadeRow>();
  for (const passage of passages) {
    if (passage.season < filters.from || passage.season > filters.to) continue;
    if (filters.island && passage.island !== filters.island) continue;
    if (categoryRank(passage.category) < filters.minCategory) continue;
    const decade = Math.floor(passage.season / 10) * 10;
    const category = passage.category ?? "Unknown";
    const row = rows.get(decade) ?? { decade, label: `${decade}`, total: 0 };
    row[category] = (row[category] ?? 0) + 1;
    row.total += 1;
    rows.set(decade, row);
  }
  return [...rows.values()].sort((a, b) => a.decade - b.decade);
}

/** First and last season of the passages. */
export function seasonRange(data: ExplorerHurricanes): [number, number] {
  const seasons = data.passages.map((passage) => passage.season);
  return seasons.length ? [Math.min(...seasons), Math.max(...seasons)] : [1851, new Date().getUTCFullYear()];
}

/** "19 sept. 2017, 01:15 UTC" from "2017-09-19 01:15:00" or "2017-09-19T01:15:00Z". */
export function formatFixTime(time: string): string {
  const day = new Date(`${time.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return time.length >= 16 ? `${day}, ${time.slice(11, 16)} UTC` : day;
}
