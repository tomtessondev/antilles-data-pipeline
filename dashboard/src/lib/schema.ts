import { z } from "zod";

// Contract with `antilles-pipeline export`: one document holding every dbt mart.
// Parsing at the boundary means a renamed column fails the build, not a chart.

const isoDate = z.iso.date();

export const locationSchema = z.object({
  location_code: z.string(),
  town: z.string(),
  territory: z.enum(["Guadeloupe", "Martinique"]),
  latitude: z.number(),
  longitude: z.number(),
});

export const dailyWeatherSchema = z.object({
  location_code: z.string(),
  observed_date: isoDate,
  temp_min_c: z.number().nullable(),
  temp_max_c: z.number().nullable(),
  temp_avg_c: z.number().nullable(),
  rain_total_mm: z.number(),
  wind_max_kmh: z.number().nullable(),
  hours_observed: z.number().int(),
});

export const dailyAirQualitySchema = z.object({
  location_code: z.string(),
  observed_date: isoDate,
  pm10_avg_ugm3: z.number().nullable(),
  pm10_max_ugm3: z.number().nullable(),
  pm2_5_avg_ugm3: z.number().nullable(),
  dust_max_ugm3: z.number().nullable(),
  ozone_max_ugm3: z.number().nullable(),
  european_aqi_max: z.number().int().nullable(),
  exceeds_pm10_daily_limit: z.boolean(),
  hours_observed: z.number().int(),
});

export const martsSchema = z.object({
  generated_at: z.iso.datetime({ offset: true }),
  locations: z.array(locationSchema),
  weather: z.array(dailyWeatherSchema),
  air_quality: z.array(dailyAirQualitySchema),
});

export type Location = z.infer<typeof locationSchema>;
export type DailyWeather = z.infer<typeof dailyWeatherSchema>;
export type DailyAirQuality = z.infer<typeof dailyAirQualitySchema>;
export type Marts = z.infer<typeof martsSchema>;
