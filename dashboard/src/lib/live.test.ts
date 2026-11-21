import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ageLabel,
  fetchLive,
  isParticleStation,
  latestTimestamp,
  PM10_BANDS,
  pm10Band,
  pm10Color,
  type Ship,
  shipRotation,
  shipsSchema,
  type Station,
  stationCountLabel,
  stationDetails,
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

const particles: Station = {
  station_id: "GP-37006",
  name: "Pointe-à-Pitre Victoire",
  territory: "Guadeloupe",
  lat: 16.24,
  lon: -61.53,
  ts: "2026-11-20T08:00:00Z",
  temperature_c: null,
  humidity_pct: null,
  pressure_hpa: null,
  pm10_ugm3: 23.4,
  pm2_5_ugm3: 9.2,
  status: "online",
  source: "airquality",
};

describe("stationsSchema", () => {
  it("accepts the shape without source and PM2.5 (endpoint not yet redeployed)", () => {
    const parsed = stationsSchema.safeParse({ generated_at: "2026-11-20T10:00:05Z", stations: [station] });
    expect(parsed.success).toBe(true);
  });

  it("accepts the shape with source and PM2.5", () => {
    const parsed = stationsSchema.safeParse({
      generated_at: "2026-11-20T10:00:05Z",
      stations: [{ ...station, pm2_5_ugm3: null, source: "meteofrance" }, particles],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown source", () => {
    const parsed = stationsSchema.safeParse({
      generated_at: "2026-11-20T10:00:05Z",
      stations: [{ ...particles, source: "satellite" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("isParticleStation", () => {
  it("is true only for the official air-quality stations", () => {
    expect(isParticleStation(particles)).toBe(true);
    expect(isParticleStation(station)).toBe(false);
    expect(isParticleStation({ ...station, source: "meteofrance" })).toBe(false);
    expect(isParticleStation({ ...station, source: "simulated" })).toBe(false);
  });
});

describe("pm10Band and pm10Color", () => {
  it("places a value against the WHO and EU references, bounds included in the lower band", () => {
    expect(pm10Band(0)).toBe(0);
    expect(pm10Band(15)).toBe(0);
    expect(pm10Band(15.1)).toBe(1);
    expect(pm10Band(45)).toBe(1);
    expect(pm10Band(48)).toBe(2);
    expect(pm10Band(50)).toBe(2);
    expect(pm10Band(50.1)).toBe(3);
    expect(pm10Band(320)).toBe(3);
    expect(pm10Band(null)).toBeNull();
  });

  it("has one band per reference, ending above the EU daily limit", () => {
    expect(PM10_BANDS.map((band) => band.max)).toEqual([15, 45, 50, Infinity]);
  });

  it("darkens band by band and is neutral without a measure", () => {
    expect(pm10Color(null)).toBe("var(--baseline)");
    const colors = [5, 30, 48, 80].map(pm10Color);
    expect(new Set(colors).size).toBe(4);
    expect(colors[3]).toContain("var(--seq-orange-high) 100%");
  });
});

describe("stationCountLabel", () => {
  it("counts weather and particle stations separately", () => {
    const weather = Array.from({ length: 80 }, (_, i) => ({ ...station, station_id: `W${i}` }));
    const pm = Array.from({ length: 12 }, (_, i) => ({ ...particles, station_id: `P${i}` }));
    expect(stationCountLabel([...weather, ...pm])).toBe("80 stations météo · 12 stations de particules");
  });

  it("uses the singular and leaves out an absent kind", () => {
    expect(stationCountLabel([station])).toBe("1 station météo");
    expect(stationCountLabel([particles])).toBe("1 station de particules");
    expect(stationCountLabel([])).toBe("aucune station");
  });
});

describe("stationDetails", () => {
  const now = new Date("2026-11-20T10:25:00Z");

  it("lists the weather measures of a weather station", () => {
    expect(stationDetails(station, now)).toBe("Le Raizet · 28,4 °C · humidité 74 % · 1 013,2 hPa");
  });

  it("gives PM10, PM2.5, their nature and their age for a particle station", () => {
    expect(stationDetails(particles, now)).toBe(
      "Pointe-à-Pitre Victoire · PM10 23 µg/m³ · PM2.5 9 µg/m³ · moyenne horaire brute, non validée · il y a 2 h 25 min",
    );
  });

  it("says when a station is offline", () => {
    expect(stationDetails({ ...particles, pm2_5_ugm3: null, ts: null, status: "offline" }, now)).toBe(
      "Pointe-à-Pitre Victoire · PM10 23 µg/m³ · moyenne horaire brute, non validée · hors ligne",
    );
  });
});

describe("ageLabel over an hour", () => {
  it("counts hours and minutes", () => {
    const now = new Date("2026-11-20T12:30:00Z");
    expect(ageLabel(new Date("2026-11-20T10:00:00Z"), now)).toBe("il y a 2 h 30 min");
    expect(ageLabel(new Date("2026-11-20T11:30:00Z"), now)).toBe("il y a 1 h");
  });
});
