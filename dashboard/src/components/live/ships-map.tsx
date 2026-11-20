"use client";

import { latestTimestamp, type Ships, shipRotation, shipsSchema } from "@/lib/live";

import { LiveMap, type LivePoint } from "./live-map";

function toPoints(data: Ships): LivePoint[] {
  return data.ships.map((ship) => {
    const details = [ship.name ?? `MMSI ${ship.mmsi}`];
    if (ship.sog_kn !== null) details.push(`${ship.sog_kn.toLocaleString("fr-FR")} nœuds`);
    if (ship.port) details.push(`zone de ${ship.port}`);
    return {
      id: String(ship.mmsi),
      lon: ship.lon,
      lat: ship.lat,
      title: details.join(" · "),
      kind: "ship",
      rotation: shipRotation(ship),
    };
  });
}

const latest = (data: Ships) => latestTimestamp(data.ships.map((ship) => ship.ts));
const count = (data: Ships) => `${data.ships.length} navire${data.ships.length > 1 ? "s" : ""}`;

function Legend() {
  return (
    <span className="flex items-center gap-3 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M8 1 L14 15 L8 11 L2 15 Z" fill="var(--family-stream)" />
        </svg>
        cap ou route
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2 rounded-full bg-family-stream" />
        direction inconnue
      </span>
    </span>
  );
}

/** Ships seen in the last 30 minutes, refreshed every 5 seconds. */
export function ShipsMap({ baseUrl }: { baseUrl: string | undefined }) {
  return (
    <LiveMap
      url={baseUrl ? `${baseUrl.replace(/\/$/, "")}/v1/ships?since_minutes=30` : undefined}
      schema={shipsSchema}
      intervalMs={5_000}
      label="Carte des navires en direct"
      toPoints={toPoints}
      latest={latest}
      count={count}
      legend={<Legend />}
    />
  );
}
