import { ClimateExplorer } from "@/components/explorers/climate-explorer";
import { getClimate } from "@/lib/climate";

/** The explorer on the lakehouse's monthly export (or the bundled sample). */
export async function ClimateResults() {
  const { data, sample } = await getClimate();
  return <ClimateExplorer data={data} sample={sample} />;
}
