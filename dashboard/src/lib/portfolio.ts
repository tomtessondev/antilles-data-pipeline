// The six projects of the portfolio, in reading order. The navigation, the home page,
// the skills grid and the previous / next links all read this list.

export type Skill =
  | "ingestion"
  | "modelling"
  | "serving"
  | "streaming"
  | "orchestration"
  | "iac"
  | "tests"
  | "quality"
  | "monitoring"
  | "cost"
  | "security"
  | "cloud";

export const SKILL_LABELS: Record<Skill, string> = {
  ingestion: "Ingestion",
  modelling: "Modélisation",
  serving: "Exposition des données",
  streaming: "Streaming",
  orchestration: "Orchestration",
  iac: "Infrastructure as code",
  tests: "Tests",
  quality: "Qualité des données",
  monitoring: "Supervision",
  cost: "Maîtrise des coûts",
  security: "Sécurité",
  cloud: "Cloud",
};

/** CSS variable of each family's colour (defined in globals.css, light and dark). */
export type FamilyColor =
  | "--family-batch"
  | "--family-iot"
  | "--family-stream"
  | "--family-lakehouse"
  | "--family-warehouse"
  | "--family-api";

export type Project = {
  slug: string;
  family: string;
  color: FamilyColor;
  title: string;
  pitch: string;
  clientValue: string;
  /** One line per stage of the overview diagram. */
  flow: { source: string; process: string; result: string };
  /** The "En bref" box of the project page. */
  problem: string;
  result: string;
  stack: string[];
  /** Each skill the project shows, with the proof printed in the grid. */
  skills: Partial<Record<Skill, string>>;
  repo: string;
  docs?: string;
  demo?: string;
  /** Other documents worth a link from the "En bref" box. */
  links?: { label: string; href: string }[];
};

const GITHUB = "https://github.com/tomtessondev";

export const PROJECTS: readonly Project[] = [
  {
    slug: "antilles-data-pipeline",
    family: "Batch",
    color: "--family-batch",
    title: "La météo et l’air des Antilles, chaque matin",
    pitch:
      "Chaque matin, la météo et la qualité de l’air de six villes de Guadeloupe et de Martinique sont extraites, gardées dans un lac de données, transformées, testées et publiées sur ce site.",
    clientValue:
      "un pipeline complet des API au tableau de bord : historique conservé, données testées, infrastructure en code.",
    flow: {
      source: "API Open-Meteo : météo et qualité de l’air",
      process: "Lac S3 → DuckDB → dbt, orchestré par Dagster",
      result: "Démo météo en ligne, mise à jour chaque matin",
    },
    problem:
      "une API ne garde pas d’historique propre, ne distingue pas mesure et prévision, et ne calcule pas d’indicateurs.",
    result:
      "les 31 derniers jours extraits chaque matin, gardés dans un lac S3, transformés en indicateurs journaliers et publiés en démo.",
    stack: ["Python", "S3 + Parquet", "DuckDB", "dbt", "Dagster", "Terraform", "Next.js"],
    skills: {
      ingestion: "API → lac S3 en Parquet",
      modelling: "dbt sur DuckDB",
      serving: "Export JSON, site Next.js",
      orchestration: "Dagster, chaque matin",
      iac: "Terraform (AWS)",
      tests: "pytest, tests dbt",
      quality: "Tests et fraîcheur dbt",
      security: "IAM au plus juste",
      cloud: "AWS, Vercel",
    },
    repo: `${GITHUB}/antilles-data-pipeline`,
    docs: "https://tomtessondev.github.io/antilles-data-pipeline/",
    demo: "/demo",
  },
  {
    slug: "caribbean-sensor-pipeline",
    family: "IoT",
    color: "--family-iot",
    title: "Des capteurs de qualité de l’air jusqu’à Grafana",
    pitch:
      "Des stations de mesure (simulées, et un firmware ESP32) publient la qualité de l’air en MQTT ; un service les valide et les stocke dans TimescaleDB ; Grafana affiche, contrôle et alerte.",
    clientValue:
      "du capteur au tableau de bord : messages sécurisés, aucune donnée perdue ni dupliquée, contrôle qualité automatique.",
    flow: {
      source: "Stations ESP32 et simulées, en MQTT chiffré",
      process: "Validation → TimescaleDB, règles de qualité",
      result: "Tableaux et alertes Grafana",
    },
    problem:
      "des capteurs sur batterie, une radio qui perd des messages, des capteurs qui se bloquent : des données à ne pas croire sur parole.",
    result:
      "une mesure toutes les dix secondes, rien de perdu ni de dupliqué, les valeurs douteuses marquées, des alertes dans Grafana.",
    stack: ["C++ / ESP32", "MQTT", "Python", "TimescaleDB", "Grafana"],
    skills: {
      ingestion: "MQTT, capteurs ESP32",
      modelling: "Agrégats continus",
      streaming: "MQTT au fil de l’eau",
      iac: "Docker Compose",
      tests: "pytest, intégration",
      quality: "Règles de qualité",
      monitoring: "Grafana, alertes",
      security: "TLS et ACL MQTT",
    },
    repo: `${GITHUB}/caribbean-sensor-pipeline`,
    links: [{ label: "Firmware : câblage et flash", href: `${GITHUB}/caribbean-sensor-pipeline/blob/main/firmware/README.md` }],
  },
  {
    slug: "caribbean-ais-stream",
    family: "Temps réel",
    color: "--family-stream",
    title: "Le trafic maritime des Petites Antilles, en continu",
    pitch:
      "Les positions des navires autour des Petites Antilles arrivent en continu ; elles sont nettoyées et rangées dans Kafka, avant d’être analysées en temps réel avec Flink.",
    clientValue:
      "un flux d’événements continu traité sans perte et dans l’ordre : la base de tout suivi en temps réel.",
    flow: {
      source: "Positions AIS des navires, en continu",
      process: "Kafka (Avro) → Flink SQL : trajets, anomalies",
      result: "Carte du trafic et métriques en direct",
    },
    problem:
      "savoir quels navires arrivent, partent ou attendent, et repérer les comportements anormaux, au fil de l’eau plutôt qu’une fois par jour.",
    result:
      "une chaîne temps réel sans perte ni doublon : activité des ports, temps passés à quai, anomalies détectées.",
    stack: ["Python", "Kafka", "Avro", "Flink SQL", "PostgreSQL", "Grafana"],
    skills: {
      ingestion: "WebSocket AIS → Kafka",
      modelling: "Flink SQL",
      streaming: "Kafka + Flink",
      iac: "Docker Compose",
      tests: "Intégration, bout en bout",
      quality: "Schémas Avro compatibles",
      monitoring: "Prometheus, Grafana",
      security: "Rôles PostgreSQL",
    },
    repo: `${GITHUB}/caribbean-ais-stream`,
  },
  {
    slug: "antilles-climate-lakehouse",
    family: "Lakehouse",
    color: "--family-lakehouse",
    title: "Le climat des Antilles depuis 1950, en lakehouse",
    pitch:
      "Toutes les mesures quotidiennes de Météo-France aux Antilles depuis 1950, rangées en couches bronze, argent et or, pour suivre l’évolution du climat de chaque île.",
    clientValue:
      "une plateforme Databricks type : historique fiable, corrections prises en compte, indicateurs qui ne trompent pas.",
    flow: {
      source: "Séries quotidiennes Météo-France depuis 1950",
      process: "Bronze → argent → or, en PySpark et Delta",
      result: "Anomalies, extrêmes et records par île",
    },
    problem:
      "2,3 millions de journées-stations depuis 1950, dans des fichiers réécrits plusieurs fois par mois et renommés chaque année.",
    result:
      "des tables Delta en trois couches, mises à jour par un job Databricks qui ne réécrit que ce qui a changé.",
    stack: ["PySpark", "Delta Lake", "Databricks", "Unity Catalog"],
    skills: {
      ingestion: "API data.gouv.fr",
      modelling: "Bronze, argent, or",
      orchestration: "Job Databricks",
      iac: "Asset Bundle",
      tests: "pytest sur Spark local",
      quality: "Codes qualité Météo-France",
      cloud: "Databricks",
    },
    repo: `${GITHUB}/antilles-climate-lakehouse`,
  },
  {
    slug: "antilles-hurricane-warehouse",
    family: "Entrepôt cloud",
    color: "--family-warehouse",
    title: "Les ouragans des Antilles depuis 1851, dans un entrepôt cloud",
    pitch:
      "Chaque ouragan passé près des Antilles depuis 1851, et la pluie et le vent sur chaque île ces jours-là depuis 1940, modélisés avec dbt dans BigQuery et mis à jour chaque jour.",
    clientValue:
      "un entrepôt cloud qui ne coûte rien : chaque requête plafonnée, chaque modèle chiffré avant d’être lancé, aucune clé stockée.",
    flow: {
      source: "Trajectoires NOAA depuis 1851, météo ERA5",
      process: "BigQuery + dbt, coût plafonné et vérifié",
      result: "Passages d’ouragans par île et par décennie",
    },
    problem:
      "la copie publique des trajectoires d’ouragans s’arrête en 2023, et la météo des îles n’y est pas.",
    result:
      "508 passages de tempêtes recensés près des six îles, mis à jour chaque jour pour moins de 1 % du quota gratuit.",
    stack: ["BigQuery", "dbt", "Python", "Terraform", "GitHub Actions"],
    skills: {
      ingestion: "Fichier NOAA, API ERA5",
      modelling: "dbt sur BigQuery",
      orchestration: "GitHub Actions, chaque jour",
      iac: "Terraform (Google Cloud)",
      tests: "Tests unitaires dbt",
      quality: "Tests de données dbt",
      cost: "Plafonds, dry run, budget",
      security: "Fédération d’identité, sans clé",
      cloud: "Google Cloud",
    },
    repo: `${GITHUB}/antilles-hurricane-warehouse`,
    docs: "https://tomtessondev.github.io/antilles-hurricane-warehouse/",
  },
  {
    slug: "antilles-weather-api",
    family: "API",
    color: "--family-api",
    title: "La météo des Antilles, servie par une API",
    pitch:
      "Les indicateurs quotidiens du pipeline batch, chargés chaque matin dans PostgreSQL et servis par une API REST documentée et protégée par des clés, hébergée sur Cloud Run.",
    clientValue:
      "une API de données prête pour la production : contrat typé, clés et quotas, documentation interactive, aucun coût au repos.",
    flow: {
      source: "marts.json du pipeline batch, chaque matin",
      process: "Chargement dans PostgreSQL (Neon), FastAPI",
      result: "API REST publique, documentée sur /docs",
    },
    problem:
      "les données du pipeline n’étaient lisibles que par ce site : aucune autre application ne pouvait les interroger proprement.",
    result:
      "une API publique, testable depuis le navigateur avec une clé de démo, qui dort quand personne ne l’appelle.",
    stack: ["FastAPI", "PostgreSQL (Neon)", "Cloud Run", "Terraform", "GitHub Actions"],
    skills: {
      ingestion: "marts.json → PostgreSQL",
      modelling: "Schéma SQL, migrations Alembic",
      serving: "REST FastAPI, OpenAPI",
      orchestration: "GitHub Actions, chaque jour",
      iac: "Terraform (Cloud Run)",
      tests: "pytest sur vrai PostgreSQL",
      quality: "Contrat Pydantic, fichiers refusés",
      cost: "Mise en veille, zéro instance",
      security: "Clés hachées, quotas, CI sans clé",
      cloud: "Google Cloud Run, Neon",
    },
    repo: `${GITHUB}/antilles-weather-api`,
    links: [{ label: "API en ligne (/docs)", href: "https://weather-api-v4mw6h4rqa-uk.a.run.app/docs" }],
  },
];

/** What every project shares, shown under the overview diagram. */
export const SHARED: { what: string; where: string }[] = [
  { what: "Les mêmes îles", where: "les six projets" },
  { what: "Open-Meteo", where: "batch · entrepôt · API" },
  { what: "dbt", where: "batch · entrepôt" },
  { what: "Terraform", where: "batch · entrepôt · API" },
  { what: "Grafana", where: "IoT · temps réel" },
  { what: "GitHub Actions", where: "les six projets" },
];

export function projectBySlug(slug: string): Project {
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) throw new Error(`Unknown project: ${slug}`);
  return project;
}

export function neighbours(slug: string): { previous: Project | null; next: Project | null } {
  const index = PROJECTS.indexOf(projectBySlug(slug));
  return { previous: PROJECTS[index - 1] ?? null, next: PROJECTS[index + 1] ?? null };
}
