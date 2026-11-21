import { describe, expect, it } from "vitest";

import { divergingColor, mixOklab } from "./colors";

describe("divergingColor", () => {
  it("is neutral at zero and saturates at the limit", () => {
    expect(divergingColor(0, 2)).toBe("color-mix(in oklab, var(--seq-orange-high) 0%, var(--surface))");
    expect(divergingColor(1, 2)).toBe("color-mix(in oklab, var(--seq-orange-high) 50%, var(--surface))");
    expect(divergingColor(-5, 2)).toBe("color-mix(in oklab, var(--seq-blue-high) 100%, var(--surface))");
  });

  it("can put the orange end on the negative side (a dry month)", () => {
    expect(divergingColor(-1, 2, "orange")).toContain("--seq-orange-high");
    expect(divergingColor(1, 2, "orange")).toContain("--seq-blue-high");
  });

  it("marks a missing value", () => {
    expect(divergingColor(null, 2)).toBe("var(--baseline)");
  });
});

describe("mixOklab", () => {
  it("returns the ends at 0 and 1, clamped", () => {
    expect(mixOklab("#fde3d4", "#8f3110", 0)).toBe("#fde3d4");
    expect(mixOklab("#fde3d4", "#8f3110", 1.5)).toBe("#8f3110");
  });

  it("mixes in oklab: black to white gives a perceptual mid grey", () => {
    expect(mixOklab("#000000", "#ffffff", 0.5)).toBe("#636363");
  });
});
