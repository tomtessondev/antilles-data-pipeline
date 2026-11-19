import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { neighbours, PROJECTS, projectBySlug, SKILL_LABELS, type Skill } from "./portfolio";

const PAGES = fileURLToPath(new URL("../app/projets/", import.meta.url));

describe("portfolio", () => {
  it("lists the projects in portfolio order", () => {
    expect(PROJECTS.map((p) => p.slug)).toEqual([
      "antilles-data-pipeline",
      "caribbean-sensor-pipeline",
      "caribbean-ais-stream",
      "antilles-climate-lakehouse",
      "antilles-hurricane-warehouse",
    ]);
  });

  it("has a page for every project", () => {
    for (const p of PROJECTS) expect(existsSync(`${PAGES}${p.slug}/page.tsx`), p.slug).toBe(true);
  });

  it("fills every skill row with at least one project", () => {
    for (const skill of Object.keys(SKILL_LABELS) as Skill[]) {
      expect(PROJECTS.some((p) => p.skills[skill]), skill).toBe(true);
    }
  });

  it("gives every project at least three skills", () => {
    for (const p of PROJECTS) expect(Object.keys(p.skills).length, p.slug).toBeGreaterThanOrEqual(3);
  });

  it("walks the order with previous and next", () => {
    expect(neighbours("antilles-data-pipeline")).toEqual({ previous: null, next: PROJECTS[1] });
    expect(neighbours("caribbean-ais-stream")).toEqual({ previous: PROJECTS[1], next: PROJECTS[3] });
    expect(neighbours("antilles-hurricane-warehouse")).toEqual({ previous: PROJECTS[3], next: null });
  });

  it("rejects an unknown slug", () => {
    expect(() => projectBySlug("nope")).toThrow();
  });
});
