import type { Metadata } from "next";

import { AssetGraph, BatchArchitecture, CiDiagram, LakeDiagram } from "@/components/docs/batch-diagrams";
import {
  Code,
  DocHeader,
  Lessons,
  Prose,
  Recipe,
  RepoTree,
  Section,
  Shell,
  Steps,
  type Tech,
  TechTable,
  Toc,
} from "@/components/docs/doc-ui";

export const metadata: Metadata = {
  title: "antilles-data-pipeline : documentation",
  description:
    "Comment fonctionne le pipeline batch météo et qualité de l’air des Antilles : architecture, technologies, organisation du code, recettes de modification.",
};

const REPO = "https://github.com/tomtessondev/antilles-data-pipeline";

const TOC = [
  { id: "probleme", label: "Le problème et la solution" },
  { id: "architecture", label: "Architecture" },
  { id: "passage", label: "Un run, étape par étape" },
  { id: "lac", label: "Le lac S3 et la règle « la plus récente gagne »" },
  { id: "orchestration", label: "Orchestration Dagster" },
  { id: "technologies", label: "Les technologies" },
  { id: "depot", label: "Organisation du dépôt" },
  { id: "modifier", label: "Comment modifier le projet" },
  { id: "tests", label: "Tests et CI" },
  { id: "lecons", label: "Choix de conception et leçons" },
];

const TECHS: Tech[] = [
  {
    name: "Python 3.11+",
    role: "Extraction des API, écriture du lac, chargement, export, CLI.",
    why: "Le langage standard de la data ; typé strictement (mypy) pour rester fiable.",
    instead: "Go, Node.js",
  },
  {
    name: "httpx + tenacity",
    role: "Appels HTTP à Open-Meteo, avec nouvelles tentatives à délai croissant.",
    why: "Une API publique a des pannes passagères : chaque appel est retenté avant d’échouer.",
    instead: "requests + urllib3 Retry",
  },
  {
    name: "Amazon S3 (lac)",
    role: "Garde chaque extraction en Parquet, rangée par date d’extraction.",
    why: "Stockage durable et bon marché ; l’historique survit aux runs.",
    instead: "Google Cloud Storage, Azure Blob, Cloudflare R2",
  },
  {
    name: "Parquet",
    role: "Format des fichiers du lac.",
    why: "Format colonnaire compressé, lu nativement par DuckDB, Spark, Athena…",
    instead: "CSV, JSON lines, Avro",
  },
  {
    name: "DuckDB",
    role: "Base analytique locale : tables brutes, modèles dbt ; lit et écrit S3 directement.",
    why: "Une base SQL complète dans un fichier, sans serveur : idéale à cette échelle.",
    instead: "PostgreSQL, BigQuery, Snowflake",
  },
  {
    name: "dbt",
    role: "Transformations SQL : vues de staging, faits journaliers incrémentaux, dimension villes, tests.",
    why: "Le SQL versionné, testé et documenté, avec la lignée entre modèles.",
    instead: "SQL à la main, SQLMesh",
  },
  {
    name: "Dagster",
    role: "Orchestration : décrit le pipeline en « assets », relance, planifie à 06:00.",
    why: "Pense en données produites (assets) plutôt qu’en tâches ; intégration dbt native.",
    instead: "Airflow, Prefect, cron",
  },
  {
    name: "Docker / Docker Compose",
    role: "Image de la CLI, image Dagster ; stack locale (Dagster + S3 local SeaweedFS).",
    why: "Le même environnement partout, lancé en une commande.",
    instead: "Environnements virtuels seuls",
  },
  {
    name: "GitHub Actions",
    role: "CI à chaque PR, run quotidien du pipeline, publication de la doc dbt.",
    why: "Gratuit pour un dépôt public, au plus près du code.",
    instead: "GitLab CI, CircleCI",
  },
  {
    name: "Terraform",
    role: "Crée le bucket du lac, l’utilisateur IAM du CI, l’alerte budgétaire, l’état distant.",
    why: "L’infrastructure est du code relu et versionné, pas des clics dans la console.",
    instead: "CloudFormation, Pulumi, AWS CDK",
  },
  {
    name: "Next.js + TypeScript",
    role: "Ce site : carte, classements, courbes, calendrier des poussières.",
    why: "Pages générées côté serveur et mises en cache ; le navigateur reçoit peu de code.",
    instead: "Streamlit, Grafana, React seul",
  },
  {
    name: "zod",
    role: "Valide le fichier JSON exporté par Python avant de l’afficher.",
    why: "Le contrat entre Python et TypeScript est vérifié, et testé en CI.",
    instead: "io-ts, valibot",
  },
  {
    name: "Recharts, d3-geo",
    role: "Courbes et barres ; projection de la carte des communes côté serveur.",
    why: "Graphiques React légers ; la carte arrive en SVG déjà projeté.",
    instead: "Chart.js, ECharts, Leaflet",
  },
  {
    name: "Vercel",
    role: "Hébergement du site, relit les données toutes les heures (ISR).",
    why: "Déploiement à chaque merge, sans serveur à gérer.",
    instead: "Netlify, Cloudflare Pages",
  },
  {
    name: "pytest, respx, moto, vitest",
    role: "Tests Python (API simulées, S3 simulé), tests TypeScript.",
    why: "Les tests ne touchent jamais les vraies API ni AWS.",
    instead: "unittest, Jest",
  },
];

const TREE: [string, string][] = [
  ["src/antilles_pipeline/", "Le package Python"],
  ["  config.py", "Villes suivies, variables, réglages lus dans l’environnement"],
  ["  extract.py", "Appels Open-Meteo, filtre des heures futures, nouvelles tentatives"],
  ["  lake.py", "Écriture Parquet dans le lac, reconstruction des tables brutes"],
  ["  load.py", "Schéma « raw » de DuckDB, villes, chargement du jeu de test"],
  ["  export.py", "Marts → un seul document JSON pour le site"],
  ["  cli.py", "Commandes antilles-pipeline run et export"],
  ["  orchestration/", "Assets, job et planning Dagster"],
  ["transform/", "Projet dbt"],
  ["  models/staging/", "Sources, vues typées et renommées"],
  ["  models/marts/", "dim_location, fct_daily_weather, fct_daily_air_quality"],
  ["  tests/", "Tests SQL « une ligne par ville et par jour »"],
  ["dashboard/", "Ce site (Next.js)"],
  ["  src/lib/", "Contrat zod, calculs (périodes, tendances), géographie"],
  ["  src/components/", "Carte, classement, courbes, calendrier"],
  ["  data/", "Jeu d’exemple embarqué, contours des communes (IGN)"],
  ["infra/", "Terraform : bucket, IAM, budget ; bootstrap/ pour l’état distant"],
  ["tests/", "Tests Python, avec les réponses d’API enregistrées dans fixtures/"],
  [".github/workflows/", "ci.yml (PR), pipeline.yml (quotidien), docs.yml (doc dbt)"],
  ["docker-compose.yml", "Dagster (interface + planificateur) et S3 local"],
  ["Makefile", "Raccourcis : install, check, transform, dagster, up…"],
];

export default function BatchProjectPage() {
  return (
    <article lang="fr" className="space-y-10">
      <DocHeader
        eyebrow="Projet 1 · Batch"
        title="antilles-data-pipeline"
        lead={
          <>
            <p>
              La météo et la qualité de l’air de six villes de Guadeloupe et de Martinique,
              collectées chaque matin, stockées, transformées, testées, puis affichées sur ce site.
            </p>
            <p>
              Pour un client, c’est le modèle d’un pipeline de données complet et automatique :
              des API externes jusqu’à un tableau de bord, avec l’historique conservé, des tests à
              chaque étape et une infrastructure décrite en code.
            </p>
          </>
        }
        links={[
          { href: REPO, label: "Code sur GitHub" },
          { href: "/", label: "Le site en ligne" },
          { href: "https://tomtessondev.github.io/antilles-data-pipeline/", label: "Documentation dbt" },
        ]}
      />

      <Toc items={TOC} />

      <Section id="probleme" title="Le problème et la solution">
        <Prose>
          <p>
            Open-Meteo publie gratuitement la météo et la qualité de l’air (dont les poussières du
            Sahara, modèle CAMS) heure par heure. Mais une API ne garde pas d’historique propre, ne
            dit pas si une valeur est une mesure ou une prévision, et ne calcule pas d’indicateurs.
          </p>
          <p>
            Le projet extrait chaque jour les <strong>31 derniers jours</strong>, garde chaque
            extraction dans un <strong>lac de données</strong> sur S3, reconstruit une base propre
            avec la dernière version de chaque heure, calcule des{" "}
            <strong>indicateurs journaliers</strong> (températures, pluie, PM10 face à la limite
            européenne de 50 µg/m³, pic de poussière) et les publie pour ce site.
          </p>
        </Prose>
      </Section>

      <Section id="architecture" title="Architecture">
        <BatchArchitecture />
      </Section>

      <Section id="passage" title="Un run, étape par étape">
        <Steps
          steps={[
            {
              title: "06:00 aux Antilles : GitHub Actions démarre",
              body: (
                <>
                  Le workflow <Code>pipeline.yml</Code> s’authentifie auprès d’AWS, installe le
                  package et lance le job Dagster <Code>daily_pipeline</Code>.
                </>
              ),
            },
            {
              title: "Extraction",
              body: (
                <>
                  Pour chaque ville, deux appels à Open-Meteo (météo, qualité de l’air). Les heures
                  postérieures à maintenant sont des prévisions : elles sont retirées. Un appel en
                  échec est retenté avec un délai croissant (<Code>extract.py</Code>).
                </>
              ),
            },
            {
              title: "Écriture dans le lac",
              body: (
                <>
                  Les lignes sont ajoutées en Parquet dans{" "}
                  <Code>s3://…/weather_hourly/extracted_date=AAAA-MM-JJ/</Code>. Rien n’est
                  jamais réécrit (<Code>lake.py</Code>).
                </>
              ),
            },
            {
              title: "Reconstruction des tables brutes",
              body: (
                <>
                  DuckDB relit tout le lac et garde, pour chaque ville et chaque heure, la valeur
                  extraite le plus récemment.
                </>
              ),
            },
            {
              title: "Transformation et tests dbt",
              body: (
                <>
                  Les vues de staging typent et renomment ; les faits journaliers ne recalculent
                  que les jours qui ont reçu de nouvelles heures. Une quarantaine de tests
                  vérifient clés, valeurs et unicité ; un test rouge arrête tout avant l’export.
                </>
              ),
            },
            {
              title: "Export et publication",
              body: (
                <>
                  Les marts deviennent <Code>marts.json</Code>, poussé comme unique commit de la
                  branche <Code>data</Code>. Le site le relit au plus toutes les heures et le
                  valide avec zod avant de l’afficher.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="lac" title="Le lac S3 et la règle « la plus récente gagne »">
        <LakeDiagram />
        <Prose>
          <p>
            Ranger les fichiers par <strong>date d’extraction</strong> plutôt que par date de
            mesure garde le lac en ajout seul : un run ne modifie jamais un fichier existant. En
            contrepartie, le chargement relit tous les fichiers, ce qui reste minuscule ici
            (quelques Mo par an).
          </p>
        </Prose>
      </Section>

      <Section id="orchestration" title="Orchestration Dagster">
        <AssetGraph />
        <Prose>
          <p>
            Le même job tourne à deux endroits : le planificateur Dagster dans Docker Compose (en
            local, interface sur le port 3070) et le cron GitHub Actions en production. Les
            extractions ont une politique de nouvelles tentatives (3 fois, à partir de 5 minutes).
            Toutes les étapes écrivent dans le même fichier DuckDB, qui n’accepte qu’un écrivain :
            elles s’exécutent donc l’une après l’autre.
          </p>
        </Prose>
      </Section>

      <Section id="technologies" title="Les technologies">
        <TechTable rows={TECHS} />
      </Section>

      <Section id="depot" title="Organisation du dépôt">
        <RepoTree entries={TREE} />
      </Section>

      <Section id="modifier" title="Comment modifier le projet">
        <Prose>
          <p>Mise en route, puis vérifications à lancer avant chaque commit :</p>
        </Prose>
        <Shell>{`python -m venv .venv && source .venv/bin/activate
make install        # dépendances, dont Dagster et dbt
make check          # ruff, mypy, pytest
make fixture        # charge les données de test (sans réseau)
make transform      # dbt build : modèles + tests
make dagster        # interface Dagster en local
cd dashboard && npm ci && npm run dev    # ce site sur localhost:3000`}</Shell>
        <div className="grid gap-4 lg:grid-cols-2">
          <Recipe
            title="Ajouter une ville"
            files={["src/antilles_pipeline/config.py", "dashboard/src/lib/geo.test.ts"]}
          >
            <ol>
              <li>
                Ajouter une ligne <Code>Location(code, nom, territoire, latitude, longitude)</Code>{" "}
                à <Code>DEFAULT_LOCATIONS</Code>.
              </li>
              <li>Le prochain run l’extrait ; dbt et le site la prennent sans autre changement.</li>
              <li>
                Sur la carte, la ville est rattachée à sa commune automatiquement ; ajouter un cas
                au test <Code>geo.test.ts</Code>.
              </li>
            </ol>
          </Recipe>
          <Recipe
            title="Ajouter une mesure, de l’API au site"
            files={[
              "config.py",
              "load.py",
              "transform/models/staging/*.sql",
              "transform/models/marts/*.sql + .yml",
              "dashboard/src/lib/schema.ts",
              "dashboard/src/lib/measures.ts",
            ]}
          >
            <ol>
              <li>Ajouter la variable Open-Meteo dans la liste de <Code>config.py</Code> et le champ dans le dataclass d’extraction.</li>
              <li>Ajouter la colonne au DDL de la table brute (<Code>load.py</Code>).</li>
              <li>La renommer et la typer dans la vue de staging, l’agréger dans le fait journalier, la décrire et la tester dans le <Code>.yml</Code>.</li>
              <li>L’ajouter au schéma zod, puis comme nouvelle mesure dans <Code>measures.ts</Code> : elle apparaît dans les sélecteurs, la carte et le classement.</li>
              <li>Régénérer <Code>dashboard/data/sample.json</Code> avec <Code>antilles-pipeline export</Code>.</li>
            </ol>
          </Recipe>
          <Recipe title="Ajouter un modèle dbt" files={["transform/models/marts/mon_modele.sql", "mon_modele.yml"]}>
            <ol>
              <li>Écrire le SQL en s’appuyant sur <Code>ref()</Code> et <Code>source()</Code>.</li>
              <li>Le <Code>.yml</Code> est obligatoire : description, colonnes, au moins un test.</li>
              <li>
                <Code>make transform</Code> ; Dagster le découvre tout seul au prochain chargement.
              </li>
            </ol>
          </Recipe>
          <Recipe title="Changer l’infrastructure AWS" files={["infra/*.tf"]}>
            <ol>
              <li>
                Modifier le Terraform, puis <Code>terraform plan</Code> avec le profil AWS du
                projet.
              </li>
              <li>Relire le plan ; n’appliquer qu’après validation (<Code>terraform apply</Code>).</li>
              <li>La CI vérifie le format et la validité à chaque PR.</li>
            </ol>
          </Recipe>
        </div>
      </Section>

      <Section id="tests" title="Tests et CI">
        <CiDiagram />
        <Prose>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Python</strong> : extraction contre des API simulées (respx), lac local et
              S3 simulé par un serveur moto, chargement idempotent, et le job Dagster complet de
              bout en bout.
            </li>
            <li>
              <strong>dbt</strong> : modèles construits deux fois sur les données de test pour
              exercer le chemin incrémental, puis fraîcheur des sources.
            </li>
            <li>
              <strong>Site</strong> : lint, types, tests unitaires, et un{" "}
              <strong>test de contrat</strong> qui valide un export frais de Python avec le schéma
              zod.
            </li>
            <li>
              <strong>Docker et Terraform</strong> : les deux images se construisent ; le
              Terraform est formaté et valide.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <Lessons
          items={[
            {
              title: "Des prévisions stockées comme des mesures",
              body: "L’API renvoie les heures passées et les prévisions du jour dans le même tableau. Le dernier jour mélangeait les deux, jusqu’au filtre « pas après maintenant », en heure locale.",
            },
            {
              title: "L’incrémental qui recalcule les bons jours",
              body: "Chaque run renvoie plusieurs jours. Ne traiter que les nouvelles lignes aurait agrégé des journées partielles : le modèle recalcule chaque jour touché, à partir de toutes ses heures.",
            },
            {
              title: "Vérifier les données avant de concevoir",
              body: "La source envisagée au départ (prix des carburants) n’avait aucune station aux Antilles. Le projet a pris la qualité de l’air à la place.",
            },
            {
              title: "Le contrat entre Python et TypeScript",
              body: "Renommer une colonne dans dbt casse la PR, pas le site : la CI valide un export frais avec le schéma zod du site.",
            },
            {
              title: "Regarder la page, pas seulement les tests",
              body: "Tailwind v4 supprimait les variables CSS utilisées seulement depuis JavaScript : carte noire, courbes invisibles, tous les tests verts. C’est la capture d’écran qui l’a révélé.",
            },
            {
              title: "Une organisation AWS qui interdit OIDC",
              body: "Le compte en formule gratuite refuse les fournisseurs OIDC. La simulation des droits l’a montré avant tout apply ; le CI utilise un utilisateur IAM limité à un bucket, l’option OIDC reste prête dans le Terraform.",
            },
            {
              title: "Le lac rend la base jetable",
              body: "Avant le lac, chaque run repartait de zéro avec 31 jours. Avec le lac, la base est reconstruite avec tout l’historique.",
            },
            {
              title: "Les images Docker disparaissent",
              body: "MinIO ne publie plus d’images : le S3 local est SeaweedFS, et les tests S3 parlent à un serveur moto.",
            },
          ]}
        />
      </Section>
    </article>
  );
}
