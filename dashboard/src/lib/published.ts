import type { z } from "zod";

/** A document published on a project's `data` branch, or the bundled sample instead. */
export type Published<T> = { data: T; sample: boolean };

/** The exports weigh under 1 MB; the page carries them to the client, so a runaway one is refused. */
export const MAX_PUBLISHED_BYTES = 2_000_000;

/**
 * GET a published JSON document. Any failure (network, timeout, HTTP, size, JSON, schema)
 * falls back to the bundled sample, so a missing or broken export never breaks the page.
 */
export async function fetchPublished<T>(
  url: string,
  schema: z.ZodType<T>,
  sample: unknown,
  timeoutMs = 10_000,
): Promise<Published<T>> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok && Number(response.headers.get("content-length") ?? 0) <= MAX_PUBLISHED_BYTES) {
      const text = await response.text();
      if (text.length <= MAX_PUBLISHED_BYTES) {
        const parsed = schema.safeParse(JSON.parse(text));
        if (parsed.success) return { data: parsed.data, sample: false };
      }
    }
  } catch {
    // Unreachable or not JSON: the sample below.
  }
  return { data: schema.parse(sample), sample: true };
}

/** "Données du 21 novembre 2026", from the export's `generated_at`. */
export function generatedLabel(generatedAt: string, sample: boolean): string {
  const day = new Date(generatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return sample ? `Données d’exemple (${day}) : l’export publié n’a pas pu être lu.` : `Données du ${day}.`;
}
