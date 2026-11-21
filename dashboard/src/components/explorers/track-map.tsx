"use client";

import type { ExpressionSpecification, GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";

import { NoWebGL, useMapLibre } from "@/components/map/use-maplibre";
import { mixOklab } from "@/lib/colors";
import type { Category, Island, Track } from "@/lib/hurricanes";
import { categoryStep, trackSegments } from "@/lib/storms";

// The eastern Caribbean and the Atlantic approaches the storms come from.
const BOUNDS: [[number, number], [number, number]] = [
  [-70, 10],
  [-50, 23],
];

const TOKENS = ["--seq-blue-low", "--seq-blue-high", "--seq-orange-low", "--seq-orange-high", "--baseline", "--ink", "--surface"];

/** The site's colour tokens as hex values, for MapLibre, which cannot read CSS variables. */
function readTokens(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(TOKENS.map((name) => [name, style.getPropertyValue(name).trim()]));
}

/** `match` expression giving each segment its category's colour, as on the legend. */
function categoryPaint(tokens: Record<string, string>): ExpressionSpecification {
  const color = (category: Category) => {
    const step = categoryStep(category)!;
    return mixOklab(tokens[`--seq-${step.ramp}-low`], tokens[`--seq-${step.ramp}-high`], step.t);
  };
  // An unknown category is null, which matches nothing and takes the last value.
  return [
    "match",
    ["get", "category"],
    "Depression", color("Depression"),
    "Tropical storm", color("Tropical storm"),
    "Cat 1", color("Cat 1"),
    "Cat 2", color("Cat 2"),
    "Cat 3", color("Cat 3"),
    "Cat 4", color("Cat 4"),
    "Cat 5", color("Cat 5"),
    tokens["--baseline"],
  ];
}

type Props = {
  tracks: Track[];
  islands: Island[];
  /** Storms drawn. */
  sids: Set<string>;
  selected: string | null;
  onSelect: (sid: string) => void;
};

/** The storm tracks as lines coloured by category, the islands as points; a click selects a storm. */
export function TrackMap({ tracks, islands, sids, selected, onSelect }: Props) {
  const { container, loaded, unsupported, styleLoads } = useMapLibre(BOUNDS);
  const segments = useMemo(() => trackSegments(tracks, sids), [tracks, sids]);
  const select = useRef(onSelect);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // Sources and layers, added again after each style load (a colour scheme change).
  useEffect(() => {
    if (!loaded || styleLoads === 0) return;
    const { map } = loaded;
    const tokens = readTokens();
    const color = categoryPaint(tokens);
    if (!map.getSource("tracks")) {
      map.addSource("tracks", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("islands", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: islands.map((island) => ({
            type: "Feature",
            properties: { island: island.island },
            geometry: { type: "Point", coordinates: [island.lon, island.lat] },
          })),
        },
      });
      map.addLayer({ id: "tracks", type: "line", source: "tracks", layout: { "line-cap": "round" }, paint: { "line-color": color, "line-width": 2 } });
      map.addLayer({
        id: "tracks-selected",
        type: "line",
        source: "tracks",
        filter: ["==", ["get", "sid"], ""],
        layout: { "line-cap": "round" },
        paint: { "line-color": color, "line-width": 4.5 },
      });
      map.addLayer({
        id: "islands",
        type: "circle",
        source: "islands",
        paint: { "circle-radius": 4, "circle-color": tokens["--ink"], "circle-stroke-width": 1.5, "circle-stroke-color": tokens["--surface"] },
      });
    }
  }, [loaded, styleLoads, islands]);

  useEffect(() => {
    if (!loaded || styleLoads === 0) return;
    (loaded.map.getSource("tracks") as GeoJSONSource | undefined)?.setData(segments);
  }, [loaded, styleLoads, segments]);

  useEffect(() => {
    if (!loaded || styleLoads === 0 || !loaded.map.getLayer("tracks")) return;
    loaded.map.setFilter("tracks-selected", ["==", ["get", "sid"], selected ?? ""]);
    loaded.map.setPaintProperty("tracks", "line-opacity", selected ? 0.3 : 0.9);
  }, [loaded, styleLoads, selected]);

  useEffect(() => {
    if (!loaded) return;
    const { map } = loaded;
    const onClick = (event: MapLayerMouseEvent) => {
      const sid = event.features?.[0]?.properties?.sid;
      if (typeof sid === "string") select.current(sid);
    };
    const pointer = () => (map.getCanvas().style.cursor = "pointer");
    const reset = () => (map.getCanvas().style.cursor = "");
    map.on("click", "tracks", onClick);
    map.on("mouseenter", "tracks", pointer);
    map.on("mouseleave", "tracks", reset);
    return () => {
      map.off("click", "tracks", onClick);
      map.off("mouseenter", "tracks", pointer);
      map.off("mouseleave", "tracks", reset);
    };
  }, [loaded]);

  return (
    <div ref={container} className="size-full">
      {unsupported ? <NoWebGL /> : null}
    </div>
  );
}
