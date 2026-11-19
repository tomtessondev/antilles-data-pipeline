import { describe, expect, it } from "vitest";

import { REDIRECTS } from "./redirects";

describe("redirects", () => {
  const to = (source: string) => REDIRECTS.find((r) => r.source === source)?.destination;

  it("sends the old projects index to the home page's project list", () => {
    expect(to("/projets")).toBe("/#projets");
  });

  it("moves the town pages under the demo", () => {
    expect(to("/towns/:code")).toBe("/demo/:code");
  });

  it("is permanent and leaves the project pages where they are", () => {
    expect(REDIRECTS.every((r) => r.permanent)).toBe(true);
    expect(REDIRECTS.some((r) => r.source.startsWith("/projets/"))).toBe(false);
  });
});
