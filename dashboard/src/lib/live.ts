import { z } from "zod";

import { normalise, rampColor } from "./colors";

/* Contracts of the two live endpoints (caribbean-ais-stream and caribbean-sensor-pipeline). */

export const shipSchema = z.object({
  mmsi: z.number(),
  name: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  sog_kn: z.number().nullable(),
  cog_deg: z.number().nullable(),
  heading_deg: z.number().nullable(),
  ts: z.string(),
  port: z.string().nullable(),
});

export const shipsSchema = z.object({
  generated_at: z.string(),
  ships: z.array(shipSchema),
});

export const stationSchema = z.object({
  station_id: z.string(),
  name: z.string(),
  territory: z.string(),
  lat: z.number(),
  lon: z.number(),
  ts: z.string().nullable(),
  temperature_c: z.number().nullable(),
  humidity_pct: z.number().nullable(),
  pressure_hpa: z.number().nullable(),
  pm10_ugm3: z.number().nullable(),
  status: z.string(),
});

export const stationsSchema = z.object({
  generated_at: z.string(),
  stations: z.array(stationSchema),
});

export type Ship = z.infer<typeof shipSchema>;
export type Ships = z.infer<typeof shipsSchema>;
export type Station = z.infer<typeof stationSchema>;
export type Stations = z.infer<typeof stationsSchema>;

export type LiveResult<T> = { ok: true; data: T } | { ok: false; reason: string };

/** GET a live endpoint; any failure (timeout, network, HTTP, schema) becomes `ok: false`. */
export async function fetchLive<T>(url: string, schema: z.ZodType<T>, timeoutMs = 5000): Promise<LiveResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const parsed = schema.safeParse(await response.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, reason: "unexpected response" };
  } catch (error) {
    return { ok: false, reason: controller.signal.aborted ? "timeout" : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** Marker direction in degrees: the heading, else the course over ground, else none. */
export function shipRotation(ship: Ship): number | null {
  return ship.heading_deg ?? ship.cog_deg;
}

/** Ends of the temperature colour scale, in °C (typical range on the coast of the Antilles). */
export const TEMPERATURE_SCALE: [low: number, high: number] = [22, 32];

export function temperatureColor(celsius: number | null): string {
  if (celsius === null) return "var(--baseline)";
  return rampColor("orange", normalise(celsius, ...TEMPERATURE_SCALE));
}

export function latestTimestamp(timestamps: (string | null)[]): Date | null {
  const times = timestamps.filter((ts): ts is string => ts !== null).map((ts) => Date.parse(ts));
  return times.length ? new Date(Math.max(...times)) : null;
}

export function ageLabel(time: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - time.getTime()) / 60_000);
  return minutes < 1 ? "il y a moins d’une minute" : `il y a ${minutes} min`;
}
