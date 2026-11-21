import { HurricaneExplorer } from "@/components/explorers/hurricane-explorer";
import { getHurricanes } from "@/lib/hurricanes";

/** The explorer on the warehouse's daily export (or the bundled sample). */
export async function HurricaneResults() {
  const { data, sample } = await getHurricanes();
  // by_decade stays out of the page: the decade chart counts the passages itself.
  const { generated_at, islands, passages, passage_weather, tracks } = data;
  return <HurricaneExplorer data={{ generated_at, islands, passages, passage_weather, tracks }} sample={sample} />;
}
