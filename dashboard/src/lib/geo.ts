import { geoContains, geoDistance, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";

import type { Location } from "./schema";

export type CommuneProperties = { code: string; name: string; territory: string };
export type Commune = Feature<Polygon | MultiPolygon, CommuneProperties>;
export type Communes = FeatureCollection<Polygon | MultiPolygon, CommuneProperties>;

export type MapCommune = { code: string; name: string; path: string; locationCode?: string };
export type MapTown = { locationCode: string; x: number; y: number };
export type TerritoryMap = {
  territory: string;
  width: number;
  height: number;
  communes: MapCommune[];
  towns: MapTown[];
};

/** Positive when the ring is clockwise in (longitude, latitude), y pointing north. */
function clockwiseArea(ring: Position[]): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[i][0] - ring[j][0]) * (ring[i][1] + ring[j][1]);
  }
  return area;
}

// GeoJSON (RFC 7946) winds exterior rings counter-clockwise; d3-geo works on the sphere
// and wants them clockwise, otherwise a commune becomes "the whole Earth minus the commune".
function rewindPolygon(rings: Position[][]): Position[][] {
  return rings.map((ring, i) => {
    const clockwise = clockwiseArea(ring) > 0;
    return (i === 0) === clockwise ? ring : [...ring].reverse();
  });
}

export function rewind(commune: Commune): Commune {
  const { geometry } = commune;
  const coordinates =
    geometry.type === "Polygon"
      ? rewindPolygon(geometry.coordinates)
      : geometry.coordinates.map(rewindPolygon);
  return { ...commune, geometry: { ...geometry, coordinates } as Polygon | MultiPolygon };
}

function vertices(commune: Commune): Position[] {
  const { geometry } = commune;
  return geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
}

/**
 * The commune containing the town's coordinates. Coastal towns (Le Moule, Sainte-Anne)
 * can land just offshore of the simplified coastline: fall back to the nearest outline.
 */
export function communeOf(communes: Commune[], location: Location): Commune | undefined {
  const point: [number, number] = [location.longitude, location.latitude];
  const containing = communes.find((c) => geoContains(c, point));
  if (containing) return containing;

  let nearest: Commune | undefined;
  let best = Infinity;
  for (const commune of communes) {
    for (const vertex of vertices(commune)) {
      const distance = geoDistance(point, vertex as [number, number]);
      if (distance < best) {
        best = distance;
        nearest = commune;
      }
    }
  }
  return nearest;
}

/** Projected outlines for each territory, sized to `width`, towns linked to their commune. */
export function buildTerritoryMaps(
  collection: Communes,
  locations: Location[],
  width = 440,
): TerritoryMap[] {
  const territories = [...new Set(locations.map((l) => l.territory))].sort();
  return territories.map((territory) => {
    const communes = collection.features
      .filter((f) => f.properties.territory === territory)
      .map(rewind);
    const outline: Communes = { type: "FeatureCollection", features: communes };
    const projection = geoMercator().fitWidth(width - 16, outline);
    projection.translate([projection.translate()[0] + 8, projection.translate()[1] + 8]);
    const path = geoPath(projection).digits(1);
    const height = Math.ceil(path.bounds(outline)[1][1] + 8);

    const towns = locations.filter((l) => l.territory === territory);
    const townOfCommune = new Map<string, string>();
    for (const town of towns) {
      const commune = communeOf(communes, town);
      if (commune) townOfCommune.set(commune.properties.code, town.location_code);
    }

    return {
      territory,
      width,
      height,
      communes: communes.map((c) => ({
        code: c.properties.code,
        name: c.properties.name,
        path: path(c) ?? "",
        locationCode: townOfCommune.get(c.properties.code),
      })),
      towns: towns.map((town) => {
        const [x, y] = projection([town.longitude, town.latitude]) ?? [0, 0];
        return { locationCode: town.location_code, x, y };
      }),
    };
  });
}
