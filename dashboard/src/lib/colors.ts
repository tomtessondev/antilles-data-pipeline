/** Town colour by its position in `allTownSeries` (fixed order), never by rank. */
export function townColor(index: number): string {
  return `var(--town-${index + 1})`;
}

/** A step on a sequential ramp, `t` from 0 (low) to 1 (high). */
export function rampColor(ramp: "blue" | "orange", t: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, t)) * 100);
  return `color-mix(in oklab, var(--seq-${ramp}-high) ${pct}%, var(--seq-${ramp}-low))`;
}

/** Position of `value` between `min` and `max`, 0.5 when they are equal. */
export function normalise(value: number, min: number, max: number): number {
  return max > min ? (value - min) / (max - min) : 0.5;
}

/**
 * A diverging scale centred on the surface colour: negative values towards `negative`, positive
 * ones towards the other ramp's high end, saturated at `limit`. Null is "no value".
 */
export function divergingColor(value: number | null, limit: number, negative: "blue" | "orange" = "blue"): string {
  if (value === null) return "var(--baseline)";
  const ramp = value < 0 ? negative : negative === "blue" ? "orange" : "blue";
  const pct = Math.round(Math.min(1, Math.abs(value) / limit) * 100);
  return `color-mix(in oklab, var(--seq-${ramp}-high) ${pct}%, var(--surface))`;
}

type Oklab = [l: number, a: number, b: number];

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

function hexToOklab(hex: string): Oklab {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex([L, A, B]: Oklab): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => fromLinear(c).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * `color-mix(in oklab, high t, low)` computed in JavaScript, for MapLibre layers, which
 * cannot read CSS variables: same result as `rampColor` once the tokens are resolved.
 */
export function mixOklab(low: string, high: string, t: number): string {
  const [a, b] = [hexToOklab(low), hexToOklab(high)];
  const k = Math.min(1, Math.max(0, t));
  return oklabToHex([0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * k) as Oklab);
}
