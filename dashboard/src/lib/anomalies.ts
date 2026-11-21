import { divergingColor } from "./colors";
import type { ClimateRecord, Extreme, StationYear, TerritoryAnomaly } from "./climate";

/* Pure helpers of the climate explorer: no React, no MapLibre, safe in client bundles. */

export const INDICATORS = ["very_hot_days", "heavy_rain_days"] as const;
export const RECORD_INDICATORS = ["max_tx_c", "max_rr_mm", "max_fxi_ms"] as const;

export type Variable = "tx" | "rr";

/** Where each scale saturates: a monthly Tx 2 °C off its normal is already exceptional. */
export const LIMITS: Record<Variable, number> = { tx: 2, rr: 150 };

export const TERRITORY_LABELS: Record<string, string> = {
  Guadeloupe: "Guadeloupe",
  Martinique: "Martinique",
  "Saint-Barthelemy": "Saint-Barthélemy",
  "Saint-Martin": "Saint-Martin",
};

const TERRITORY_ORDER = Object.keys(TERRITORY_LABELS);

export const territoryLabel = (territory: string) => TERRITORY_LABELS[territory] ?? territory;

/** The territories present, the two main islands first. */
export function territories(rows: { territory: string }[]): string[] {
  const rank = (t: string) => (TERRITORY_ORDER.includes(t) ? TERRITORY_ORDER.indexOf(t) : TERRITORY_ORDER.length);
  return [...new Set(rows.map((row) => row.territory))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Warm in orange, cold in blue; for rain, wet in blue and dry in orange. */
export function anomalyColor(value: number | null, variable: Variable): string {
  return divergingColor(value, LIMITS[variable], variable === "tx" ? "blue" : "orange");
}

export function formatAnomaly(value: number | null, variable: Variable): string {
  if (value === null) return "pas de valeur";
  const digits = variable === "tx" ? 1 : 0;
  const text = value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: "exceptZero" });
  return `${text} ${variable === "tx" ? "°C" : "mm"}`;
}

export type HeatCell = { year: number; month: number; value: number | null };

/**
 * The year × month grid of a territory's anomaly: every year from the first to the last,
 * twelve months each, missing months as null so the grid stays regular.
 */
export function heatMapCells(rows: TerritoryAnomaly[], territory: string, variable: Variable): { years: number[]; cells: HeatCell[] } {
  const values = new Map<string, number | null>();
  for (const row of rows) {
    if (row.territory !== territory) continue;
    values.set(`${row.year}-${row.month}`, variable === "tx" ? row.tx_anomaly : row.rr_anomaly);
  }
  const known = [...values.keys()].map((key) => Number(key.split("-")[0]));
  if (!known.length) return { years: [], cells: [] };
  const [first, last] = [Math.min(...known), Math.max(...known)];
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const cells = years.flatMap((year) =>
    Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1, value: values.get(`${year}-${i + 1}`) ?? null })),
  );
  return { years, cells };
}

/**
 * The year whose months (at least 10 of them) are on average furthest above the normal,
 * leaving out `exportYear`, which is still in progress.
 */
export function warmestYear(cells: HeatCell[], exportYear: number): { year: number; mean: number } | null {
  const byYear = new Map<number, number[]>();
  for (const cell of cells) {
    if (cell.value !== null && cell.year !== exportYear) byYear.set(cell.year, [...(byYear.get(cell.year) ?? []), cell.value]);
  }
  let best: { year: number; mean: number } | null = null;
  for (const [year, values] of byYear) {
    if (values.length < 10) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (!best || mean > best.mean) best = { year, mean };
  }
  return best;
}

/** Each station's Tx anomaly in `year`. */
export function stationAnomalies(rows: StationYear[], year: number): Map<string, number> {
  return new Map(rows.filter((row) => row.year === year).map((row) => [row.station_id, row.tx_anomaly]));
}

export type ExtremeRow = { year: number } & Record<string, number | null>;

/** One row per year with each territory's mean per station, and each territory's largest panel. */
export function extremeRows(extremes: Extreme[], indicator: (typeof INDICATORS)[number]): { rows: ExtremeRow[]; panels: Record<string, number> } {
  const rows = new Map<number, ExtremeRow>();
  const panels: Record<string, number> = {};
  for (const extreme of extremes) {
    if (extreme.indicator !== indicator) continue;
    const row = rows.get(extreme.year) ?? { year: extreme.year };
    row[extreme.territory] = extreme.mean_per_station;
    row[`${extreme.territory}__panel`] = extreme.panel_size;
    rows.set(extreme.year, row);
    panels[extreme.territory] = Math.max(panels[extreme.territory] ?? 0, extreme.panel_size);
  }
  return { rows: [...rows.values()].sort((a, b) => a.year - b.year), panels };
}

/** Below this many stations, a panel's mean follows one station's quirks more than the climate. */
export const MIN_PANEL = 3;

/** The territories whose largest panel is too small for a trend. */
export function smallPanels(panels: Record<string, number>): string[] {
  return Object.keys(panels).filter((territory) => panels[territory] < MIN_PANEL);
}

const RECORD_LABELS: Record<(typeof RECORD_INDICATORS)[number], { label: string; unit: string }> = {
  max_tx_c: { label: "Tx max", unit: "°C" },
  max_rr_mm: { label: "pluie max", unit: "mm" },
  max_fxi_ms: { label: "rafale max", unit: "m/s" },
};

/** "Tx max 35,2 °C (26/09/2020)", one per record of the station, in a fixed order. */
export function recordLines(records: ClimateRecord[], stationId: string): string[] {
  return records
    .filter((record) => record.station_id === stationId)
    .sort((a, b) => RECORD_INDICATORS.indexOf(a.indicator) - RECORD_INDICATORS.indexOf(b.indicator))
    .map((record) => {
      const { label, unit } = RECORD_LABELS[record.indicator];
      const [y, m, d] = record.date.slice(0, 10).split("-");
      const value = record.value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
      return `${label} ${value} ${unit} (${d}/${m}/${y})`;
    });
}
