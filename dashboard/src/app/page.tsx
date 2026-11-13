import communes from "../../data/communes.json";
import { Explorer } from "@/components/explorer";
import { allTownSeries, latestDate } from "@/lib/analysis";
import { buildTerritoryMaps, type Communes } from "@/lib/geo";
import { getMarts } from "@/lib/marts";

export default async function Home() {
  const marts = await getMarts();
  const series = allTownSeries(marts);
  const end = latestDate(series);
  // Projected on the server: the browser only receives SVG path strings, not d3 or GeoJSON.
  const maps = buildTerritoryMaps(communes as Communes, marts.locations);

  return (
    <div className="space-y-8">
      <section className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Weather and air quality in Guadeloupe and Martinique
        </h1>
        <p className="text-ink-secondary">
          Six towns, updated every morning from the Open-Meteo APIs. PM10 is compared with the
          EU daily limit of 50 µg/m³; high dust values usually mean a Saharan dust episode. Air
          quality comes from the CAMS model, not ground stations.
        </p>
      </section>

      {end ? (
        <Explorer series={series} maps={maps} end={end} />
      ) : (
        <p className="text-ink-muted">No complete day in the data yet.</p>
      )}

      <p className="text-sm text-ink-muted">
        Data exported {marts.generated_at.slice(0, 16).replace("T", " ")} UTC. Complete days only:
        the pipeline runs at 06:00 local time, so today is always partial.
      </p>
    </div>
  );
}
