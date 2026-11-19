import Link from "next/link";

import communes from "../../../data/communes.json";
import { Explorer } from "@/components/explorer";
import { allTownSeries, latestDate } from "@/lib/analysis";
import { buildTerritoryMaps, type Communes } from "@/lib/geo";
import { getMarts } from "@/lib/marts";

const EXPORTED = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" });

export default async function DemoPage() {
  const marts = await getMarts();
  const series = allTownSeries(marts);
  const end = latestDate(series);
  // Projected on the server: the browser only receives SVG path strings, not d3 or GeoJSON.
  const maps = buildTerritoryMaps(communes as Communes, marts.locations);

  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Météo et qualité de l’air en Guadeloupe et en Martinique
        </h1>
        <p className="text-ink-secondary">
          Démo en ligne du{" "}
          <Link href="/projets/antilles-data-pipeline" className="underline underline-offset-2">
            projet batch
          </Link>
          . Six villes, mises à jour chaque matin depuis les API Open-Meteo. Les PM10 sont comparées
          au seuil journalier UE de 50 µg/m³ ; des valeurs de poussières élevées signalent
          généralement un épisode de poussières du Sahara. La qualité de l’air vient du modèle
          CAMS, pas de stations au sol.
        </p>
      </section>

      {end ? (
        <Explorer series={series} maps={maps} end={end} />
      ) : (
        <p className="text-ink-muted">Aucune journée complète dans les données pour le moment.</p>
      )}

      <p className="text-sm text-ink-muted">
        Données exportées le {EXPORTED.format(new Date(marts.generated_at))} UTC. Journées
        complètes uniquement : le pipeline s’exécute à 6 h, heure locale, donc la journée en cours
        est toujours partielle.
      </p>
    </div>
  );
}
