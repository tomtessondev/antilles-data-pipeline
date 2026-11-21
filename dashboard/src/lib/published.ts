import type { z } from "zod";

/** A document published on a project's `data` branch, or the bundled sample instead. */
export type Published<T> = { data: T; sample: boolean };

/**
 * GET a published JSON document. Any failure (network, timeout, HTTP, JSON, schema) falls
 * back to the bundled sample, so a missing or broken export never breaks the page.
 */
export async function fetchPublished<T>(
  url: string,
  schema: z.ZodType<T>,
  sample: unknown,
  timeoutMs = 10_000,
): Promise<Published<T>> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (response.ok) {
      const parsed = schema.safeParse(await response.json());
      if (parsed.success) return { data: parsed.data, sample: false };
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
