import { Arrow, Diagram, Group, Label, Legend, Node } from "./diagram";

const LEGEND = (
  <Legend
    items={[
      ["source", "Source de données"],
      ["process", "Traitement"],
      ["store", "Stockage"],
      ["serve", "Restitution"],
      ["infra", "Orchestration, CI, infrastructure"],
    ]}
  />
);

/** End-to-end flow, from the APIs to the website. */
export function BatchArchitecture() {
  const id = "batch-archi";
  return (
    <div className="space-y-2">
      <Diagram
        id={id}
        width={980}
        height={420}
        title="Architecture : des API Open-Meteo au site, en passant par le lac S3, DuckDB et dbt"
        caption="Tout ce qui est dans le cadre « job Dagster » tourne chaque matin à 06:00, heure des Antilles."
      >
        <Node x={10} y={70} w={140} h={56} label="Open-Meteo" sub="météo horaire" tone="source" />
        <Node x={10} y={150} w={140} h={56} label="Open-Meteo" sub="qualité de l’air (CAMS)" tone="source" />

        <Group x={170} y={30} w={620} h={240} label="Job Dagster « daily_pipeline »" />
        <Node x={190} y={105} w={120} h={66} label="Extraction" sub="Python, httpx" sub2="31 jours glissants" tone="process" />
        <Node x={340} y={105} w={120} h={66} label="Lac S3" sub="Parquet, ajout seul" sub2="par date d’extraction" tone="store" />
        <Node x={490} y={105} w={120} h={66} label="DuckDB raw" sub="reconstruit depuis" sub2="le lac" tone="store" />
        <Node x={640} y={60} w={130} h={56} label="dbt staging" sub="vues typées" tone="process" />
        <Node x={640} y={150} w={130} h={66} label="dbt marts" sub="faits journaliers," sub2="dimension villes" tone="store" />
        <Node x={490} y={200} w={120} h={56} label="Export JSON" sub="marts.json" tone="process" />

        <Arrow id={id} points={[[150, 98], [170, 98], [170, 138], [190, 138]]} />
        <Arrow id={id} points={[[150, 178], [170, 178], [170, 138], [190, 138]]} />
        <Arrow id={id} points={[[310, 138], [340, 138]]} />
        <Arrow id={id} points={[[460, 138], [490, 138]]} />
        <Arrow id={id} points={[[610, 125], [625, 125], [625, 88], [640, 88]]} />
        <Arrow id={id} points={[[705, 116], [705, 150]]} label="tests" labelAt={[728, 137]} />
        <Arrow id={id} points={[[640, 200], [620, 228], [610, 228]]} />

        <Node x={820} y={190} w={150} h={56} label="Branche « data »" sub="GitHub, 1 commit" tone="store" />
        <Node x={820} y={290} w={150} h={66} label="Site Next.js" sub="Vercel, relu" sub2="toutes les heures" tone="serve" />
        <Node x={640} y={300} w={150} h={56} label="Docs dbt" sub="GitHub Pages" tone="serve" />
        <Arrow id={id} points={[[550, 256], [550, 280], [800, 280], [800, 218], [820, 218]]} label="publication" labelAt={[680, 276]} />
        <Arrow id={id} points={[[895, 246], [895, 290]]} />
        <Arrow id={id} points={[[705, 216], [705, 300]]} dashed />

        <Node x={190} y={300} w={150} h={56} label="GitHub Actions" sub="cron 10:00 UTC" tone="infra" />
        <Node x={370} y={300} w={150} h={56} label="Terraform" sub="bucket, IAM, budget" tone="infra" />
        <Arrow id={id} points={[[265, 300], [265, 270]]} label="lance" labelAt={[290, 290]} />
        <Arrow id={id} points={[[445, 300], [445, 290], [400, 290], [400, 171]]} dashed />
        <Label x={980} y={410} anchor="end" muted size={11}>
          AWS us-east-2 · Vercel · GitHub
        </Label>
      </Diagram>
      {LEGEND}
    </div>
  );
}

/** The lake keeps every extraction; the raw table keeps the latest value of each hour. */
export function LakeDiagram() {
  const id = "lake";
  const day = (x: number, title: string, rows: string[], tone: "store" | "infra") => (
    <g>
      <Label x={x} y={40} bold size={12}>
        {title}
      </Label>
      {rows.map((row, i) => (
        <Node key={row} x={x} y={52 + i * 40} w={210} h={32} label={row} tone={tone} />
      ))}
    </g>
  );
  return (
    <Diagram
      id={id}
      width={900}
      height={250}
      title="Le lac garde toutes les extractions ; la table brute garde la plus récente de chaque heure"
      caption="Chaque run renvoie 31 jours : la même heure arrive dans plusieurs fichiers. Au chargement, DuckDB garde la version extraite le plus récemment (qualify row_number() = 1)."
    >
      <Label x={10} y={20} muted size={11}>
        s3://antilles-lake-…/weather_hourly/
      </Label>
      {day(10, "extracted_date=2026-11-13/", ["13/11 10:00 · 27,0 °C", "13/11 11:00 · 27,6 °C"], "infra")}
      {day(250, "extracted_date=2026-11-14/", ["13/11 10:00 · 27,1 °C", "13/11 11:00 · 27,6 °C", "14/11 05:00 · 24,8 °C"], "store")}
      <Arrow id={id} points={[[470, 110], [560, 110]]} label="la plus récente gagne" labelAt={[515, 100]} />
      <Label x={580} y={40} bold>
        raw.weather_hourly (DuckDB)
      </Label>
      <Node x={580} y={52} w={300} h={32} label="13/11 10:00 · 27,1 °C  (extrait le 14)" tone="store" />
      <Node x={580} y={92} w={300} h={32} label="13/11 11:00 · 27,6 °C  (extrait le 14)" tone="store" />
      <Node x={580} y={132} w={300} h={32} label="14/11 05:00 · 24,8 °C  (extrait le 14)" tone="store" />
      <Label x={580} y={200} muted size={11}>
        Un fichier n’est jamais réécrit : la base DuckDB est jetable,
      </Label>
      <Label x={580} y={216} muted size={11}>
        n’importe quel run la reconstruit avec tout l’historique.
      </Label>
    </Diagram>
  );
}

/** Dagster assets and their dependencies, as Dagster draws them. */
export function AssetGraph() {
  const id = "assets";
  return (
    <Diagram
      id={id}
      width={980}
      height={300}
      title="Graphe des assets Dagster, du lac au fichier du site"
      caption="Les assets « raw/… » portent les noms que dbt donne à ses sources : Dagster relie Python et dbt sans code de colle."
    >
      <Group x={5} y={10} w={180} h={280} label="lake" />
      <Group x={200} y={10} w={190} h={280} label="raw" />
      <Group x={405} y={10} w={200} h={280} label="staging (dbt)" />
      <Group x={620} y={10} w={190} h={280} label="marts (dbt)" />
      <Group x={825} y={10} w={150} h={280} label="serve" />

      <Node x={20} y={110} w={150} h={40} label="weather_hourly" tone="store" />
      <Node x={20} y={200} w={150} h={40} label="air_quality_hourly" tone="store" />
      <Node x={215} y={40} w={160} h={40} label="locations" tone="store" />
      <Node x={215} y={110} w={160} h={40} label="weather_hourly" tone="store" />
      <Node x={215} y={200} w={160} h={40} label="air_quality_hourly" tone="store" />
      <Node x={420} y={40} w={170} h={40} label="stg_locations" tone="process" />
      <Node x={420} y={110} w={170} h={40} label="stg_weather_hourly" tone="process" />
      <Node x={420} y={200} w={170} h={40} label="stg_air_quality_hourly" tone="process" />
      <Node x={635} y={40} w={160} h={40} label="dim_location" tone="store" />
      <Node x={635} y={110} w={160} h={40} label="fct_daily_weather" tone="store" />
      <Node x={635} y={200} w={160} h={40} label="fct_daily_air_quality" tone="store" />
      <Node x={840} y={120} w={120} h={48} label="marts_json" sub="→ site" tone="serve" />

      <Arrow id={id} points={[[170, 130], [215, 130]]} />
      <Arrow id={id} points={[[170, 220], [215, 220]]} />
      <Arrow id={id} points={[[375, 60], [420, 60]]} />
      <Arrow id={id} points={[[375, 130], [420, 130]]} />
      <Arrow id={id} points={[[375, 220], [420, 220]]} />
      <Arrow id={id} points={[[505, 80], [505, 110]]} />
      <Arrow id={id} points={[[590, 60], [635, 60]]} />
      <Arrow id={id} points={[[590, 130], [635, 130]]} />
      <Arrow id={id} points={[[590, 220], [635, 220]]} />
      <Arrow id={id} points={[[795, 60], [815, 60], [815, 135], [840, 135]]} />
      <Arrow id={id} points={[[795, 130], [840, 140]]} />
      <Arrow id={id} points={[[795, 220], [815, 220], [815, 155], [840, 155]]} />
      <Label x={505} y={280} anchor="middle" muted size={11}>
        Les tests dbt deviennent des contrôles (asset checks) : un test rouge arrête le run avant l’export.
      </Label>
    </Diagram>
  );
}

/** What runs when: pull request, merge, daily cron. */
export function CiDiagram() {
  const id = "ci";
  return (
    <Diagram
      id={id}
      width={980}
      height={290}
      title="Ce qui tourne automatiquement : à chaque PR, à chaque merge, chaque matin"
    >
      <Node x={10} y={20} w={160} h={50} label="Pull request" tone="infra" />
      <Node x={10} y={120} w={160} h={50} label="Merge sur main" tone="infra" />
      <Node x={10} y={220} w={160} h={50} label="Cron 10:00 UTC" sub="06:00 aux Antilles" tone="infra" />

      <Node x={230} y={15} w={420} h={60} label="ci.yml" sub="lint, types, tests Python · dbt sur données de test" sub2="dashboard (test de contrat) · images Docker · Terraform" tone="process" />
      <Node x={230} y={115} w={200} h={60} label="docs.yml" sub="dbt docs → GitHub Pages" tone="process" />
      <Node x={450} y={115} w={200} h={60} label="Vercel" sub="build et déploiement" sub2="du site" tone="serve" />
      <Node x={230} y={215} w={420} h={60} label="pipeline.yml" sub="identifiants AWS · job Dagster (vraie API)" sub2="fraîcheur des sources · publication de marts.json" tone="process" />

      <Node x={720} y={215} w={240} h={60} label="Lac S3 + branche data" sub="nouvelles extractions," sub2="nouveau marts.json" tone="store" />
      <Node x={720} y={115} w={240} h={60} label="Site en ligne" sub="relit marts.json" sub2="au plus toutes les heures" tone="serve" />

      <Arrow id={id} points={[[170, 45], [230, 45]]} />
      <Arrow id={id} points={[[170, 145], [230, 145]]} />
      <Arrow id={id} points={[[170, 245], [230, 245]]} />
      <Arrow id={id} points={[[430, 145], [450, 145]]} />
      <Arrow id={id} points={[[650, 245], [720, 245]]} />
      <Arrow id={id} points={[[840, 215], [840, 175]]} />
      <Arrow id={id} points={[[650, 145], [720, 145]]} />
    </Diagram>
  );
}
