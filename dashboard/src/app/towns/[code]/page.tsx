import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TownView } from "@/components/town-view";
import { allTownSeries, latestDate, townSeries, type TownSeries } from "@/lib/analysis";
import { getMarts } from "@/lib/marts";

export async function generateStaticParams() {
  const marts = await getMarts();
  return marts.locations.map((location) => ({ code: location.location_code }));
}

async function loadTown(params: PageProps<"/towns/[code]">["params"]): Promise<{ series: TownSeries; end?: string }> {
  const { code } = await params;
  const marts = await getMarts();
  const series = townSeries(marts, code);
  if (!series) notFound();
  // Same end date as the home page, so periods line up between views.
  return { series, end: latestDate(allTownSeries(marts)) };
}

export async function generateMetadata(props: PageProps<"/towns/[code]">): Promise<Metadata> {
  const { series } = await loadTown(props.params);
  return { title: `${series.location.town}, ${series.location.territory}` };
}

export default async function TownPage(props: PageProps<"/towns/[code]">) {
  const { series, end } = await loadTown(props.params);
  const { location } = series;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/" className="text-sm text-ink-secondary hover:text-ink">
          ← All towns
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{location.town}</h1>
        <p className="text-ink-secondary">
          {location.territory} · {location.latitude.toFixed(2)}°N, {Math.abs(location.longitude).toFixed(2)}°W
        </p>
      </div>
      {end ? <TownView series={series} end={end} /> : <p className="text-ink-muted">No complete day yet.</p>}
    </div>
  );
}
