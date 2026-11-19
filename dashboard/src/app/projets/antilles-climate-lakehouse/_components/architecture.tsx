import { Arrow, Diagram, Group, Legend, Node } from "@/components/docs/diagram";

const ID = "lakehouse-architecture";

/** Météo-France files → ingest into the landing volume → bronze, silver and gold Delta
    tables in Unity Catalog → README charts, run by a serverless job deployed by a bundle. */
export function LakehouseArchitecture() {
  return (
    <div className="space-y-2">
      <Diagram
        id={ID}
        title="Architecture : les fichiers quotidiens de Météo-France trouvés par l’API data.gouv.fr, téléchargés dans le volume landing puis rangés en tables Delta bronze, argent et or dans Unity Catalog, par un job Databricks serverless déployé avec un Asset Bundle"
        caption="Le job serverless enchaîne ses quatre tâches en 3 minutes ; une republication identique ne réécrit aucune ligne."
        width={960}
        height={316}
      >
        <Node x={15} y={80} w={130} h={60} label="data.gouv.fr" sub="Météo-France" sub2="971/972, 1950 →" tone="source" />
        <Arrow id={ID} points={[[145, 110], [178, 110]]} />

        <Group x={165} y={44} w={675} h={124} label="Databricks · Unity Catalog antilles.climate" />
        <Node x={180} y={80} w={85} h={60} label="ingest" sub="téléchargement" sub2="+ sha1" tone="process" />
        <Arrow id={ID} points={[[265, 110], [278, 110]]} />
        <Node x={280} y={80} w={90} h={60} label="landing" sub="volume" sub2=".csv.gz" tone="store" />
        <Arrow id={ID} points={[[370, 110], [383, 110]]} />
        <Node x={385} y={80} w={115} h={60} label="bronze" sub="texte brut" sub2="1 copie par fichier" tone="store" />
        <Arrow id={ID} points={[[500, 110], [513, 110]]} />
        <Node x={515} y={80} w={130} h={60} label="argent" sub="typé, station × jour" sub2="MERGE ; stations" tone="store" />
        <Arrow id={ID} points={[[645, 110], [658, 110]]} />
        <Node x={660} y={80} w={165} h={60} label="or" sub="mensuel, normales 1991–2020" sub2="anomalies, extrêmes, records" tone="store" />
        <Arrow id={ID} points={[[825, 110], [858, 110]]} />

        <Node x={860} y={80} w={85} h={60} label="README" sub="graphiques" tone="serve" />

        <Node x={180} y={240} w={420} h={56} label="Job Databricks serverless" sub="quatre tâches : ingest → bronze → silver → gold" tone="infra" />
        <Node x={620} y={240} w={220} h={56} label="Asset Bundle" sub="databricks.yml : wheel + job" tone="infra" />
        <Arrow id={ID} points={[[620, 268], [602, 268]]} dashed />
        <Arrow id={ID} points={[[222, 240], [222, 142]]} dashed />
        <Arrow id={ID} points={[[450, 240], [450, 170]]} dashed />
      </Diagram>
      <Legend
        items={[
          ["source", "Source"],
          ["process", "Téléchargement"],
          ["store", "Volume et tables Delta"],
          ["serve", "Résultats"],
          ["infra", "Exécution et déploiement"],
        ]}
      />
    </div>
  );
}
