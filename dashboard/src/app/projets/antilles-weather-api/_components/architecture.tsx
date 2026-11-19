import { Arrow, Diagram, Group, Legend, Node } from "@/components/docs/diagram";

const ID = "api-architecture";

/** The batch export loaded into Neon, served by FastAPI on Cloud Run behind API keys,
    deployed by GitHub Actions on infrastructure described in Terraform. */
export function ApiArchitecture() {
  return (
    <div className="space-y-2">
      <Diagram
        id={ID}
        title="Architecture : le fichier marts.json du pipeline batch est chargé chaque matin dans PostgreSQL chez Neon ; une API FastAPI sur Cloud Run le sert aux clients munis d'une clé ; GitHub Actions teste, migre et déploie sur une infrastructure Terraform"
        caption="La base n'est lue qu'au chargement, au rafraîchissement de la mémoire (toutes les 15 min au plus) et quand une réponse n'est pas déjà en cache : Neon peut dormir."
        width={960}
        height={316}
      >
        <Node x={20} y={80} w={170} h={56} label="marts.json" sub="pipeline batch, 10:00 UTC" tone="source" />
        <Arrow id={ID} points={[[190, 108], [228, 108]]} label="11:00" labelAt={[209, 100]} />
        <Node x={230} y={80} w={150} h={56} label="weather-api load" sub="validation, 1 transaction" tone="process" />
        <Arrow id={ID} points={[[380, 108], [418, 108]]} />
        <Node x={420} y={80} w={150} h={56} label="PostgreSQL" sub="Neon, en veille au repos" tone="store" />

        <Group x={600} y={44} w={200} h={124} label="Cloud Run · 0 à 2 instances" />
        <Node x={615} y={80} w={170} h={56} label="FastAPI" sub="clés, quotas, cache" tone="process" />
        <Arrow id={ID} points={[[613, 108], [572, 108]]} label="SQL rare" labelAt={[592, 100]} />
        <Arrow id={ID} points={[[830, 108], [787, 108]]} />
        <Node x={832} y={80} w={110} h={56} label="Clients" sub="X-API-Key" tone="serve" />

        <Node x={230} y={240} w={300} h={56} label="GitHub Actions" sub="tests, migrations, image, déploiement (main)" tone="infra" />
        <Node x={560} y={240} w={300} h={56} label="Terraform" sub="Cloud Run, registre, secret, fédération" tone="infra" />
        <Arrow id={ID} points={[[305, 240], [305, 138]]} dashed />
        <Arrow id={ID} points={[[480, 240], [480, 138]]} dashed />
        <Arrow id={ID} points={[[700, 240], [700, 170]]} dashed />
      </Diagram>
      <Legend
        items={[
          ["source", "Source"],
          ["process", "Chargement et API"],
          ["store", "Base"],
          ["serve", "Clients"],
          ["infra", "Exécution et infrastructure"],
        ]}
      />
    </div>
  );
}
