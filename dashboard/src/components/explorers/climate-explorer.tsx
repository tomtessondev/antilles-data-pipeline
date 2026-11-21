"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, type TooltipContentProps, XAxis, YAxis } from "recharts";

import { type LivePoint, MapCanvas } from "@/components/live/live-map";
import { Segmented } from "@/components/segmented";
import {
  anomalyColor,
  extremeRows,
  formatAnomaly,
  heatMapCells,
  INDICATORS,
  LIMITS,
  MIN_PANEL,
  recordLines,
  smallPanels,
  stationAnomalies,
  territories,
  territoryLabel,
  type Variable,
  warmestYear,
} from "@/lib/anomalies";
import type { Climate } from "@/lib/climate";
import { townColor } from "@/lib/colors";

import { AXIS_TICK, Field, Generated, Panel, SELECT } from "./frame";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const VARIABLES: { value: Variable; label: string }[] = [
  { value: "tx", label: "Température max" },
  { value: "rr", label: "Pluie" },
];

const INDICATOR_LABELS: Record<(typeof INDICATORS)[number], { label: string; detail: string }> = {
  very_hot_days: { label: "Jours à 32 °C ou plus", detail: "jours à 32 °C ou plus par an" },
  heavy_rain_days: { label: "Jours de pluie ≥ 50 mm", detail: "jours de pluie de 50 mm ou plus par an" },
};

/** A diverging legend: cold or dry on the left, warm or wet on the right. */
function ScaleLegend({ variable }: { variable: Variable }) {
  const limit = LIMITS[variable];
  const stops = [-1, -0.5, 0, 0.5, 1].map((t) => anomalyColor(t * limit, variable));
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
      {formatAnomaly(-limit, variable)}
      <span aria-hidden="true" className="h-2 w-24 rounded-full border border-border" style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }} />
      {formatAnomaly(limit, variable)}
    </span>
  );
}

function HeatMap({ data, territory, variable }: { data: Climate; territory: string; variable: Variable }) {
  const { years, cells } = useMemo(() => heatMapCells(data.territory_anomalies, territory, variable), [data, territory, variable]);
  const warmest = variable === "tx" ? warmestYear(cells, new Date(data.generated_at).getUTCFullYear()) : null;
  const unit = variable === "tx" ? "de la température maximale" : "du cumul de pluie";
  const summary =
    `Écart mensuel ${unit} à la normale ${data.normal_period}, ${territoryLabel(territory)}, de ${years[0]} à ${years.at(-1)}.` +
    (warmest ? ` Année la plus chaude : ${warmest.year}, ${formatAnomaly(warmest.mean, "tx")} en moyenne.` : "");

  if (!years.length) return <p className="text-sm text-ink-muted">Pas de données pour ce territoire.</p>;
  return (
    <div className="space-y-2">
      <p className="sr-only">{summary}</p>
      <div className="overflow-x-auto pb-1" aria-hidden="true">
        <div
          className="grid min-w-[560px] gap-px"
          style={{ gridTemplateColumns: `1.5rem repeat(${years.length}, minmax(0, 1fr))` }}
        >
          {MONTH_INITIALS.map((initial, m) => (
            <div key={m} className="contents">
              <span className="pr-1 text-right text-[10px] leading-3 text-ink-muted">{initial}</span>
              {years.map((year, y) => {
                const cell = cells[y * 12 + m];
                return (
                  <span
                    key={year}
                    title={`${MONTHS[m]} ${year} : ${formatAnomaly(cell.value, variable)}`}
                    className="h-3 rounded-[1px]"
                    style={
                      cell.value === null
                        ? { background: "repeating-linear-gradient(45deg, var(--grid) 0 2px, transparent 2px 4px)" }
                        : { background: anomalyColor(cell.value, variable) }
                    }
                  />
                );
              })}
            </div>
          ))}
          <span />
          {years.map((year) => (
            <span key={year} className="relative h-4 text-[10px] text-ink-muted">
              {year % 10 === 0 ? <span className="absolute left-0 top-0.5">{year}</span> : null}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ScaleLegend variable={variable} />
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span aria-hidden="true" className="size-3 rounded-[1px]" style={{ background: "repeating-linear-gradient(45deg, var(--grid) 0 2px, transparent 2px 4px)" }} />
          mois incomplet
        </span>
      </div>
    </div>
  );
}

function StationMap({ data }: { data: Climate }) {
  const years = useMemo(() => [...new Set(data.station_year_anomalies.map((row) => row.year))].sort((a, b) => a - b), [data]);
  // The export's own year is still in progress: start on the last complete one.
  const exportYear = new Date(data.generated_at).getUTCFullYear();
  const [year, setYear] = useState(years.filter((y) => y < exportYear).at(-1) ?? years.at(-1) ?? exportYear);
  const values = useMemo(() => stationAnomalies(data.station_year_anomalies, year), [data, year]);
  // Only the stations with a value that year: the network grows and shrinks with the slider.
  const points = useMemo<LivePoint[]>(
    () =>
      data.stations.flatMap((station) => {
        const value = values.get(station.station_id);
        if (value === undefined) return [];
        const lines = [
          `${station.name} (${territoryLabel(station.territory)}${station.altitude_m === null ? "" : `, ${station.altitude_m} m`})`,
          `${year} : ${formatAnomaly(value, "tx")} sur la Tx`,
          ...recordLines(data.records, station.station_id).map((line) => `Record ${line}`),
        ];
        return [{ id: station.station_id, lon: station.lon, lat: station.lat, title: lines.join("\n"), kind: "anomaly", color: anomalyColor(value, "tx") }];
      }),
    [data, values, year],
  );
  const measured = points.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="climate-year" className="text-sm text-ink-secondary">
          Année
        </label>
        <input
          id="climate-year"
          type="range"
          min={years[0]}
          max={years.at(-1)}
          step={1}
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          aria-valuetext={`${year}, ${measured} stations mesurées`}
          className="w-48 accent-accent"
        />
        <output htmlFor="climate-year" className="font-semibold tabular-nums">
          {year}
        </output>
        <span className="text-sm text-ink-muted" aria-live="polite">
          {measured} station{measured > 1 ? "s" : ""} sur {data.stations.length} avec au moins 10 mois complets
        </span>
      </div>
      <div
        role="region"
        aria-label={`Carte des stations colorées selon l’écart de la température maximale à la normale en ${year}`}
        className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-land"
      >
        <MapCanvas points={points} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
        <ScaleLegend variable="tx" />
        <span className="text-xs">Cliquez sur une station pour ses records.</span>
      </div>
    </div>
  );
}

function makeExtremeTooltip(territoryNames: string[], unit: string) {
  return function ExtremeTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload as Record<string, number | null>;
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm">
        <p className="mb-1 font-medium">{label}</p>
        {territoryNames.map((territory, i) =>
          row[territory] == null ? null : (
            <p key={territory} className="flex items-center gap-2 text-ink-secondary">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: townColor(i) }} />
              {territoryLabel(territory)}
              <span className="ml-auto pl-3 font-medium text-ink tabular-nums">
                {row[territory]!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {unit}
              </span>
              <span className="text-xs text-ink-muted">({row[`${territory}__panel`]} st.)</span>
            </p>
          ),
        )}
      </div>
    );
  };
}

function ExtremesChart({ data }: { data: Climate }) {
  const [indicator, setIndicator] = useState<(typeof INDICATORS)[number]>("very_hot_days");
  const { rows, panels } = useMemo(() => extremeRows(data.extremes, indicator), [data, indicator]);
  const names = useMemo(() => territories(data.extremes.filter((extreme) => extreme.indicator === indicator)), [data, indicator]);
  const tooltip = useMemo(() => makeExtremeTooltip(names, "j"), [names]);
  const small = smallPanels(panels);
  const { detail } = INDICATOR_LABELS[indicator];

  return (
    <div className="space-y-3">
      <Segmented
        label="Indicateur"
        options={INDICATORS.map((value) => ({ value, label: INDICATOR_LABELS[value].label }))}
        value={indicator}
        onChange={setIndicator}
      />
      <ul aria-label="Territoires" className="flex flex-wrap gap-4 text-sm text-ink-secondary">
        {names.map((territory, i) => (
          <li key={territory} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`w-4 border-t-2 ${small.includes(territory) ? "border-dashed" : ""}`}
              style={{ borderColor: townColor(i) }}
            />
            {territoryLabel(territory)}
            <span className="text-ink-muted">· panel de {panels[territory]} station{panels[territory] > 1 ? "s" : ""}</span>
          </li>
        ))}
      </ul>
      {small.length ? (
        <p className="text-xs text-ink-muted">
          En pointillés : panel de moins de {MIN_PANEL} stations ({small.map(territoryLabel).join(", ")}), où une seule station fait la
          courbe ; à lire avec prudence.
        </p>
      ) : null}
      <div
        role="img"
        aria-label={`Moyenne par station du nombre de ${detail}, de ${rows[0]?.year} à ${rows.at(-1)?.year}, ${names.map(territoryLabel).join(" et ")}.`}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="year" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={tooltip} cursor={{ stroke: "var(--baseline)" }} />
            {names.map((territory, i) => (
              <Line
                key={territory}
                dataKey={territory}
                name={territoryLabel(territory)}
                stroke={townColor(i)}
                strokeWidth={2}
                strokeDasharray={small.includes(territory) ? "4 3" : undefined}
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ClimateExplorer({ data, sample }: { data: Climate; sample: boolean }) {
  const names = territories(data.territory_anomalies);
  const [territory, setTerritory] = useState(names[0] ?? "Guadeloupe");
  const [variable, setVariable] = useState<Variable>("tx");

  return (
    <div className="space-y-4">
      <Panel
        title="Mois par mois, l’écart à la normale"
        subtitle={`Moyenne des stations du territoire, chacune comparée à sa normale ${data.normal_period} du même mois. Survolez une case pour sa valeur.`}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Territoire">
            <select className={SELECT} value={territory} onChange={(event) => setTerritory(event.target.value)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {territoryLabel(name)}
                </option>
              ))}
            </select>
          </Field>
          <Segmented label="Mesure" options={VARIABLES} value={variable} onChange={setVariable} />
        </div>
        <HeatMap data={data} territory={territory} variable={variable} />
      </Panel>
      <Panel title="Les stations, année par année" subtitle="Écart annuel de la température maximale de chaque station à sa normale (au moins 10 mois complets).">
        <StationMap data={data} />
      </Panel>
      <Panel title="Les extrêmes" subtitle="Moyenne par station d’un panel de stations à longue série, pour que l’ouverture ou la fermeture de stations ne crée pas de tendance.">
        <ExtremesChart data={data} />
      </Panel>
      <Generated at={data.generated_at} sample={sample} />
    </div>
  );
}
