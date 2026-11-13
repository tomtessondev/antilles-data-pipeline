import { describe, expect, it } from "vitest";

import { addDays, dateRange, type TownDay, type TownSeries, windowDays } from "./analysis";
import { aggregate, measureByKey, periodHighlights, townStat } from "./measures";

function day(date: string, rain: number, pm10: number): TownDay {
  return {
    date,
    weather: {
      location_code: "PAP",
      observed_date: date,
      temp_min_c: 24,
      temp_max_c: 30,
      temp_avg_c: 27,
      rain_total_mm: rain,
      wind_max_kmh: 20,
      hours_observed: 24,
    },
    airQuality: {
      location_code: "PAP",
      observed_date: date,
      pm10_avg_ugm3: pm10,
      pm10_max_ugm3: pm10,
      pm2_5_avg_ugm3: 10,
      dust_max_ugm3: pm10 * 2,
      ozone_max_ugm3: 50,
      european_aqi_max: 40,
      exceeds_pm10_daily_limit: pm10 > 50,
      hours_observed: 24,
    },
  };
}

// 2026-11-01 .. 2026-11-04: rain 1, 2, 3, 4 mm; PM10 10, 20, 30, 40.
const days = [1, 2, 3, 4].map((n) => day(`2026-11-0${n}`, n, n * 10));
const series: TownSeries = {
  location: {
    location_code: "PAP",
    town: "Pointe-à-Pitre",
    territory: "Guadeloupe",
    latitude: 16.24,
    longitude: -61.53,
  },
  days,
};

describe("dates", () => {
  it("crosses month boundaries", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(dateRange("2026-11-02", 3)).toEqual(["2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("selects the current and the previous window", () => {
    expect(windowDays(days, "2026-11-04", 2).map((d) => d.date)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(windowDays(days, "2026-11-04", 2, 1).map((d) => d.date)).toEqual(["2026-11-01", "2026-11-02"]);
  });
});

describe("aggregate", () => {
  it("sums rain, averages PM10 and takes the dust peak", () => {
    expect(aggregate(measureByKey("rain"), days)).toBe(10);
    expect(aggregate(measureByKey("pm10"), days)).toBe(25);
    expect(aggregate(measureByKey("dust"), days)).toBe(80);
    expect(aggregate(measureByKey("rain"), [])).toBeNull();
  });
});

describe("townStat", () => {
  it("compares the window with the one before it", () => {
    const stat = townStat(measureByKey("rain"), series, "2026-11-04", 2);
    expect(stat.value).toBe(7);
    expect(stat.delta).toBe(4);
    expect(stat.daily).toEqual([3, 4]);
  });

  it("gives no trend when the previous window is incomplete", () => {
    expect(townStat(measureByKey("rain"), series, "2026-11-04", 3).delta).toBeNull();
  });
});

describe("periodHighlights", () => {
  it("counts days above the PM10 limit in any town and finds the extremes", () => {
    const other: TownSeries = {
      location: { ...series.location, location_code: "FDF", town: "Fort-de-France", territory: "Martinique" },
      days: [day("2026-11-03", 9, 70), day("2026-11-04", 0, 55)],
    };

    const highlights = periodHighlights([series, other], "2026-11-04", 2);

    expect(highlights.exceedanceDays).toBe(2);
    expect(highlights.dustPeak).toEqual({ value: 140, town: "Fort-de-France", date: "2026-11-03" });
    expect(highlights.wettestTown).toEqual({ value: 9, town: "Fort-de-France" });
  });
});
