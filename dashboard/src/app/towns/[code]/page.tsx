import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AirQualityChart, type ChartPoint, RainChart, TemperatureChart } from "@/components/charts";
import { Pm10Status } from "@/components/pm10-status";
import { EU_PM10_DAILY_LIMIT_UGM3, formatDay, townSeries, type TownSeries } from "@/lib/analysis";
import { getMarts } from "@/lib/marts";

export async function generateStaticParams() {
  const marts = await getMarts();
  return marts.locations.map((location) => ({ code: location.location_code }));
}

async function loadTown(params: PageProps<"/towns/[code]">["params"]): Promise<TownSeries> {
  const { code } = await params;
  const series = townSeries(await getMarts(), code);
  if (!series) notFound();
  return series;
}

export async function generateMetadata(props: PageProps<"/towns/[code]">): Promise<Metadata> {
  const { location } = await loadTown(props.params);
  return { title: `${location.town}, ${location.territory}` };
}

function toChartPoints(series: TownSeries): ChartPoint[] {
  return series.days.map((day) => ({
    day: formatDay(day.date),
    tempMin: day.weather?.temp_min_c ?? null,
    tempMax: day.weather?.temp_max_c ?? null,
    rain: day.weather?.rain_total_mm ?? null,
    pm10: day.airQuality?.pm10_avg_ugm3 ?? null,
    dust: day.airQuality?.dust_max_ugm3 ?? null,
  }));
}

function cell(value: number | null | undefined, digits = 0): string {
  return value == null ? "–" : value.toFixed(digits);
}

export default async function TownPage(props: PageProps<"/towns/[code]">) {
  const series = await loadTown(props.params);
  const { location, days } = series;
  const points = toChartPoints(series);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/" className="text-sm text-ink-secondary hover:text-ink">
          ← All towns
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{location.town}</h1>
        <p className="text-ink-secondary">
          {location.territory} · {days.length} complete days
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TemperatureChart data={points} />
        <RainChart data={points} />
        <div className="lg:col-span-2">
          <AirQualityChart data={points} limit={EU_PM10_DAILY_LIMIT_UGM3} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Daily values</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-ink-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Low °C</th>
                <th className="px-3 py-2 text-right font-medium">High °C</th>
                <th className="px-3 py-2 text-right font-medium">Rain mm</th>
                <th className="px-3 py-2 text-right font-medium">Wind max km/h</th>
                <th className="px-3 py-2 text-right font-medium">PM10 µg/m³</th>
                <th className="px-3 py-2 text-right font-medium">Dust peak µg/m³</th>
                <th className="px-3 py-2 font-medium">EU PM10 limit</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{formatDay(day.date)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.weather?.temp_min_c, 1)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.weather?.temp_max_c, 1)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.weather?.rain_total_mm, 1)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.weather?.wind_max_kmh)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.airQuality?.pm10_avg_ugm3)}</td>
                  <td className="px-3 py-2 text-right">{cell(day.airQuality?.dust_max_ugm3)}</td>
                  <td className="px-3 py-2">
                    {day.airQuality ? <Pm10Status airQuality={day.airQuality} /> : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
