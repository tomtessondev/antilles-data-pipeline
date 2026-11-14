import { geoMercator, geoPath } from "d3-geo";
import type { MultiPoint } from "geojson";

import communesData from "../../../../../data/communes.json";
import { type Communes, rewind } from "@/lib/geo";

import { Figure } from "./diagram";

// Same coordinates as src/ais_stream/synthetic.py in caribbean-ais-stream.
const PORTS: Record<string, [number, number]> = {
  "Pointe-à-Pitre": [-61.533, 16.229],
  "Basse-Terre": [-61.731, 15.995],
  Roseau: [-61.389, 15.297],
  "Fort-de-France": [-61.073, 14.598],
  Castries: [-60.995, 14.015],
};

type Route = { label: string; ports: string[]; color: string; dashed?: boolean };

const ROUTES: Route[] = [
  { label: "Ferry Antilles Express, 24 nœuds", ports: ["Pointe-à-Pitre", "Roseau", "Fort-de-France"], color: "var(--town-1)" },
  { label: "Cargo CMA CGM Caribe, 13 nœuds", ports: ["Basse-Terre", "Pointe-à-Pitre"], color: "var(--town-2)" },
  { label: "Paquebot Emerald Princess, 17 nœuds", ports: ["Fort-de-France", "Castries"], color: "var(--town-3)" },
  { label: "Cargo Blue Meridian, AIS coupé 45 min", ports: ["Castries", "Fort-de-France", "Roseau"], color: "var(--critical)", dashed: true },
];

const ANCHOR: [number, number] = [-61.095, 14.565]; // tanker Sea Hawk
const FISHING: [number, number] = [-61.27, 16.41]; // fishing boats off Le Moule

const WIDTH = 560;
const HEIGHT = 640;

/** The synthetic traffic, drawn on the real coastlines of Guadeloupe and Martinique. */
export function TrafficMap() {
  const communes = (communesData as Communes).features.map(rewind);
  // Fit to the ports plus a margin, so Dominica and St Lucia's ports stay in frame.
  const frame: MultiPoint = {
    type: "MultiPoint",
    coordinates: [[-62.0, 16.6], [-60.7, 13.8], ...Object.values(PORTS)],
  };
  const projection = geoMercator().fitExtent([[16, 16], [WIDTH - 16, HEIGHT - 16]], frame);
  const path = geoPath(projection).digits(1);
  const xy = (lonLat: [number, number]) => projection(lonLat) ?? [0, 0];

  return (
    <Figure
      title="Le trafic synthétique"
      caption="Les navires que génère le mode démo, sur les vrais contours de la Guadeloupe et de la Martinique (la Dominique et Sainte-Lucie ne sont pas dessinées). Un pétrolier attend au mouillage devant Fort-de-France et trois pêcheurs travaillent au large du Moule."
      minWidth={340}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto h-auto w-full max-w-xl" role="img" aria-label="Carte des routes du trafic synthétique entre les ports des Petites Antilles">
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="var(--page)" rx={6} />
        {communes.map((commune) => (
          <path key={commune.properties.code} d={path(commune) ?? ""} fill="var(--grid)" stroke="var(--baseline)" strokeWidth={0.6} />
        ))}
        {ROUTES.map((route) => (
          <polyline
            key={route.label}
            points={route.ports.map((p) => xy(PORTS[p]).join(",")).join(" ")}
            fill="none"
            stroke={route.color}
            strokeWidth={2.5}
            strokeDasharray={route.dashed ? "7 6" : undefined}
            strokeLinejoin="round"
          />
        ))}
        {Object.entries(PORTS).map(([name, lonLat]) => {
          const [x, y] = xy(lonLat);
          const left = name === "Basse-Terre" || name === "Roseau";
          return (
            <g key={name}>
              <circle cx={x} cy={y} r={5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
              <text
                x={x + (left ? -10 : 10)}
                y={y + 4}
                textAnchor={left ? "end" : "start"}
                fill="var(--ink)"
                fontSize={14}
                fontWeight={600}
                paintOrder="stroke"
                stroke="var(--page)"
                strokeWidth={4}
              >
                {name}
              </text>
            </g>
          );
        })}
        {(() => {
          const [x, y] = xy(ANCHOR);
          return (
            <g>
              <rect x={x - 5} y={y - 5} width={10} height={10} fill="var(--town-4)" transform={`rotate(45 ${x} ${y})`} />
              <text x={x + 10} y={y + 18} fill="var(--ink-secondary)" fontSize={12} paintOrder="stroke" stroke="var(--page)" strokeWidth={3}>
                pétrolier au mouillage
              </text>
            </g>
          );
        })()}
        {(() => {
          const [x, y] = xy(FISHING);
          return (
            <g>
              <circle cx={x} cy={y} r={14} fill="var(--town-5)" opacity={0.35} />
              <text x={x + 18} y={y + 4} fill="var(--ink-secondary)" fontSize={12} paintOrder="stroke" stroke="var(--page)" strokeWidth={3}>
                pêcheurs
              </text>
            </g>
          );
        })()}
      </svg>
      <ul className="grid gap-1 text-sm text-ink-secondary sm:grid-cols-2">
        {ROUTES.map((route) => (
          <li key={route.label} className="flex items-center gap-2">
            <svg width={22} height={8} aria-hidden>
              <line x1={0} y1={4} x2={22} y2={4} stroke={route.color} strokeWidth={2.5} strokeDasharray={route.dashed ? "5 4" : undefined} />
            </svg>
            {route.label}
          </li>
        ))}
      </ul>
    </Figure>
  );
}
