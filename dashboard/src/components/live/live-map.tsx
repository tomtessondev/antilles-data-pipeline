"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

import { ageLabel, fetchLive } from "@/lib/live";
import { browserVisibility, poll } from "@/lib/poll";

import { LiveOffline } from "./offline";

export type LivePoint = { id: string; lon: number; lat: number; title: string } & (
  | { kind: "ship"; rotation: number | null }
  | { kind: "station"; color: string }
);

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const DARK = "(prefers-color-scheme: dark)";
// Grenada to Anguilla: the Lesser Antilles, Guadeloupe and Martinique in the middle.
const LESSER_ANTILLES: [[number, number], [number, number]] = [
  [-63.4, 11.9],
  [-59.4, 18.4],
];

const ARROW =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1 L14 15 L8 11 L2 15 Z" fill="var(--family-stream)" stroke="var(--surface)" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/** Draws the point inside the marker's element; maplibre owns the element's own classes. */
function paint(element: HTMLElement, point: LivePoint) {
  element.title = point.title;
  const shape = document.createElement("div");
  if (point.kind === "station") {
    shape.className = "size-3.5 rounded-full border-2 border-surface shadow-sm";
    shape.style.background = point.color;
  } else if (point.rotation === null) {
    shape.className = "size-2.5 rounded-full border border-surface";
    shape.style.background = "var(--family-stream)";
  } else {
    shape.className = "size-4";
    shape.innerHTML = ARROW;
  }
  element.replaceChildren(shape);
}

/** A MapLibre map of the Lesser Antilles with one DOM marker per point, kept in sync. */
function MapCanvas({ points }: { points: LivePoint[] }) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef(new Map<string, Marker>());
  const [map, setMap] = useState<{ map: MapLibreMap; Marker: typeof Marker } | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    const scheme = window.matchMedia(DARK);
    const onScheme = () => instance?.setStyle(scheme.matches ? STYLES.dark : STYLES.light);

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current) return;
      // The bundled copy of maplibre cannot locate its worker from import.meta.url.
      maplibre.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
      try {
        instance = new maplibre.Map({
          container: container.current,
          style: scheme.matches ? STYLES.dark : STYLES.light,
          bounds: LESSER_ANTILLES,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
      } catch {
        // No WebGL in this browser.
        setUnsupported(true);
        return;
      }
      instance.touchZoomRotate.disableRotation();
      scheme.addEventListener("change", onScheme);
      setMap({ map: instance, Marker: maplibre.Marker });
    });

    const current = markers.current;
    return () => {
      cancelled = true;
      scheme.removeEventListener("change", onScheme);
      current.clear();
      instance?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    const seen = new Set<string>();
    for (const point of points) {
      seen.add(point.id);
      let marker = markers.current.get(point.id);
      if (!marker) {
        marker = new map.Marker({ element: document.createElement("div"), rotationAlignment: "map" })
          .setLngLat([point.lon, point.lat])
          .addTo(map.map);
        markers.current.set(point.id, marker);
      }
      marker.setLngLat([point.lon, point.lat]).setRotation(point.kind === "ship" ? (point.rotation ?? 0) : 0);
      paint(marker.getElement(), point);
    }
    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }, [map, points]);

  return (
    <div ref={container} className="size-full">
      {unsupported ? (
        <p className="p-4 text-sm text-ink-secondary">Carte indisponible : ce navigateur ne prend pas en charge WebGL.</p>
      ) : null}
    </div>
  );
}

type LiveState<T> = { data: T | null; lastOk: Date | null; failed: boolean; now: Date | null };

function useLive<T>(url: string | undefined, schema: z.ZodType<T>, intervalMs: number): LiveState<T> {
  const [state, setState] = useState<LiveState<T>>({ data: null, lastOk: null, failed: false, now: null });

  useEffect(() => {
    if (!url) return;
    return poll(
      () => fetchLive(url, schema),
      (result) => {
        const now = new Date();
        setState((previous) =>
          result.ok ? { data: result.data, lastOk: now, failed: false, now } : { ...previous, failed: true, now },
        );
      },
      intervalMs,
      browserVisibility,
    );
  }, [url, schema, intervalMs]);

  return state;
}

type Props<T> = {
  /** Full endpoint URL; undefined while the service is not deployed. */
  url: string | undefined;
  schema: z.ZodType<T>;
  intervalMs: number;
  label: string;
  toPoints: (data: T) => LivePoint[];
  /** Time of the most recent measure in the response. */
  latest: (data: T) => Date | null;
  /** What the map shows, e.g. "42 navires". */
  count: (data: T) => string;
  legend: ReactNode;
};

/** A polled live endpoint drawn on the map, with its freshness and an offline state. */
export function LiveMap<T>({ url, schema, intervalMs, label, toPoints, latest, count, legend }: Props<T>) {
  const { data, lastOk, failed, now } = useLive(url, schema, intervalMs);
  const points = useMemo(() => (data ? toPoints(data) : []), [data, toPoints]);

  const measured = data ? latest(data) : null;
  let status = "Connexion à la démo…";
  if (!url) status = "En attente du déploiement du service.";
  else if (data && measured && now) status = `Dernière donnée : ${ageLabel(measured, now)} · ${count(data)}`;
  else if (data) status = `Aucune donnée récente · ${count(data)}`;
  else if (failed) status = "Pas de réponse du service.";

  return (
    <figure className="flex flex-col gap-3">
      <div
        role="region"
        aria-label={label}
        className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-land"
      >
        <MapCanvas points={points} />
        {!url || failed ? (
          <div className="absolute inset-x-3 top-3 z-10 sm:right-auto sm:max-w-sm">
            <LiveOffline reason={url ? "down" : "soon"} lastOk={lastOk} />
          </div>
        ) : null}
      </div>
      <figcaption className="flex flex-col gap-2 text-sm text-ink-secondary sm:flex-row sm:items-center sm:justify-between">
        <span aria-live="polite">{status}</span>
        {legend}
      </figcaption>
    </figure>
  );
}
