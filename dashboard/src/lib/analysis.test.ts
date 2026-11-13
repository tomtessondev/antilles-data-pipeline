import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import sample from "../../data/sample.json";
import { formatDay, latestDay, locationsByTerritory, townSeries } from "./analysis";
import { type Marts, martsSchema } from "./schema";

const location = {
  location_code: "PAP",
  town: "Pointe-à-Pitre",
  territory: "Guadeloupe" as const,
  latitude: 16.24,
  longitude: -61.53,
};

function weather(date: string, hours = 24) {
  return {
    location_code: "PAP",
    observed_date: date,
    temp_min_c: 24,
    temp_max_c: 30,
    temp_avg_c: 27,
    rain_total_mm: 1.2,
    wind_max_kmh: 20,
    hours_observed: hours,
  };
}

const marts: Marts = {
  generated_at: "2026-11-05T10:00:00+00:00",
  locations: [location],
  weather: [weather("2026-11-04"), weather("2026-11-03"), weather("2026-11-05", 6)],
  air_quality: [
    {
      location_code: "PAP",
      observed_date: "2026-11-03",
      pm10_avg_ugm3: 62,
      pm10_max_ugm3: 80,
      pm2_5_avg_ugm3: 12,
      dust_max_ugm3: 140,
      ozone_max_ugm3: 50,
      european_aqi_max: 70,
      exceeds_pm10_daily_limit: true,
      hours_observed: 24,
    },
  ],
};

describe("townSeries", () => {
  it("keeps complete days only, oldest first, and joins air quality by date", () => {
    const series = townSeries(marts, "PAP");

    expect(series?.days.map((d) => d.date)).toEqual(["2026-11-03", "2026-11-04"]);
    expect(series?.days[0].airQuality?.exceeds_pm10_daily_limit).toBe(true);
    expect(series?.days[1].airQuality).toBeUndefined();
    expect(latestDay(series!)?.date).toBe("2026-11-04");
  });

  it("returns undefined for an unknown town", () => {
    expect(townSeries(marts, "XXX")).toBeUndefined();
  });
});

describe("locationsByTerritory", () => {
  it("groups towns by territory, both sorted by name", () => {
    const groups = locationsByTerritory([
      { ...location, location_code: "SAN", town: "Sainte-Anne", territory: "Martinique" },
      { ...location, location_code: "MOU", town: "Le Moule" },
      location,
    ]);

    expect(groups.map(([territory, towns]) => [territory, towns.map((t) => t.town)])).toEqual([
      ["Guadeloupe", ["Le Moule", "Pointe-à-Pitre"]],
      ["Martinique", ["Sainte-Anne"]],
    ]);
  });
});

describe("formatDay", () => {
  it("formats the calendar day without shifting it to the local timezone", () => {
    expect(formatDay("2026-11-01")).toBe("1 Nov");
  });
});

describe("martsSchema", () => {
  it("accepts the bundled sample exported by the pipeline", () => {
    expect(martsSchema.safeParse(sample).success).toBe(true);
  });

  // CI sets MARTS_FILE to a fresh `antilles-pipeline export` of the dbt build, so a
  // change on the Python side that breaks the dashboard fails the pull request.
  it.runIf(process.env.MARTS_FILE)("accepts a fresh export from the pipeline", () => {
    const document: unknown = JSON.parse(readFileSync(process.env.MARTS_FILE!, "utf-8"));
    const result = martsSchema.safeParse(document);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it("rejects a document whose columns were renamed", () => {
    const renamed = { ...marts, weather: [{ ...weather("2026-11-03"), rain_mm: 1, rain_total_mm: undefined }] };
    expect(martsSchema.safeParse(renamed).success).toBe(false);
  });
});
