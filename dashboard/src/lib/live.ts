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
  // Optional until the endpoint that sends them is deployed: the map reads both shapes.
  pm2_5_ugm3: z.number().nullable().optional(),
  status: z.string(),
  source: z.enum(["meteofrance", "airquality", "simulated"]).optional(),
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
  if (minutes < 1) return "il y a moins d’une minute";
  if (minutes < 60) return `il y a ${minutes} min`;
  const rest = minutes % 60;
  return `il y a ${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ""}`;
}

/** The official hourly particle stations (Gwad'Air, Madininair); the others measure the weather. */
export function isParticleStation(station: Station): boolean {
  return station.source === "airquality";
}

/**
 * PM10 bands, in µg/m³, from the WHO 2021 guidelines (15 annual, 45 daily) and the EU daily
 * limit value (50). These are daily references, shown against an hourly mean as a guide.
 */
export const PM10_BANDS = [
  { max: 15, label: "0–15" },
  { max: 45, label: "15–45" },
  { max: 50, label: "45–50" },
  { max: Infinity, label: "> 50" },
] as const;

export function pm10Band(ugm3: number | null): number | null {
  if (ugm3 === null) return null;
  return PM10_BANDS.findIndex((band) => ugm3 <= band.max);
}

export function pm10BandColor(band: number): string {
  return rampColor("orange", (band + 1) / PM10_BANDS.length);
}

export function pm10Color(ugm3: number | null): string {
  const band = pm10Band(ugm3);
  return band === null ? "var(--baseline)" : pm10BandColor(band);
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function stationCountLabel(stations: Station[]): string {
  const particles = stations.filter(isParticleStation).length;
  const weather = stations.length - particles;
  const parts = [];
  if (weather) parts.push(plural(weather, "station météo", "stations météo"));
  if (particles) parts.push(plural(particles, "station de particules", "stations de particules"));
  return parts.length ? parts.join(" · ") : "aucune station";
}

const number = (value: number, digits = 1) => value.toLocaleString("fr-FR", { maximumFractionDigits: digits });

/** One line describing the station's latest reading, for its marker's title and popup. */
export function stationDetails(station: Station, now: Date): string {
  const details = [station.name];
  if (isParticleStation(station)) {
    if (station.pm10_ugm3 !== null) details.push(`PM10 ${number(station.pm10_ugm3, 0)} µg/m³`);
    if (station.pm2_5_ugm3 != null) details.push(`PM2.5 ${number(station.pm2_5_ugm3, 0)} µg/m³`);
    details.push("moyenne horaire brute, non validée");
    if (station.ts !== null) details.push(ageLabel(new Date(station.ts), now));
  } else {
    if (station.temperature_c !== null) details.push(`${number(station.temperature_c)} °C`);
    if (station.humidity_pct !== null) details.push(`humidité ${number(station.humidity_pct, 0)} %`);
    if (station.pressure_hpa !== null) details.push(`${number(station.pressure_hpa)} hPa`);
    if (station.pm10_ugm3 !== null) details.push(`PM10 ${number(station.pm10_ugm3, 0)} µg/m³`);
  }
  if (station.status !== "online") details.push("hors ligne");
  return details.join(" · ");
}
