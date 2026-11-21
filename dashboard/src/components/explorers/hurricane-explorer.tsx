"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, type TooltipContentProps, XAxis, YAxis, ResponsiveContainer } from "recharts";

import type { ExplorerHurricanes, Passage, PassageWeather } from "@/lib/hurricanes";
import {
  CATEGORY_LABELS,
  categoryColor,
  categoryRank,
  DECADE_CATEGORIES,
  decadeRows,
  filterStorms,
  formatFixTime,
  islandLabel,
  passageDays,
  seasonRange,
  type Storm,
  type StormFilters,
  stormLabel,
} from "@/lib/storms";

import { AXIS_TICK, Field, Generated, Panel, SELECT } from "./frame";
import { TrackMap } from "./track-map";

const MIN_CATEGORY_OPTIONS = [
  { value: -1, label: "Toutes" },
  { value: 1, label: "Tempête tropicale et plus" },
  { value: 2, label: "Ouragan (cat. 1 et plus)" },
  { value: 3, label: "Catégorie 2 et plus" },
  { value: 4, label: "Catégorie 3 et plus" },
  { value: 5, label: "Catégorie 4 et plus" },
  { value: 6, label: "Catégorie 5" },
];

const GUST = "color-mix(in oklab, var(--series-2) 45%, var(--surface))";

const number = (value: number | null, digits = 0) =>
  value === null ? "–" : value.toLocaleString("fr-FR", { maximumFractionDigits: digits });

function CategoryChip({ category }: { category: Storm["category"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: categoryColor(category) }} />
      {CATEGORY_LABELS[category ?? "Unknown"]}
    </span>
  );
}

function Legend() {
  return (
    <ul aria-label="Légende des catégories" className="flex flex-wrap gap-x-3 gap-y-1">
      {DECADE_CATEGORIES.map((category) => (
        <li key={category}>
          <CategoryChip category={category === "Unknown" ? null : category} />
        </li>
      ))}
    </ul>
  );
}

function WeatherTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="text-ink-secondary">
          {entry.name} : <span className="font-medium text-ink tabular-nums">{number(entry.value as number | null, 1)} {entry.unit}</span>
        </p>
      ))}
    </div>
  );
}

function PassageCard({ passage, weather }: { passage: Passage; weather: PassageWeather[] }) {
  const days = passageDays(weather, passage.passage_id);
  const spoken = days
    .map((d) => `${d.label} : pluie ${number(d.rain, 1)} mm, vent ${number(d.wind)} km/h, rafales ${number(d.gust)} km/h`)
    .join(" ; ");
  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{islandLabel(passage.island)}</p>
        <CategoryChip category={passage.category} />
      </div>
      <p className="text-sm text-ink-secondary">
        Au plus près à <span className="font-medium text-ink tabular-nums">{number(passage.closest_km)} km</span> le{" "}
        {formatFixTime(passage.closest_time)} · vent maximal dans les 100 km :{" "}
        <span className="font-medium text-ink tabular-nums">{passage.max_wind_kt === null ? "inconnu" : `${passage.max_wind_kt} nœuds`}</span>
      </p>
      {days.length ? (
        <div className="grid gap-3 sm:grid-cols-2" role="img" aria-label={`Météo de l’île autour du passage. ${spoken}.`}>
          <div>
            <p className="text-xs text-ink-muted">Pluie, mm</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" interval={0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip content={WeatherTooltip} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
                <Bar dataKey="rain" name="Pluie" unit="mm" fill="var(--series-1)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span aria-hidden="true" className="size-2 rounded-sm bg-series-2" />
              Vent max
              <span aria-hidden="true" className="size-2 rounded-sm" style={{ background: GUST }} />
              rafales, km/h
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={days} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="label" interval={0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip content={WeatherTooltip} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
                <Bar dataKey="wind" name="Vent" unit="km/h" fill="var(--series-2)" radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                <Bar
                  dataKey="gust"
                  name="Rafales"
                  unit="km/h"
                  fill={GUST}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Pas de météo pour ce passage : la réanalyse commence en 1940.</p>
      )}
    </li>
  );
}

function DecadeTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium">Années {label}</p>
      {[...payload].reverse().map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-ink-secondary">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}
          <span className="ml-auto pl-3 font-medium text-ink tabular-nums">{entry.value as number}</span>
        </p>
      ))}
    </div>
  );
}

/** The default storm: the strongest, the most recent among equals. */
function strongest(storms: Storm[]): Storm | undefined {
  return storms.reduce<Storm | undefined>(
    (best, storm) => (!best || categoryRank(storm.category) > categoryRank(best.category) ? storm : best),
    undefined,
  );
}

export function HurricaneExplorer({ data, sample }: { data: ExplorerHurricanes; sample: boolean }) {
  const [first, last] = seasonRange(data);
  const [filters, setFilters] = useState<StormFilters>({ from: Math.max(first, 1950), to: last, island: null, minCategory: 2 });
  const [picked, setPicked] = useState<string | null>(null);

  const storms = useMemo(() => filterStorms(data.passages, filters), [data.passages, filters]);
  const sids = useMemo(() => new Set(storms.map((storm) => storm.sid)), [storms]);
  const decades = useMemo(() => decadeRows(data.passages, filters), [data.passages, filters]);
  const selected = storms.find((storm) => storm.sid === picked) ?? strongest(storms);
  const seasons = Array.from({ length: last - first + 1 }, (_, i) => last - i);
  const islands = data.islands.map((island) => island.island);
  const update = (change: Partial<StormFilters>) => setFilters((current) => ({ ...current, ...change }));

  const passages = storms.reduce((total, storm) => total + storm.passages.length, 0);
  const summary =
    `${storms.length} tempête${storms.length > 1 ? "s" : ""} et ${passages} passage${passages > 1 ? "s" : ""} ` +
    `de ${filters.from} à ${filters.to}${filters.island ? `, ${islandLabel(filters.island)}` : ""}.` +
    (selected ? ` Sélection : ${stormLabel(selected.name)} ${selected.season}, ${CATEGORY_LABELS[selected.category ?? "Unknown"]}.` : "");

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filtres des tempêtes" className="flex flex-wrap items-end gap-3">
        <Field label="De la saison">
          <select className={SELECT} value={filters.from} onChange={(e) => update({ from: Math.min(Number(e.target.value), filters.to) })}>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </Field>
        <Field label="à la saison">
          <select className={SELECT} value={filters.to} onChange={(e) => update({ to: Math.max(Number(e.target.value), filters.from) })}>
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Île">
          <select className={SELECT} value={filters.island ?? ""} onChange={(e) => update({ island: e.target.value || null })}>
            <option value="">Toutes les îles</option>
            {islands.map((island) => (
              <option key={island} value={island}>
                {islandLabel(island)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie minimale">
          <select className={SELECT} value={filters.minCategory} onChange={(e) => update({ minCategory: Number(e.target.value) })}>
            {MIN_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-sm text-ink-secondary" aria-live="polite">
        {summary}
      </p>

      <figure className="space-y-2">
        <div
          role="region"
          aria-label="Carte des trajectoires des tempêtes passées à moins de 100 km des îles"
          className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-land"
        >
          <TrackMap tracks={data.tracks} islands={data.islands} sids={sids} selected={selected?.sid ?? null} onSelect={setPicked} />
        </div>
        <figcaption className="space-y-1 text-sm text-ink-muted">
          <p>Chaque segment prend la catégorie du vent à ce point de la trajectoire. Cliquez sur une trajectoire ou choisissez une tempête dans la liste.</p>
          <Legend />
        </figcaption>
      </figure>

      <div className="grid gap-4 md:grid-cols-[15rem_1fr]">
        <Panel title="Tempêtes" subtitle="La plus récente en premier">
          {storms.length ? (
            <ul aria-label="Tempêtes affichées" className="-mx-1 max-h-96 space-y-0.5 overflow-y-auto px-1">
              {storms.map((storm) => {
                const current = storm.sid === selected?.sid;
                return (
                  <li key={storm.sid}>
                    <button
                      type="button"
                      aria-pressed={current}
                      onClick={() => setPicked(storm.sid)}
                      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                        current ? "bg-ink text-page" : "hover:bg-grid"
                      }`}
                    >
                      <span>
                        {stormLabel(storm.name)} <span className={current ? "" : "text-ink-muted"}>{storm.season}</span>
                      </span>
                      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: categoryColor(storm.category) }} />
                      <span className="sr-only">{CATEGORY_LABELS[storm.category ?? "Unknown"]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">Aucune tempête ne correspond aux filtres.</p>
          )}
        </Panel>
        <Panel
          title={selected ? `${stormLabel(selected.name)}, ${selected.season}` : "Aucune tempête sélectionnée"}
          subtitle={selected ? "Ses passages à moins de 100 km des îles, et la météo de l’île la veille, le jour et le lendemain (réanalyse ERA5)." : undefined}
        >
          {selected ? (
            <ul className="space-y-3">
              {selected.passages.map((passage) => (
                <PassageCard key={passage.passage_id} passage={passage} weather={data.passage_weather} />
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>

      <Panel title="Passages par décennie" subtitle="Une tempête compte une fois par île approchée ; mêmes filtres que la carte.">
        <div role="img" aria-label={`Passages par décennie : ${decades.map((d) => `années ${d.label}, ${d.total}`).join(" ; ")}.`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={decades} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={DecadeTooltip} cursor={{ fill: "var(--grid)", opacity: 0.5 }} />
              {DECADE_CATEGORIES.map((category) => (
                <Bar
                  key={category}
                  dataKey={category}
                  name={CATEGORY_LABELS[category]}
                  stackId="decade"
                  fill={categoryColor(category)}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Generated at={data.generated_at} sample={sample} />
    </div>
  );
}
