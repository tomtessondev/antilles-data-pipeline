"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { LngLatBoundsLike, Map as MapLibreMap, Marker, Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
const DARK = "(prefers-color-scheme: dark)";

// Grenada to Anguilla: the Lesser Antilles, Guadeloupe and Martinique in the middle.
export const LESSER_ANTILLES: [[number, number], [number, number]] = [
  [-63.4, 11.9],
  [-59.4, 18.4],
];

export type LoadedMap = { map: MapLibreMap; Marker: typeof Marker; Popup: typeof Popup };

/**
 * A MapLibre map on OpenFreeMap tiles following the colour scheme, rotation disabled.
 * `styleLoads` counts the style loads: a scheme change swaps the style, which drops the
 * sources and layers a caller added, so callers re-add them when it changes.
 */
export function useMapLibre(bounds: LngLatBoundsLike) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [styleLoads, setStyleLoads] = useState(0);
  const initialBounds = useRef(bounds);

  useEffect(() => {
    let cancelled = false;
    let instance: MapLibreMap | null = null;
    const scheme = window.matchMedia(DARK);
    // No diff: a full reload fires `style.load`, the callers' cue to add their layers back.
    const onScheme = () => instance?.setStyle(scheme.matches ? STYLES.dark : STYLES.light, { diff: false });

    void import("maplibre-gl").then((maplibre) => {
      if (cancelled || !container.current) return;
      // The bundled copy of maplibre cannot locate its worker from import.meta.url.
      maplibre.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
      try {
        instance = new maplibre.Map({
          container: container.current,
          style: scheme.matches ? STYLES.dark : STYLES.light,
          bounds: initialBounds.current,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
      } catch {
        // No WebGL in this browser.
        setUnsupported(true);
        return;
      }
      instance.touchZoomRotate.disableRotation();
      instance.on("style.load", () => setStyleLoads((count) => count + 1));
      scheme.addEventListener("change", onScheme);
      setLoaded({ map: instance, Marker: maplibre.Marker, Popup: maplibre.Popup });
    });

    return () => {
      cancelled = true;
      scheme.removeEventListener("change", onScheme);
      instance?.remove();
    };
  }, []);

  return { container, loaded, unsupported, styleLoads };
}

export function NoWebGL() {
  return <p className="p-4 text-sm text-ink-secondary">Carte indisponible : ce navigateur ne prend pas en charge WebGL.</p>;
}
