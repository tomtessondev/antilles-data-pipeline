import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TownView } from "@/components/town-view";
import { allTownSeries, latestDate, townSeries, type TownSeries } from "@/lib/analysis";
import { getMarts } from "@/lib/marts";

const coordinate = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateStaticParams() {
  const marts = await getMarts();
  return marts.locations.map((location) => ({ code: location.location_code }));
}

async function loadTown(params: PageProps<"/demo/[code]">["params"]): Promise<{ series: TownSeries; end?: string }> {
  const { code } = await params;
  const marts = await getMarts();
  const series = townSeries(marts, code);
  if (!series) notFound();
  // Same end date as the demo page, so periods line up between views.
  return { series, end: latestDate(allTownSeries(marts)) };
}

export async function generateMetadata(props: PageProps<"/demo/[code]">): Promise<Metadata> {
  const { series } = await loadTown(props.params);
  return { title: `${series.location.town}, ${series.location.territory}` };
}

export default async function TownPage(props: PageProps<"/demo/[code]">) {
  const { series, end } = await loadTown(props.params);
  const { location } = series;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/demo" className="text-sm text-ink-secondary hover:text-ink">
          ← Toutes les villes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{location.town}</h1>
        <p className="text-ink-secondary">
          {location.territory} · {coordinate.format(location.latitude)}°N, {coordinate.format(Math.abs(location.longitude))}°O
        </p>
      </div>
      {end ? <TownView series={series} end={end} /> : <p className="text-ink-muted">Aucune journée complète pour le moment.</p>}
    </div>
  );
}
