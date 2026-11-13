import Link from "next/link";

import { Pm10Status } from "@/components/pm10-status";
import { formatDay, latestDay, locationsByTerritory, townSeries } from "@/lib/analysis";
import { getMarts } from "@/lib/marts";
import type { Location, Marts } from "@/lib/schema";

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-lg font-medium">
        {value} <span className="text-sm font-normal text-ink-secondary">{unit}</span>
      </dd>
    </div>
  );
}

function format(value: number | null | undefined, digits = 0): string {
  return value == null ? "–" : value.toFixed(digits);
}

function TownCard({ marts, location }: { marts: Marts; location: Location }) {
  const series = townSeries(marts, location.location_code);
  const day = series && latestDay(series);

  return (
    <Link
      href={`/towns/${location.location_code}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:border-ink-muted"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{location.town}</h3>
        {day && <span className="text-sm text-ink-muted">{formatDay(day.date)}</span>}
      </div>
      {day ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Stat
              label="Temperature"
              value={`${format(day.weather?.temp_min_c)}–${format(day.weather?.temp_max_c)}`}
              unit="°C"
            />
            <Stat label="Rain" value={format(day.weather?.rain_total_mm, 1)} unit="mm" />
            <Stat label="PM10 mean" value={format(day.airQuality?.pm10_avg_ugm3)} unit="µg/m³" />
            <Stat label="Dust peak" value={format(day.airQuality?.dust_max_ugm3)} unit="µg/m³" />
          </dl>
          {day.airQuality && (
            <div className="mt-3">
              <Pm10Status airQuality={day.airQuality} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">No complete day yet.</p>
      )}
    </Link>
  );
}

export default async function Home() {
  const marts = await getMarts();

  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Weather and air quality in Guadeloupe and Martinique
        </h1>
        <p className="text-ink-secondary">
          Latest complete day for each town. PM10 is compared with the EU daily limit of
          50 µg/m³; high dust values usually mean a Saharan dust episode. Air quality comes
          from the CAMS model, not ground stations.
        </p>
      </section>

      {locationsByTerritory(marts.locations).map(([territory, locations]) => (
        <section key={territory} className="space-y-3">
          <h2 className="text-lg font-semibold">{territory}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <TownCard key={location.location_code} marts={marts} location={location} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-sm text-ink-muted">
        Data exported {new Date(marts.generated_at).toISOString().slice(0, 16).replace("T", " ")}{" "}
        UTC.
      </p>
    </div>
  );
}
