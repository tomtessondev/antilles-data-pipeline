import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { fetchPublished, generatedLabel } from "./published";

const schema = z.object({ generated_at: z.string(), value: z.number() });
const sample = { generated_at: "2026-11-01T00:00:00Z", value: 1 };

afterEach(() => vi.unstubAllGlobals());

describe("fetchPublished", () => {
  it("returns the published document when it matches the contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ generated_at: "2026-11-21T06:00:00Z", value: 2 })));
    expect(await fetchPublished("https://example.test/x.json", schema, sample)).toEqual({
      data: { generated_at: "2026-11-21T06:00:00Z", value: 2 },
      sample: false,
    });
  });

  it("falls back to the sample when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await fetchPublished("https://example.test/x.json", schema, sample)).toEqual({ data: sample, sample: true });
  });

  it("falls back to the sample on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })));
    expect((await fetchPublished("https://example.test/x.json", schema, sample)).sample).toBe(true);
  });

  it("falls back to the sample when the document breaks the contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ generated_at: "2026-11-21", value: "2" })));
    expect((await fetchPublished("https://example.test/x.json", schema, sample)).sample).toBe(true);
  });

  it("falls back to the sample when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>")));
    expect((await fetchPublished("https://example.test/x.json", schema, sample)).sample).toBe(true);
  });
});

describe("generatedLabel", () => {
  it("dates the export, and says when the sample is shown", () => {
    expect(generatedLabel("2026-11-21T06:42:00Z", false)).toBe("Données du 21 novembre 2026.");
    expect(generatedLabel("2026-11-21T06:42:00Z", true)).toMatch(/^Données d’exemple/);
  });
});
