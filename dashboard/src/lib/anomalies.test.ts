import { describe, expect, it } from "vitest";

import {
  anomalyColor,
  cellLabel,
  extremeRows,
  formatAnomaly,
  heatMapCells,
  moveInGrid,
  recordLines,
  smallPanels,
  stationAnomalies,
  territories,
  warmestYear,
  yearlyMeans,
} from "./anomalies";
import type { TerritoryAnomaly } from "./climate";

function anomaly(year: number, month: number, tx: number | null, territory = "Martinique"): TerritoryAnomaly {
  return { territory, year, month, tx_anomaly: tx, rr_anomaly: tx === null ? null : tx * -100, tx_stations: 3, rr_stations: 3 };
}

describe("heatMapCells", () => {
  const rows = [anomaly(2022, 3, 0.5), anomaly(2024, 1, 1.2), anomaly(2024, 2, null), anomaly(2023, 6, 9, "Guadeloupe")];

  it("fills every year and month between the first and last, for one territory", () => {
    const { years, cells } = heatMapCells(rows, "Martinique", "tx");
    expect(years).toEqual([2022, 2023, 2024]);
    expect(cells).toHaveLength(36);
    expect(cells[2]).toEqual({ year: 2022, month: 3, value: 0.5 });
    expect(cells[24]).toEqual({ year: 2024, month: 1, value: 1.2 });
    expect(cells.filter((cell) => cell.value !== null)).toHaveLength(2);
  });

  it("reads the rain anomaly when asked", () => {
    expect(heatMapCells(rows, "Martinique", "rr").cells[2].value).toBe(-50);
  });

  it("is empty for an unknown territory", () => {
    expect(heatMapCells(rows, "Mars", "tx")).toEqual({ years: [], cells: [] });
  });
});

describe("warmestYear", () => {
  it("needs at least ten months to rate a year", () => {
    const full = Array.from({ length: 12 }, (_, i) => anomaly(2024, i + 1, 1));
    const partial = [anomaly(2025, 1, 3), anomaly(2025, 2, 3)];
    const { cells } = heatMapCells([...full, ...partial], "Martinique", "tx");
    expect(warmestYear(cells, 2026)).toEqual({ year: 2024, mean: 1 });
  });

  it("leaves out the export's own year, still in progress", () => {
    const year = (y: number, tx: number) => Array.from({ length: 12 }, (_, i) => anomaly(y, i + 1, tx));
    const { cells } = heatMapCells([...year(2024, 1), ...year(2025, 2)], "Martinique", "tx");
    expect(warmestYear(cells, 2025)).toEqual({ year: 2024, mean: 1 });
  });
});

describe("anomalyColor and formatAnomaly", () => {
  it("puts warm months on the orange side and dry months on the orange side too", () => {
    expect(anomalyColor(1, "tx")).toBe("color-mix(in oklab, var(--seq-orange-high) 50%, var(--surface))");
    expect(anomalyColor(-150, "rr")).toBe("color-mix(in oklab, var(--seq-orange-high) 100%, var(--surface))");
    expect(anomalyColor(75, "rr")).toBe("color-mix(in oklab, var(--seq-blue-high) 50%, var(--surface))");
  });

  it("formats with a sign and the unit", () => {
    expect(formatAnomaly(1.234, "tx")).toBe("+1,2 °C");
    expect(formatAnomaly(-42.4, "rr")).toBe("-42 mm");
    expect(formatAnomaly(null, "tx")).toBe("pas de valeur");
  });
});

describe("territories", () => {
  it("lists the main islands first", () => {
    expect(territories([{ territory: "Saint-Martin" }, { territory: "Martinique" }, { territory: "Guadeloupe" }, { territory: "Martinique" }])).toEqual([
      "Guadeloupe",
      "Martinique",
      "Saint-Martin",
    ]);
  });
});

describe("stationAnomalies", () => {
  it("keeps the selected year", () => {
    const rows = [
      { station_id: "A", year: 2023, tx_anomaly: 0.4, months: 12 },
      { station_id: "A", year: 2024, tx_anomaly: 1.1, months: 11 },
    ];
    expect([...stationAnomalies(rows, 2024)]).toEqual([["A", 1.1]]);
  });
});

describe("extremeRows", () => {
  it("pivots territories into columns and keeps the largest panel", () => {
    const { rows, panels } = extremeRows(
      [
        { territory: "Martinique", year: 2024, indicator: "very_hot_days", panel_size: 4, mean_per_station: 9.5 },
        { territory: "Guadeloupe", year: 2024, indicator: "very_hot_days", panel_size: 2, mean_per_station: 1 },
        { territory: "Martinique", year: 2023, indicator: "very_hot_days", panel_size: 3, mean_per_station: 6 },
        { territory: "Martinique", year: 2023, indicator: "heavy_rain_days", panel_size: 9, mean_per_station: 3 },
      ],
      "very_hot_days",
    );
    expect(rows.map((row) => [row.year, row.Martinique, row.Guadeloupe ?? null])).toEqual([
      [2023, 6, null],
      [2024, 9.5, 1],
    ]);
    expect(panels).toEqual({ Martinique: 4, Guadeloupe: 2 });
  });
});

describe("recordLines", () => {
  it("lists a station's records in a fixed order, French formatted", () => {
    const lines = recordLines(
      [
        { station_id: "A", territory: "Martinique", indicator: "max_rr_mm", value: 312.4, date: "2010-10-30" },
        { station_id: "A", territory: "Martinique", indicator: "max_tx_c", value: 35.2, date: "2020-09-26" },
        { station_id: "B", territory: "Martinique", indicator: "max_tx_c", value: 34, date: "2020-09-26" },
      ],
      "A",
    );
    expect(lines).toEqual(["Tx max 35,2 °C (26/09/2020)", "pluie max 312,4 mm (30/10/2010)"]);
  });
});

describe("smallPanels", () => {
  it("lists the territories whose panel has fewer than 3 stations", () => {
    expect(smallPanels({ Guadeloupe: 5, Martinique: 3, "Saint-Martin": 1, "Saint-Barthelemy": 2 })).toEqual(["Saint-Martin", "Saint-Barthelemy"]);
  });
});

describe("heat map reading", () => {
  it("names a cell's month and value", () => {
    expect(cellLabel({ year: 2024, month: 9, value: 1.26 }, "tx")).toBe("sept. 2024 : +1,3 °C");
    expect(cellLabel({ year: 2024, month: 2, value: -42.4 }, "rr")).toBe("févr. 2024 : -42 mm");
    expect(cellLabel({ year: 2024, month: 12, value: null }, "tx")).toBe("déc. 2024 : pas de valeur");
  });

  it("moves through the grid like it is drawn: years across, months down, clamped at the edges", () => {
    // Three years: cell index = year index × 12 + month index.
    const march2023 = 12 + 2;
    expect(moveInGrid(march2023, "ArrowRight", 3)).toBe(24 + 2);
    expect(moveInGrid(march2023, "ArrowLeft", 3)).toBe(2);
    expect(moveInGrid(march2023, "ArrowDown", 3)).toBe(12 + 3);
    expect(moveInGrid(march2023, "ArrowUp", 3)).toBe(12 + 1);
    expect(moveInGrid(march2023, "Home", 3)).toBe(2);
    expect(moveInGrid(march2023, "End", 3)).toBe(24 + 2);
    expect(moveInGrid(24 + 2, "ArrowRight", 3)).toBe(24 + 2);
    expect(moveInGrid(0, "ArrowUp", 3)).toBe(0);
    expect(moveInGrid(11, "ArrowDown", 3)).toBe(11);
    expect(moveInGrid(0, "Enter", 3)).toBeNull();
  });

  it("averages each year's measured months", () => {
    const { cells } = heatMapCells([anomaly(2022, 1, 1), anomaly(2022, 2, 2), anomaly(2024, 5, -0.5)], "Martinique", "tx");
    expect(yearlyMeans(cells)).toEqual([
      { year: 2022, mean: 1.5, months: 2 },
      { year: 2023, mean: null, months: 0 },
      { year: 2024, mean: -0.5, months: 1 },
    ]);
  });
});
