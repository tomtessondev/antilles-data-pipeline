import { HurricaneExplorer } from "@/components/explorers/hurricane-explorer";
import { getHurricanes } from "@/lib/hurricanes";

/** The explorer on the warehouse's daily export (or the bundled sample). */
export async function HurricaneResults() {
  const { data, sample } = await getHurricanes();
  return <HurricaneExplorer data={data} sample={sample} />;
}
