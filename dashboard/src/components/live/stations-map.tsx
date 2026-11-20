"use client";

import { latestTimestamp, type Stations, stationsSchema, TEMPERATURE_SCALE, temperatureColor } from "@/lib/live";

import { LiveMap, type LivePoint } from "./live-map";

const number = (value: number, digits = 1) => value.toLocaleString("fr-FR", { maximumFractionDigits: digits });

function toPoints(data: Stations): LivePoint[] {
  return data.stations.map((station) => {
    const details = [station.name];
    if (station.temperature_c !== null) details.push(`${number(station.temperature_c)} °C`);
    if (station.humidity_pct !== null) details.push(`humidité ${number(station.humidity_pct, 0)} %`);
    if (station.pressure_hpa !== null) details.push(`${number(station.pressure_hpa)} hPa`);
    if (station.pm10_ugm3 !== null) details.push(`PM10 ${number(station.pm10_ugm3, 0)} µg/m³`);
    if (station.status !== "online") details.push("hors ligne");
    return {
      id: station.station_id,
      lon: station.lon,
      lat: station.lat,
      title: details.join(" · "),
      kind: "station",
      color: temperatureColor(station.temperature_c),
    };
  });
}

const latest = (data: Stations) => latestTimestamp(data.stations.map((station) => station.ts));
const count = (data: Stations) => `${data.stations.length} station${data.stations.length > 1 ? "s" : ""}`;

function Legend() {
  const [low, high] = TEMPERATURE_SCALE;
  return (
    <span className="flex items-center gap-3 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        {low} °C
        <span
          aria-hidden="true"
          className="h-2 w-16 rounded-full"
          style={{ background: "linear-gradient(to right, var(--seq-orange-low), var(--seq-orange-high))" }}
        />
        {high} °C
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-baseline" />
        pas de mesure
      </span>
    </span>
  );
}

/** The latest reading of each station, refreshed every minute. */
export function StationsMap({ baseUrl }: { baseUrl: string | undefined }) {
  return (
    <LiveMap
      url={baseUrl ? `${baseUrl.replace(/\/$/, "")}/v1/stations` : undefined}
      schema={stationsSchema}
      intervalMs={60_000}
      label="Carte des stations météo en direct"
      toPoints={toPoints}
      latest={latest}
      count={count}
      legend={<Legend />}
    />
  );
}
