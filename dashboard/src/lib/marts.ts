import { cacheLife } from "next/cache";

import sample from "../../data/sample.json";
import { type Marts, martsSchema } from "./schema";

/**
 * Marts exported by the daily pipeline. With MARTS_URL unset (local dev, CI) the
 * bundled sample is used, so the dashboard builds without network access.
 */
export async function getMarts(): Promise<Marts> {
  "use cache";
  // The pipeline publishes once a day; an hourly refresh keeps the lag small.
  cacheLife("hours");

  const url = process.env.MARTS_URL;
  if (!url) return martsSchema.parse(sample);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetching marts from ${url} failed with HTTP ${response.status}`);
  }
  return martsSchema.parse(await response.json());
}
