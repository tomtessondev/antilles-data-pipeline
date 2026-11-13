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
