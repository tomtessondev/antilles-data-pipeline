import { describe, expect, it } from "vitest";

import { townHref } from "./routes";

describe("routes", () => {
  it("puts a town page under the demo", () => {
    expect(townHref("PAP")).toBe("/demo/PAP");
  });
});
