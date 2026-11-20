import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ageLabel,
  fetchLive,
  latestTimestamp,
  type Ship,
  shipRotation,
  shipsSchema,
  type Station,
  stationsSchema,
  TEMPERATURE_SCALE,
  temperatureColor,
} from "./live";

const ship: Ship = {
  mmsi: 227000001,
  name: "KARUKERA",
  lat: 16.24,
  lon: -61.53,
  sog_kn: 12.3,
  cog_deg: 90,
  heading_deg: 85,
  ts: "2026-11-20T10:00:00Z",
  port: "Pointe-à-Pitre",
};

const station: Station = {
  station_id: "GP-97101001",
  name: "Le Raizet",
  territory: "Guadeloupe",
  lat: 16.26,
  lon: -61.52,
  ts: "2026-11-20T10:00:00Z",
  temperature_c: 28.4,
  humidity_pct: 74,
  pressure_hpa: 1013.2,
  pm10_ugm3: null,
  status: "online",
};

function respondWith(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchLive", () => {
  it("returns the parsed data on success", async () => {
    const body = { generated_at: "2026-11-20T10:00:05Z", ships: [ship] };
    respondWith(body);

    expect(await fetchLive("https://ais.example/v1/ships", shipsSchema)).toEqual({ ok: true, data: body });
  });

  it("fails when the endpoint does not answer in time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      ),
    );

    const result = await fetchLive("https://ais.example/v1/ships", shipsSchema, 10);

    expect(result.ok).toBe(false);
  });

  it("fails when the body does not match the schema", async () => {
    respondWith({ generated_at: "2026-11-20T10:00:05Z", stations: [{ ...station, lat: "16.26" }] });

    const result = await fetchLive("https://capteurs.example/v1/stations", stationsSchema);

    expect(result.ok).toBe(false);
  });

  it("fails on an HTTP error", async () => {
    respondWith({ detail: "down" }, 503);

    const result = await fetchLive("https://capteurs.example/v1/stations", stationsSchema);

    expect(result).toEqual({ ok: false, reason: "HTTP 503" });
  });
});

describe("shipRotation", () => {
  it("points the marker along the heading when the ship reports one", () => {
    expect(shipRotation(ship)).toBe(85);
  });

  it("falls back to the course over ground", () => {
    expect(shipRotation({ ...ship, heading_deg: null })).toBe(90);
  });

  it("has no direction when neither is known", () => {
    expect(shipRotation({ ...ship, heading_deg: null, cog_deg: null })).toBeNull();
  });
});

describe("temperatureColor", () => {
  it("is neutral without a measure", () => {
    expect(temperatureColor(null)).toBe("var(--baseline)");
  });

  it("runs from the low to the high end of the ramp, clamped", () => {
    const [low, high] = TEMPERATURE_SCALE;
    expect(temperatureColor(low - 5)).toContain("var(--seq-orange-high) 0%");
    expect(temperatureColor(high + 5)).toContain("var(--seq-orange-high) 100%");
    expect(temperatureColor((low + high) / 2)).toContain("var(--seq-orange-high) 50%");
  });
});

describe("latestTimestamp and ageLabel", () => {
  it("takes the most recent timestamp and ignores missing ones", () => {
    expect(latestTimestamp(["2026-11-20T09:00:00Z", null, "2026-11-20T10:00:00Z"])).toEqual(
      new Date("2026-11-20T10:00:00Z"),
    );
    expect(latestTimestamp([null])).toBeNull();
  });

  it("says how many whole minutes ago the data was measured", () => {
    const now = new Date("2026-11-20T10:07:40Z");
    expect(ageLabel(new Date("2026-11-20T10:00:00Z"), now)).toBe("il y a 7 min");
    expect(ageLabel(new Date("2026-11-20T10:07:20Z"), now)).toBe("il y a moins d’une minute");
  });
});
