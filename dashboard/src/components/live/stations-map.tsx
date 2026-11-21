"use client";

import { useCallback, useState } from "react";

import {
  isParticleStation,
  latestTimestamp,
  PM10_BANDS,
  pm10BandColor,
  pm10Color,
  stationCountLabel,
  stationDetails,
  type Stations,
  stationsSchema,
  TEMPERATURE_SCALE,
  temperatureColor,
} from "@/lib/live";

import { LiveMap, type LivePoint } from "./live-map";

type Mode = "temperature" | "pm10";

const MODES: [Mode, string][] = [
  ["temperature", "Température"],
  ["pm10", "Particules PM10"],
];

const hasParticles = (data: Stations | null) => data !== null && data.stations.some(isParticleStation);

/** The chosen mode, back to temperature when the response has no particle station. */
const shown = (mode: Mode, data: Stations | null): Mode => (hasParticles(data) ? mode : "temperature");

function toPoints(data: Stations, chosen: Mode): LivePoint[] {
  const now = new Date(data.generated_at);
  const mode = shown(chosen, data);
  return data.stations.map((station) => {
    const particles = isParticleStation(station);
    const base = { id: station.station_id, lon: station.lon, lat: station.lat, title: stationDetails(station, now) };
    if (mode === "pm10") {
      return particles
        ? { ...base, kind: "station", color: pm10Color(station.pm10_ugm3) }
        : { ...base, kind: "station", color: "var(--baseline)", emphasis: "dim" };
    }
    return particles
      ? { ...base, kind: "station", color: "var(--surface)", emphasis: "outline" }
      : { ...base, kind: "station", color: temperatureColor(station.temperature_c) };
  });
}

const latest = (data: Stations) => latestTimestamp(data.stations.map((station) => station.ts));
const count = (data: Stations) => stationCountLabel(data.stations);

function Swatch({ className, background }: { className: string; background?: string }) {
  return <span aria-hidden="true" className={className} style={background ? { background } : undefined} />;
}

function Legend({ mode, particles }: { mode: Mode; particles: boolean }) {
  const [low, high] = TEMPERATURE_SCALE;
  if (mode === "pm10") {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="whitespace-nowrap">PM10 en µg/m³</span>
        {PM10_BANDS.map((band, i) => (
          <span key={band.label} className="flex items-center gap-1 whitespace-nowrap">
            <Swatch className="size-2.5 rounded-full" background={pm10BandColor(i)} />
            {band.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <Swatch className="size-2 rounded-full bg-baseline opacity-50" />
          station météo
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        {low} °C
        <Swatch
          className="h-2 w-16 rounded-full"
          background="linear-gradient(to right, var(--seq-orange-low), var(--seq-orange-high))"
        />
        {high} °C
      </span>
      <span className="flex items-center gap-1.5">
        <Swatch className="size-2 rounded-full bg-baseline" />
        pas de mesure
      </span>
      {particles ? (
        <span className="flex items-center gap-1.5">
          <Swatch className="size-2.5 rounded-full border-2 border-ink-secondary bg-surface" />
          station de particules
        </span>
      ) : null}
    </span>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div
      role="group"
      aria-label="Mesure affichée sur la carte"
      className="inline-flex self-start rounded-lg border border-border bg-surface-2 p-0.5 text-sm"
    >
      {MODES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
            mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Footnote({ mode }: { mode: Mode }) {
  return (
    <div className="space-y-1 text-xs text-ink-muted">
      {mode === "pm10" ? (
        <p>
          Repères : 15 µg/m³, valeur guide annuelle de l’OMS ; 45 µg/m³, sa valeur guide journalière ; 50 µg/m³,
          valeur limite journalière de l’Union européenne. Ce sont des moyennes sur un jour ou un an, comparées
          ici à titre indicatif à une moyenne horaire.
        </p>
      ) : null}
      <p>
        Particules : données temps réel non validées, LCSQA / INERIS (Géod’Air), produites par Gwad’Air et
        Madininair, data.gouv.fr, Licence Ouverte 2.0.
      </p>
    </div>
  );
}

/** The latest reading of each station, refreshed every minute, by temperature or by PM10. */
export function StationsMap({ baseUrl }: { baseUrl: string | undefined }) {
  const [mode, setMode] = useState<Mode>("temperature");
  const points = useCallback((data: Stations) => toPoints(data, mode), [mode]);
  const legend = useCallback(
    (data: Stations | null) => <Legend mode={shown(mode, data)} particles={hasParticles(data)} />,
    [mode],
  );
  const controls = useCallback(
    (data: Stations) => (hasParticles(data) ? <ModeToggle mode={mode} onChange={setMode} /> : null),
    [mode],
  );
  const footnote = useCallback((data: Stations) => (hasParticles(data) ? <Footnote mode={mode} /> : null), [mode]);

  return (
    <LiveMap
      url={baseUrl ? `${baseUrl.replace(/\/$/, "")}/v1/stations` : undefined}
      schema={stationsSchema}
      intervalMs={60_000}
      label="Carte des stations météo et de particules en direct"
      toPoints={points}
      latest={latest}
      count={count}
      legend={legend}
      controls={controls}
      footnote={footnote}
    />
  );
}
