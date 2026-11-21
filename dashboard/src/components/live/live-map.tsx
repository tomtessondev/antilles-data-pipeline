"use client";

import type { Marker } from "maplibre-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

import { LESSER_ANTILLES, NoWebGL, useMapLibre } from "@/components/map/use-maplibre";
import { ageLabel, fetchLive } from "@/lib/live";
import { browserVisibility, poll } from "@/lib/poll";
import { reconcile } from "@/lib/reconcile";

import { LiveOffline } from "./offline";

export type LivePoint = { id: string; lon: number; lat: number; title: string } & (
  | { kind: "ship"; rotation: number | null }
  // `outline`: a station of another kind, drawn small and neutral; `dim`: set back behind the others.
  | { kind: "station"; color: string; emphasis?: "outline" | "dim" }
  // A diverging colour whose neutral middle is the surface colour: outlined in ink to stay visible.
  | { kind: "anomaly"; color: string }
);

const ARROW =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 1 L14 15 L8 11 L2 15 Z" fill="var(--family-stream)" stroke="var(--surface)" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function look(point: LivePoint): { className: string; background: string; arrow: boolean } {
  if (point.kind === "station") {
    if (point.emphasis === "outline") {
      return { className: "size-2.5 rounded-full border-2 border-ink-secondary", background: "var(--surface)", arrow: false };
    }
    if (point.emphasis === "dim") {
      return { className: "size-2.5 rounded-full border border-surface opacity-50", background: "var(--baseline)", arrow: false };
    }
    return { className: "size-3.5 rounded-full border-2 border-surface shadow-sm", background: point.color, arrow: false };
  }
  if (point.kind === "anomaly") {
    return { className: "size-4 rounded-full border-2 border-ink-secondary shadow-sm", background: point.color, arrow: false };
  }
  if (point.rotation === null) {
    return { className: "size-2.5 rounded-full border border-surface", background: "var(--family-stream)", arrow: false };
  }
  return { className: "size-4", background: "", arrow: true };
}

/**
 * Draws the point inside the marker's element, changing only what differs from the last
 * poll; maplibre owns the element's own classes.
 */
function paint(element: HTMLElement, point: LivePoint) {
  element.title = point.title;
  element.setAttribute("aria-label", point.title);
  // Set-back stations stay under the highlighted ones where markers overlap.
  element.style.zIndex = point.kind === "station" && point.emphasis ? "0" : "1";
  const shape =
    element.firstElementChild instanceof HTMLElement
      ? element.firstElementChild
      : element.appendChild(document.createElement("div"));
  const { className, background, arrow } = look(point);
  if (shape.className !== className) shape.className = className;
  shape.style.background = background;
  if (shape.dataset.arrow !== String(arrow)) {
    shape.innerHTML = arrow ? ARROW : "";
    shape.dataset.arrow = String(arrow);
  }
}

/** A MapLibre map of the Lesser Antilles with one DOM marker per point, kept in sync. */
export function MapCanvas({ points }: { points: LivePoint[] }) {
  const { container, loaded: map, unsupported } = useMapLibre(LESSER_ANTILLES);
  const markers = useRef(new Map<string, Marker>());

  useEffect(() => {
    const current = markers.current;
    return () => current.clear();
  }, []);

  useEffect(() => {
    if (!map) return;
    reconcile(markers.current, points, {
      create: (point) => {
        // The title shows on hover only; a click or a tap opens the popup, also on touch screens.
        const element = document.createElement("div");
        element.setAttribute("role", "button");
        element.style.cursor = "pointer";
        return new map.Marker({ element, rotationAlignment: "map" })
          .setLngLat([point.lon, point.lat])
          .setPopup(new map.Popup({ closeButton: false, offset: 12, maxWidth: "260px", className: "live-popup" }))
          .addTo(map.map);
      },
      update: (marker, point) => {
        marker.setLngLat([point.lon, point.lat]).setRotation(point.kind === "ship" ? (point.rotation ?? 0) : 0);
        if (marker.getElement().title !== point.title) marker.getPopup().setText(point.title);
        paint(marker.getElement(), point);
      },
      remove: (marker) => marker.remove(),
    });
  }, [map, points]);

  return (
    <div ref={container} className="size-full">
      {unsupported ? <NoWebGL /> : null}
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
  legend: ReactNode | ((data: T | null) => ReactNode);
  /** Shown above the map once data has arrived, e.g. a choice of measure. */
  controls?: (data: T) => ReactNode;
  /** Shown under the caption once data has arrived, e.g. a source attribution. */
  footnote?: (data: T) => ReactNode;
};

/** A polled live endpoint drawn on the map, with its freshness and an offline state. */
export function LiveMap<T>({
  url,
  schema,
  intervalMs,
  label,
  toPoints,
  latest,
  count,
  legend,
  controls,
  footnote,
}: Props<T>) {
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
      {data && controls ? controls(data) : null}
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
        {typeof legend === "function" ? legend(data) : legend}
      </figcaption>
      {data && footnote ? footnote(data) : null}
    </figure>
  );
}
