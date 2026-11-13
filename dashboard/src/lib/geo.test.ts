import { describe, expect, it } from "vitest";

import communesData from "../../data/communes.json";
import sample from "../../data/sample.json";
import { buildTerritoryMaps, type Communes, communeOf, rewind } from "./geo";
import { martsSchema } from "./schema";

const communes = communesData as Communes;
const { locations } = martsSchema.parse(sample);

describe("communeOf", () => {
  // Guadeloupe and Martinique both have a Lamentin and a Sainte-Anne, hence the territory check.
  it.each([
    ["BTE", "Basse-Terre"],
    ["MOU", "Moule"],
    ["PAP", "Pointe-à-Pitre"],
    ["FDF", "Fort-de-France"],
    ["LAM", "Lamentin"],
    ["SAN", "Sainte-Anne"],
  ])("puts %s in the commune of %s", (code, name) => {
    const location = locations.find((l) => l.location_code === code)!;
    const commune = communeOf(communes.features.map(rewind), location);

    expect([commune?.properties.name, commune?.properties.territory]).toEqual([
      name,
      location.territory,
    ]);
  });
});

describe("buildTerritoryMaps", () => {
  it("projects each territory inside its own box and links every town", () => {
    const maps = buildTerritoryMaps(communes, locations, 400);

    expect(maps.map((m) => m.territory)).toEqual(["Guadeloupe", "Martinique"]);
    for (const map of maps) {
      expect(map.height).toBeGreaterThan(100);
      expect(map.height).toBeLessThan(800);
      expect(map.communes.filter((c) => c.locationCode)).toHaveLength(3);
      for (const town of map.towns) {
        expect(town.x).toBeGreaterThan(0);
        expect(town.x).toBeLessThan(map.width);
        expect(town.y).toBeGreaterThan(0);
        expect(town.y).toBeLessThan(map.height);
      }
    }
  });
});
