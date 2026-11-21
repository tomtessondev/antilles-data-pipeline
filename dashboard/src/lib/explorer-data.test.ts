import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import climateSample from "../../data/climate-sample.json";
import hurricanesSample from "../../data/hurricanes-sample.json";
import { climateSchema, DEFAULT_CLIMATE_URL, getClimate } from "./climate";
import { DEFAULT_HURRICANES_URL, getHurricanes, hurricanesSchema } from "./hurricanes";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("bundled samples", () => {
  it("follow the two contracts", () => {
    expect(hurricanesSchema.safeParse(hurricanesSample).error?.issues ?? []).toEqual([]);
    expect(climateSchema.safeParse(climateSample).error?.issues ?? []).toEqual([]);
  });

  it("rejects a renamed column", () => {
    const passages = hurricanesSample.passages.map(({ max_wind_kt, ...rest }) => ({ ...rest, max_wind: max_wind_kt }));
    expect(hurricanesSchema.safeParse({ ...hurricanesSample, passages }).success).toBe(false);
  });

  it("rejects an empty publication, so the sample is shown instead", () => {
    for (const key of ["tracks", "passages"] as const) {
      expect(hurricanesSchema.safeParse({ ...hurricanesSample, [key]: [] }).success, key).toBe(false);
    }
    for (const key of ["stations", "territory_anomalies"] as const) {
      expect(climateSchema.safeParse({ ...climateSample, [key]: [] }).success, key).toBe(false);
    }
  });
});

// Real exports, when given: HURRICANES_FILE / CLIMATE_FILE point at a fresh export of the
// warehouse / lakehouse, so a contract drift shows here before it reaches the site.
describe("published exports", () => {
  it.runIf(process.env.HURRICANES_FILE)("hurricanes.json follows the contract", () => {
    const document: unknown = JSON.parse(readFileSync(process.env.HURRICANES_FILE!, "utf-8"));
    expect(hurricanesSchema.safeParse(document).error?.issues.slice(0, 5) ?? []).toEqual([]);
  });

  it.runIf(process.env.CLIMATE_FILE)("climate.json follows the contract", () => {
    const document: unknown = JSON.parse(readFileSync(process.env.CLIMATE_FILE!, "utf-8"));
    expect(climateSchema.safeParse(document).error?.issues.slice(0, 5) ?? []).toEqual([]);
  });
});

describe("loaders", () => {
  it("read the public data branches by default", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    vi.stubGlobal("fetch", fetch);
    await getHurricanes();
    await getClimate();
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([DEFAULT_HURRICANES_URL, DEFAULT_CLIMATE_URL]);
  });

  it("use the URL overrides and the published data when valid", async () => {
    vi.stubEnv("HURRICANES_URL", "https://example.test/h.json");
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...hurricanesSample, generated_at: "2026-11-22T06:00:00Z" }));
    vi.stubGlobal("fetch", fetch);
    const result = await getHurricanes();
    expect(fetch).toHaveBeenCalledWith("https://example.test/h.json", expect.anything());
    expect(result).toMatchObject({ sample: false, data: { generated_at: "2026-11-22T06:00:00Z" } });
  });

  it("fall back to the samples when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await getHurricanes()).toMatchObject({ sample: true, data: { generated_at: hurricanesSample.generated_at } });
    expect(await getClimate()).toMatchObject({ sample: true, data: { generated_at: climateSample.generated_at } });
  });

  it("fall back to the samples when the data is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ generated_at: "x", stations: "none" })));
    expect((await getHurricanes()).sample).toBe(true);
    expect((await getClimate()).sample).toBe(true);
  });
});
