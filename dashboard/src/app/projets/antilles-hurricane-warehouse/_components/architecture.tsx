import { Arrow, Diagram, Group, Legend, Node } from "@/components/docs/diagram";

const ID = "warehouse-architecture";

/** Sources → Python loader → BigQuery layers built by dbt → results, run by GitHub Actions
    on infrastructure described in Terraform. */
export function WarehouseArchitecture() {
  return (
    <div className="space-y-2">
      <Diagram
        id={ID}
        title="Architecture : la NOAA et Open-Meteo chargées par Python dans BigQuery, modélisées par dbt en couches raw, staging, intermediate et marts, exécutées par GitHub Actions sur une infrastructure Terraform"
        caption="Chaque jour à 06:00 UTC : chargement, puis dbt build. Les pull requests testent les modèles et estiment leur coût."
        width={960}
        height={316}
      >
        <Node x={20} y={40} w={150} h={56} label="NOAA IBTrACS" sub="trajectoires, 1851 →" tone="source" />
        <Node x={20} y={120} w={150} h={56} label="Open-Meteo ERA5" sub="météo des îles, 1940 →" tone="source" />
        <Arrow id={ID} points={[[170, 68], [190, 68], [190, 95], [208, 95]]} />
        <Arrow id={ID} points={[[170, 148], [190, 148], [190, 121], [208, 121]]} />

        <Node x={210} y={80} w={130} h={56} label="hurricane-load" sub="Python" tone="process" />
        <Arrow id={ID} points={[[340, 108], [383, 108]]} />

        <Group x={370} y={44} w={425} h={124} label="BigQuery · modèles dbt" />
        <Node x={385} y={80} w={85} h={56} label="raw" sub="tel quel" tone="store" />
        <Arrow id={ID} points={[[470, 108], [483, 108]]} />
        <Node x={485} y={80} w={85} h={56} label="staging" sub="partitionné" tone="store" />
        <Arrow id={ID} points={[[570, 108], [583, 108]]} />
        <Node x={585} y={80} w={100} h={56} label="intermediate" sub="< 100 km (GIS)" tone="store" />
        <Arrow id={ID} points={[[685, 108], [698, 108]]} />
        <Node x={700} y={80} w={80} h={56} label="marts" sub="passages" tone="store" />
        <Arrow id={ID} points={[[780, 108], [828, 108]]} />

        <Node x={830} y={80} w={115} h={56} label="Résultats" sub="graphiques, docs" tone="serve" />

        <Node x={210} y={240} w={280} h={56} label="GitHub Actions" sub="tests et dry run, run quotidien, docs" tone="infra" />
        <Node x={510} y={240} w={280} h={56} label="Terraform" sub="datasets, droits, fédération, budget" tone="infra" />
        <Arrow id={ID} points={[[275, 240], [275, 138]]} dashed />
        <Arrow id={ID} points={[[450, 240], [450, 170]]} dashed />
        <Arrow id={ID} points={[[650, 240], [650, 170]]} dashed />
      </Diagram>
      <Legend
        items={[
          ["source", "Sources"],
          ["process", "Chargement"],
          ["store", "Tables BigQuery"],
          ["serve", "Résultats"],
          ["infra", "Exécution et infrastructure"],
        ]}
      />
    </div>
  );
}
