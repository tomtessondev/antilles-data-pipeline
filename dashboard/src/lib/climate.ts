import { cacheLife } from "next/cache";
import { z } from "zod";

import sample from "../../data/climate-sample.json";
import { INDICATORS, RECORD_INDICATORS } from "./anomalies";
import { fetchPublished, type Published } from "./published";

// Contract with the `export` step of antilles-climate-lakehouse, published monthly on the
// repository's `data` branch. See docs/superpowers/specs/2026-11-21-explorers-design.md.
// Server only: the client components import types from here, values from ./anomalies.

export const DEFAULT_CLIMATE_URL =
  "https://raw.githubusercontent.com/tomtessondev/antilles-climate-lakehouse/data/climate.json";

export const stationSchema = z.object({
  station_id: z.string(),
  name: z.string(),
  territory: z.string(),
  lat: z.number(),
  lon: z.number(),
  altitude_m: z.number().nullable(),
  first_year: z.number().int(),
  last_year: z.number().int(),
});

export const territoryAnomalySchema = z.object({
  territory: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  tx_anomaly: z.number().nullable(),
  rr_anomaly: z.number().nullable(),
  tx_stations: z.number().int(),
  rr_stations: z.number().int(),
});

export const stationYearSchema = z.object({
  station_id: z.string(),
  year: z.number().int(),
  tx_anomaly: z.number(),
  months: z.number().int(),
});

export const extremeSchema = z.object({
  territory: z.string(),
  year: z.number().int(),
  indicator: z.enum(INDICATORS),
  panel_size: z.number().int(),
  mean_per_station: z.number().nullable(),
});

export const recordSchema = z.object({
  station_id: z.string(),
  territory: z.string(),
  indicator: z.enum(RECORD_INDICATORS),
  value: z.number(),
  date: z.string(),
});

export const climateSchema = z.object({
  generated_at: z.string(),
  normal_period: z.string(),
  stations: z.array(stationSchema),
  territory_anomalies: z.array(territoryAnomalySchema),
  station_year_anomalies: z.array(stationYearSchema),
  extremes: z.array(extremeSchema),
  records: z.array(recordSchema),
});

export type ClimateStation = z.infer<typeof stationSchema>;
export type TerritoryAnomaly = z.infer<typeof territoryAnomalySchema>;
export type StationYear = z.infer<typeof stationYearSchema>;
export type Indicator = (typeof INDICATORS)[number];
export type Extreme = z.infer<typeof extremeSchema>;
export type ClimateRecord = z.infer<typeof recordSchema>;
export type Climate = z.infer<typeof climateSchema>;

/** The lakehouse export, or the bundled sample when it cannot be read. */
export async function getClimate(): Promise<Published<Climate>> {
  "use cache";
  const result = await fetchPublished(process.env.CLIMATE_URL || DEFAULT_CLIMATE_URL, climateSchema, sample);
  // The export is rebuilt monthly; a failed read is retried sooner.
  if (result.sample) cacheLife("minutes");
  else cacheLife("hours");
  return result;
}
