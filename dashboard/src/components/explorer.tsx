"use client";

import { useState } from "react";

import { ComparisonChart } from "@/components/comparison-chart";
import { DustCalendar } from "@/components/dust-calendar";
import { Ranking } from "@/components/ranking";
import { Segmented } from "@/components/segmented";
import { TownMap } from "@/components/town-map";
import { addDays, formatDay, type TownSeries } from "@/lib/analysis";
import { townColor } from "@/lib/colors";
import type { TerritoryMap } from "@/lib/geo";
import {
  type Extreme,
  measureByKey,
  type MeasureKey,
  MEASURES,
  periodHighlights,
  townStat,
} from "@/lib/measures";

export const PERIODS = [7, 14, 30] as const;
export type Period = (typeof PERIODS)[number];

type Props = { series: TownSeries[]; maps: TerritoryMap[]; end: string };

function Kpi({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-ink-secondary">{unit}</span>}
      </p>
      {detail && <p className="mt-1 text-sm text-ink-secondary">{detail}</p>}
    </div>
  );
}

function where(extreme: Extreme): string {
  return extreme.date ? `${extreme.town}, ${formatDay(extreme.date)}` : extreme.town;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <header className="space-y-1">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-ink-muted">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

export function Explorer({ series, maps, end }: Props) {
  const [measureKey, setMeasureKey] = useState<MeasureKey>("pm10");
  const [period, setPeriod] = useState<Period>(14);
  const [highlight, setHighlight] = useState<string | null>(null);

  const measure = measureByKey(measureKey);
  const colors = new Map(series.map((s, i) => [s.location.location_code, townColor(i)]));
  const stats = series.map((s) => townStat(measure, s, end, period));
  const highlights = periodHighlights(series, end, period);
  const start = addDays(end, -(period - 1));
  const range = `${formatDay(start)} – ${formatDay(end)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <Segmented
          label="Mesure"
          options={MEASURES.map((m) => ({ value: m.key, label: m.label }))}
          value={measureKey}
          onChange={setMeasureKey}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{range}</span>
          <Segmented
            label="Période"
            options={PERIODS.map((p) => ({ value: p, label: `${p} jours` }))}
            value={period}
            onChange={setPeriod}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Jours au-dessus du seuil UE PM10"
          value={String(highlights.exceedanceDays)}
          unit={`/ ${highlights.days}`}
          detail="dans au moins une ville"
        />
        <Kpi
          label="Pic de poussières le plus élevé"
          value={highlights.dustPeak ? highlights.dustPeak.value.toFixed(0) : "–"}
          unit="µg/m³"
          detail={highlights.dustPeak && where(highlights.dustPeak)}
        />
        <Kpi
          label="Ville la plus pluvieuse"
          value={highlights.wettestTown ? highlights.wettestTown.value.toFixed(0) : "–"}
          unit="mm"
          detail={highlights.wettestTown?.town}
        />
        <Kpi
          label="Plus forte chaleur"
          value={highlights.hottest ? highlights.hottest.value.toFixed(1) : "–"}
          unit="°C"
          detail={highlights.hottest && where(highlights.hottest)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title={`${measure.period} par ville`} subtitle={`${range}. Cliquez sur une ville pour son détail.`}>
          <TownMap maps={maps} stats={stats} measure={measure} highlight={highlight} onHighlight={setHighlight} />
        </Panel>
        <Panel title="Classement et tendance" subtitle={`${measure.period}, ${measure.unit}, évolution par rapport aux ${period} jours précédents`}>
          <Ranking
            stats={stats}
            colors={colors}
            measure={measure}
            period={period}
            highlight={highlight}
            onHighlight={setHighlight}
          />
        </Panel>
      </div>

      <Panel title={`${measure.daily}, toutes les villes`} subtitle={`${measure.unit}, ${range}. Survolez la légende pour isoler une ville.`}>
        <ComparisonChart
          series={series}
          colors={colors}
          measure={measure}
          end={end}
          period={period}
          highlight={highlight}
          onHighlight={setHighlight}
        />
      </Panel>

      <Panel
        title="Épisodes de poussières du Sahara"
        subtitle="Pic journalier de poussières par ville. Les poussières du Sahara traversent l’Atlantique surtout d’avril à octobre."
      >
        <DustCalendar series={series} end={end} period={period} highlight={highlight} onHighlight={setHighlight} />
      </Panel>
    </div>
  );
}
