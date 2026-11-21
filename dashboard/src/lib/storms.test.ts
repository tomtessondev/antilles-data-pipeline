import { describe, expect, it } from "vitest";

import type { DecadeCount, Passage, PassageWeather, Track } from "./hurricanes";
import {
  categoryColor,
  categoryFromWind,
  categoryRank,
  decadeRows,
  filterStorms,
  formatFixTime,
  passageDays,
  stormLabel,
  trackSegments,
} from "./storms";

function passage(sid: string, island: string, season: number, max_wind_kt: number | null): Passage {
  return {
    passage_id: `${sid}-${island}`,
    sid,
    name: sid.toUpperCase(),
    season,
    island,
    closest_km: 10,
    closest_time: `${season}-09-19 00:00:00`,
    max_wind_kt,
    category: categoryFromWind(max_wind_kt),
  };
}

const passages = [
  passage("maria", "Dominica", 2017, 145),
  passage("maria", "Martinique", 2017, 100),
  passage("erika", "Guadeloupe", 2015, 45),
  passage("hugo", "Guadeloupe", 1989, 120),
  passage("old", "Martinique", 1891, null),
];

const ALL = { from: 1851, to: 2026, island: null, minCategory: -1 };

describe("categoryFromWind", () => {
  it("applies the Saffir-Simpson thresholds of the warehouse", () => {
    const cases: [number | null, string | null][] = [
      [null, null], [33, "Depression"], [34, "Tropical storm"], [63, "Tropical storm"], [64, "Cat 1"],
      [83, "Cat 2"], [96, "Cat 3"], [113, "Cat 4"], [136, "Cat 4"], [137, "Cat 5"],
    ];
    for (const [kt, category] of cases) expect(categoryFromWind(kt)).toBe(category);
  });

  it("orders the categories, unknown last", () => {
    expect(categoryRank(null)).toBe(-1);
    expect(categoryRank("Unknown")).toBe(-1);
    expect(categoryRank("Depression")).toBe(0);
    expect(categoryRank("Cat 5")).toBe(6);
  });

  it("colours hurricanes on the orange ramp, weaker storms on the blue one", () => {
    expect(categoryColor("Cat 5")).toContain("--seq-orange-high) 100%");
    expect(categoryColor("Tropical storm")).toContain("--seq-blue-high) 70%");
    expect(categoryColor(null)).toBe("var(--baseline)");
  });
});

describe("filterStorms", () => {
  it("groups passages per storm, most recent first, with the strongest category", () => {
    const storms = filterStorms(passages, ALL);
    expect(storms.map((s) => s.sid)).toEqual(["maria", "erika", "hugo", "old"]);
    expect(storms[0]).toMatchObject({ category: "Cat 5", passages: [{ island: "Dominica" }, { island: "Martinique" }] });
    expect(storms[3].category).toBeNull();
  });

  it("filters by season range, island and minimum category", () => {
    expect(filterStorms(passages, { ...ALL, from: 1980, to: 2016 }).map((s) => s.sid)).toEqual(["erika", "hugo"]);
    expect(filterStorms(passages, { ...ALL, island: "Guadeloupe" }).map((s) => s.sid)).toEqual(["erika", "hugo"]);
    expect(filterStorms(passages, { ...ALL, minCategory: categoryRank("Cat 4") }).map((s) => s.sid)).toEqual(["maria", "hugo"]);
  });

  it("rates a storm by the selected island's passages only", () => {
    const [maria] = filterStorms(passages, { ...ALL, island: "Martinique", minCategory: categoryRank("Cat 3") });
    expect(maria).toMatchObject({ sid: "maria", category: "Cat 3", passages: [{ island: "Martinique" }] });
    expect(filterStorms(passages, { ...ALL, island: "Martinique", minCategory: categoryRank("Cat 4") })).toEqual([]);
  });
});

describe("trackSegments", () => {
  const track: Track = {
    sid: "maria",
    name: "MARIA",
    season: 2017,
    points: [
      [-59.3, 14.6, 110],
      [-60.4, 15.0, null],
      [-61.3, 15.4, 145],
    ],
  };

  it("draws one segment per pair of fixes, coloured by the wind at its start, else its end", () => {
    const { features } = trackSegments([track, { ...track, sid: "other" }], new Set(["maria"]));
    expect(features.map((f) => f.properties)).toEqual([
      { sid: "maria", category: "Cat 3" },
      { sid: "maria", category: "Cat 5" },
    ]);
    expect(features[0].geometry.coordinates).toEqual([[-59.3, 14.6], [-60.4, 15.0]]);
  });
});

describe("passageDays", () => {
  it("returns the day before, of and after, in order", () => {
    const row = (day_offset: number): PassageWeather => ({
      passage_id: "maria-Dominica",
      date: `2017-09-${19 + day_offset}`,
      day_offset,
      precipitation_mm: 10 * (day_offset + 2),
      wind_max_kmh: 50,
      gust_max_kmh: null,
    });
    const days = passageDays([row(1), row(-1), row(0), { ...row(0), passage_id: "other" }], "maria-Dominica");
    expect(days.map((d) => [d.label, d.rain, d.gust])).toEqual([
      ["J−1", 10, null],
      ["J", 20, null],
      ["J+1", 30, null],
    ]);
  });
});

describe("decadeRows", () => {
  const counts: DecadeCount[] = [
    { island: "Guadeloupe", decade: 2010, category: "Cat 5", passages: 1 },
    { island: "Dominica", decade: 2010, category: "Cat 5", passages: 2 },
    { island: "Guadeloupe", decade: 2010, category: "Tropical storm", passages: 3 },
    { island: "Guadeloupe", decade: 1980, category: "Cat 4", passages: 1 },
    { island: "Martinique", decade: 1890, category: "Unknown", passages: 1 },
  ];

  it("stacks the categories per decade, oldest first", () => {
    expect(decadeRows(counts, ALL)).toEqual([
      { decade: 1890, label: "1890", total: 1, Unknown: 1 },
      { decade: 1980, label: "1980", total: 1, "Cat 4": 1 },
      { decade: 2010, label: "2010", total: 6, "Cat 5": 3, "Tropical storm": 3 },
    ]);
  });

  it("applies the island, the minimum category and the season range (overlapping decades kept)", () => {
    const rows = decadeRows(counts, { from: 1985, to: 2026, island: "Guadeloupe", minCategory: 2 });
    expect(rows).toEqual([
      { decade: 1980, label: "1980", total: 1, "Cat 4": 1 },
      { decade: 2010, label: "2010", total: 1, "Cat 5": 1 },
    ]);
  });
});

describe("labels", () => {
  it("names storms like a person, unnamed ones in French", () => {
    expect(stormLabel("MARIA")).toBe("Maria");
    expect(stormLabel("NOT_NAMED")).toBe("Sans nom");
  });

  it("formats a fix time from either export format", () => {
    expect(formatFixTime("2017-09-19 01:15:00")).toBe("19 sept. 2017, 01:15 UTC");
    expect(formatFixTime("2017-09-06T12:00:00Z")).toBe("6 sept. 2017, 12:00 UTC");
    expect(formatFixTime("2017-09-06")).toBe("6 sept. 2017");
  });
});
