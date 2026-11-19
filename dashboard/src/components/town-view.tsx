"use client";

import { useState } from "react";

import { AirQualityChart, type ChartPoint, RainChart, TemperatureChart } from "@/components/charts";
import { DustCalendar } from "@/components/dust-calendar";
import { type Period, PERIODS } from "@/components/explorer";
import { Pm10Status } from "@/components/pm10-status";
import { Segmented } from "@/components/segmented";
import { addDays, EU_PM10_DAILY_LIMIT_UGM3, formatDay, type TownSeries, windowDays } from "@/lib/analysis";
import { formatNumber, formatValue, MEASURES, townStat } from "@/lib/measures";

function cell(value: number | null | undefined, digits = 0): string {
  return value == null ? "–" : formatNumber(value, digits);
}

export function TownView({ series, end }: { series: TownSeries; end: string }) {
  const [period, setPeriod] = useState<Period>(14);
  const days = windowDays(series.days, end, period);
  const points: ChartPoint[] = days.map((day) => ({
    day: formatDay(day.date),
    tempMin: day.weather?.temp_min_c ?? null,
    tempMax: day.weather?.temp_max_c ?? null,
    rain: day.weather?.rain_total_mm ?? null,
    pm10: day.airQuality?.pm10_avg_ugm3 ?? null,
    dust: day.airQuality?.dust_max_ugm3 ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <span className="text-sm text-ink-muted">
          {formatDay(addDays(end, -(period - 1)))} – {formatDay(end)}
        </span>
        <Segmented
          label="Période"
          options={PERIODS.map((p) => ({ value: p, label: `${p} jours` }))}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MEASURES.map((measure) => {
          const stat = townStat(measure, series, end, period);
          const delta = stat.delta === null ? null : Number(stat.delta.toFixed(measure.digits));
          return (
            <div key={measure.key} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm text-ink-muted">{measure.period}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatValue(measure, stat.value)}
                <span className="ml-1 text-base font-normal text-ink-secondary">{measure.unit}</span>
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                {delta === null
                  ? "Pas de période précédente à comparer"
                  : delta === 0
                    ? `Identique aux ${period} jours précédents`
                    : `${delta > 0 ? "▲" : "▼"} ${formatNumber(Math.abs(delta), measure.digits)} vs les ${period} jours précédents`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TemperatureChart data={points} />
        <RainChart data={points} />
        <div className="lg:col-span-2">
          <AirQualityChart data={points} limit={EU_PM10_DAILY_LIMIT_UGM3} />
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <header className="space-y-1">
          <h2 className="font-semibold">Épisodes de poussières du Sahara</h2>
          <p className="text-sm text-ink-muted">Pic journalier de poussières ; ▲ marque les jours au-dessus du seuil UE pour les PM10.</p>
        </header>
        <DustCalendar series={[series]} end={end} period={period} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Valeurs journalières</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-ink-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Jour</th>
                <th className="px-3 py-2 text-right font-medium">Min. °C</th>
                <th className="px-3 py-2 text-right font-medium">Max. °C</th>
                <th className="px-3 py-2 text-right font-medium">Pluie mm</th>
                <th className="px-3 py-2 text-right font-medium">Vent max. km/h</th>
                <th className="px-3 py-2 text-right font-medium">PM10 µg/m³</th>
                <th className="px-3 py-2 text-right font-medium">Pic poussières µg/m³</th>
                <th className="px-3 py-2 font-medium">Seuil UE PM10</th>
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
