import { cacheLife } from "next/cache";
import { z } from "zod";

import sample from "../../data/hurricanes-sample.json";
import { fetchPublished, type Published } from "./published";
import { CATEGORIES } from "./storms";

// Contract with `hurricane-load export` (antilles-hurricane-warehouse), published daily on
// the repository's `data` branch. See docs/superpowers/specs/2026-11-21-explorers-design.md.
// Server only: the client components import types from here, values from ./storms.

export const DEFAULT_HURRICANES_URL =
  "https://raw.githubusercontent.com/tomtessondev/antilles-hurricane-warehouse/data/hurricanes.json";

const categorySchema = z.enum(CATEGORIES);

export const islandSchema = z.object({ island: z.string(), lat: z.number(), lon: z.number() });

export const passageSchema = z.object({
  passage_id: z.string(),
  sid: z.string(),
  name: z.string(),
  season: z.number().int(),
  island: z.string(),
  closest_km: z.number(),
  closest_time: z.string(),
  max_wind_kt: z.number().nullable(),
  category: categorySchema.nullable(),
});

export const passageWeatherSchema = z.object({
  passage_id: z.string(),
  date: z.string(),
  day_offset: z.number().int(),
  precipitation_mm: z.number().nullable(),
  wind_max_kmh: z.number().nullable(),
  gust_max_kmh: z.number().nullable(),
});

export const decadeSchema = z.object({
  island: z.string(),
  decade: z.number().int(),
  category: z.union([categorySchema, z.literal("Unknown")]),
  passages: z.number().int(),
});

/** One fix: longitude, latitude, wind in knots (unknown for old storms). */
export const trackPointSchema = z.tuple([z.number(), z.number(), z.number().nullable()]);

export const trackSchema = z.object({
  sid: z.string(),
  name: z.string(),
  season: z.number().int(),
  points: z.array(trackPointSchema),
});

export const hurricanesSchema = z.object({
  generated_at: z.string(),
  islands: z.array(islandSchema),
  passages: z.array(passageSchema),
  passage_weather: z.array(passageWeatherSchema),
  by_decade: z.array(decadeSchema),
  tracks: z.array(trackSchema),
});

export type Category = z.infer<typeof categorySchema>;
export type Island = z.infer<typeof islandSchema>;
export type Passage = z.infer<typeof passageSchema>;
export type PassageWeather = z.infer<typeof passageWeatherSchema>;
export type DecadeCount = z.infer<typeof decadeSchema>;
export type Track = z.infer<typeof trackSchema>;
export type Hurricanes = z.infer<typeof hurricanesSchema>;

/** The warehouse export, or the bundled sample when it cannot be read. */
export async function getHurricanes(): Promise<Published<Hurricanes>> {
  "use cache";
  const result = await fetchPublished(process.env.HURRICANES_URL || DEFAULT_HURRICANES_URL, hurricanesSchema, sample);
  // The export is rebuilt daily; a failed read is retried sooner.
  if (result.sample) cacheLife("minutes");
  else cacheLife("hours");
  return result;
}
