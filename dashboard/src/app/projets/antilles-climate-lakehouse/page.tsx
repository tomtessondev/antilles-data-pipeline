import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Code, Lesson, P, Recipe, Section, Steps, Table } from "../caribbean-sensor-pipeline/_components/prose";
import catalog from "./_images/databricks-catalog.png";
import job from "./_images/databricks-job.png";
import anomaly from "./_images/temperature_anomaly.png";
import hotDays from "./_images/very_hot_days.png";

export const metadata: Metadata = {
  title: "Projet lakehouse : le climat des Antilles depuis 1950",
  description:
    "Comment fonctionne antilles-climate-lakehouse : les séries quotidiennes de Météo-France en couches bronze, argent et or, en PySpark et Delta Lake, déployées sur Databricks.",
};

const REPO = "https://github.com/tomtessondev/antilles-climate-lakehouse";

const SECTIONS: [string, string][] = [
  ["probleme", "Le problème"],
  ["resultats", "Ce que montrent les données"],
  ["architecture", "Architecture"],
  ["passage", "Un passage dans le pipeline"],
  ["regles", "Les règles qui comptent"],
  ["technologies", "Technologies"],
  ["depot", "Organisation du dépôt"],
  ["modifier", "Comment modifier"],
  ["tests", "Tests et CI"],
  ["lecons", "Choix et leçons"],
];

const TREE = `antilles-climate-lakehouse/
├── src/antilles_lakehouse/     le paquet Python (un module par couche)
│   ├── sources.py              API data.gouv.fr : liste et télécharge les fichiers 971/972
│   ├── bronze.py               lignes brutes en texte, une copie courante par fichier
│   ├── silver.py               typage, bornes, codes qualité, MERGE ; stations et territoires
│   ├── gold.py                 climat mensuel, normales, anomalies, extrêmes, records
│   ├── tables.py               noms des tables : locales ou antilles.climate.*
│   ├── jobs.py                 les quatre étapes du job : antilles-lakehouse <étape>
│   └── spark.py                Spark local avec Delta (tests, exécution locale)
├── databricks.yml              le bundle Databricks (wheel + job)
├── resources/climate_job.yml   le job serverless : ingest → bronze → silver → gold
├── scripts/charts.py           les graphiques du README, depuis les tables or
├── tests/                      pytest sur un Spark local, fichiers au format Météo-France
└── .github/workflows/ci.yml    lint, types, tests (Python 3.12, Java 17)`;

const IMAGE = "h-auto w-full rounded-lg border border-border";

export default function LakehouseProjectPage() {
  return (
    <article className="space-y-12">
      <header className="max-w-3xl space-y-3">
        <Link href="/projets" className="text-sm text-ink-secondary hover:text-ink">
          ← Tous les projets
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Le climat de la Guadeloupe et de la Martinique depuis 1950, en lakehouse
        </h1>
        <p className="text-ink-secondary">
          <Code>antilles-climate-lakehouse</Code> reprend les mesures quotidiennes de toutes les
          stations Météo-France des deux îles depuis 1950 et les range en trois couches (bronze,
          argent, or) avec PySpark et Delta Lake. Le même code est testé sur un ordinateur et
          tourne sur Databricks.
        </p>
        <p className="text-sm text-ink-muted">
          Code source :{" "}
          <a href={REPO} className="underline hover:text-ink">
            github.com/tomtessondev/antilles-climate-lakehouse
          </a>
        </p>
      </header>

      <nav aria-label="Sommaire" className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-ink-muted">Sommaire</p>
        <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-ink-secondary hover:text-ink hover:underline">
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="probleme" title="Le problème et ce que fait le projet">
        <P>
          Météo-France publie en données ouvertes les relevés quotidiens de chaque station :
          pluie, températures, vent, avec un code qualité par mesure. Pour la Guadeloupe et la
          Martinique, cela fait 2,3 millions de journées-stations depuis 1950, réparties sur 157
          stations. Les fichiers sont réécrits plusieurs fois par mois, l’historique compris, et
          renommés chaque année quand la période change.
        </P>
        <P>
          Le projet en fait un lakehouse : des tables Delta en trois couches, du fichier brut aux
          indicateurs climatiques, mises à jour par un job Databricks qui ne réécrit que ce qui a
          changé. Pour un client, c’est le schéma type d’une plateforme Databricks : un historique
          fiable, des corrections prises en compte, des indicateurs qui ne trompent pas.
        </P>
      </Section>

      <Section id="resultats" title="Ce que montrent les données">
        <Image src={anomaly} alt="Écart de la température maximale à la normale 1991-2020, moyenne annuelle, Guadeloupe et Martinique, de 1950 à 2025" className={IMAGE} />
        <P>
          Les deux îles se réchauffent ensemble : l’écart moyen de la température maximale à sa
          normale 1991–2020 passe d’environ −1 °C dans les années 1950 à 1970 à +1,2 °C en 2024,
          l’année la plus chaude de la série.
        </P>
        <Image src={hotDays} alt="Nombre de jours à 32 °C ou plus par an, moyenne par station à longue série, Guadeloupe et Martinique, de 1991 à 2025" className={IMAGE} />
        <P>
          Les jours à 32 °C ou plus sont comptés sur un panel fixe de stations à longue série :
          10 en Martinique, mais seulement 2 en Guadeloupe, où peu de stations ont une série de
          température complète depuis 1991. Le graphique l’indique dans sa légende.
        </P>
      </Section>

      <Section id="architecture" title="Architecture">
        <Table
          head={["Couche", "Contenu", "Règle"]}
          rows={[
            ["Landing", "Les fichiers .csv.gz téléchargés, avec une empreinte (sha1)", "Les fichiers sont trouvés par l’API data.gouv.fr, jamais par une adresse écrite en dur"],
            ["Bronze", "Chaque ligne publiée, toutes les colonnes en texte", "Une copie courante par fichier ; l’historique Delta garde les précédentes"],
            ["Argent", "Une ligne typée par station et par jour, et les stations", "MERGE qui ne réécrit que les lignes réellement modifiées"],
            ["Or", "Climat mensuel, anomalies, extrêmes, records", "Valeurs douteuses exclues, panel de stations à longue série"],
          ]}
        />
        <P>
          Sur Databricks, les quatre étapes sont les quatre tâches d’un job serverless, déployé
          avec un Asset Bundle ; les tables vivent dans Unity Catalog, sous{" "}
          <Code>antilles.climate</Code>. Le job complet tourne en 3 minutes.
        </P>
        <Image src={job} alt="Le job Databricks : les tâches ingest, bronze, silver et gold, toutes réussies" className={IMAGE} />
        <Image src={catalog} alt="Le schéma antilles.climate dans Unity Catalog : sept tables et le volume landing, avec un extrait de la table gold_extremes" className={IMAGE} />
      </Section>

      <Section id="passage" title="Un passage dans le pipeline">
        <P>Suivons une correction publiée par Météo-France sur une station de Martinique.</P>
        <Steps
          items={[
            {
              title: "L’API annonce un fichier modifié",
              body: (
                <>
                  L’étape <Code>ingest</Code> lit le jeu de données sur data.gouv.fr et garde les
                  fichiers « RR-T-Vent » de 971 et 972. Elle les télécharge dans le volume{" "}
                  <Code>landing</Code> en calculant leur empreinte : l’API n’en publie pas.
                </>
              ),
            },
            {
              title: "Bronze remplace la copie de ce fichier",
              body: (
                <>
                  L’empreinte a changé : les lignes de ce fichier remplacent les anciennes
                  (<Code>replaceWhere</Code>). Les autres fichiers ne sont pas touchés, et l’ancienne
                  copie reste lisible dans l’historique Delta.
                </>
              ),
            },
            {
              title: "Argent ne réécrit que la ligne corrigée",
              body: (
                <>
                  Pour chaque station et chaque jour, la ligne du fichier le plus récent gagne. Le{" "}
                  <Code>MERGE</Code> compare valeurs et codes qualité : seule la journée corrigée est
                  réécrite. Une republication identique n’écrit rien.
                </>
              ),
            },
            {
              title: "Or recalcule les indicateurs",
              body: (
                <>
                  Le mois concerné, sa normale, l’anomalie, le compte de jours chauds du panel et
                  les records sont recalculés à partir de l’argent.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="regles" title="Les règles qui comptent">
        <Table
          head={["Question", "Règle", "Pourquoi"]}
          rows={[
            ["Le fichier 971, c’est la Guadeloupe ?", "Pas seulement : il contient aussi Saint-Barthélemy et Saint-Martin. Chaque station reçoit son territoire selon le code commune de son identifiant", "Ces îles sont à plus de 200 km au nord, avec un autre climat"],
            ["Comment compter sur 35 ans ?", "Par station d’abord, puis moyenne sur un panel fixe de stations présentes 80 % des jours de chaque décennie", "Additionner les stations du moment montrerait une tendance due au réseau, pas au climat"],
            ["Et les valeurs douteuses ?", "Gardées en argent avec leur code, exclues de l’or ; les valeurs physiquement impossibles deviennent vides", "Un record ou une normale ne doit pas reposer sur une mesure mise en doute"],
            ["Qu’est-ce qu’une normale ?", "Moyenne 1991–2020 par station et par mois, seulement si au moins 20 années ont ce mois complet", "Un mois à moitié vide fausserait la référence"],
            ["Seuils", "Jour très chaud : 32 °C ou plus ; forte pluie : 50 mm ou plus", "Des seuils simples, lisibles par tous"],
          ]}
        />
      </Section>

      <Section id="technologies" title="Les technologies">
        <Table
          head={["Technologie", "Rôle ici", "Pourquoi ce choix", "Alternatives"]}
          rows={[
            ["PySpark 4.0", "Toutes les transformations", "Le moteur des plateformes Databricks ; la même version que l’environnement serverless", "pandas, Polars (une seule machine)"],
            ["Delta Lake", "Format des tables", "MERGE, remplacement ciblé, historique et retour dans le temps sur des fichiers Parquet", "Iceberg, Hudi"],
            ["Databricks Free Edition", "Exécution du job, catalogue", "Gratuit, serverless, Unity Catalog inclus", "Spark sur un serveur, EMR"],
            ["Unity Catalog", "Catalogue, schéma, tables, volume", "Droits et organisation des données à un seul endroit", "Hive metastore"],
            ["Databricks Asset Bundles", "Déploiement du job", "Le job et son code décrits en fichiers, déployés en une commande", "Création à la main dans l’interface, Terraform"],
            ["httpx", "Appels à l’API data.gouv.fr", "Client HTTP moderne, téléchargement en flux", "requests"],
            ["pytest + respx", "Tests sur un Spark local, HTTP simulé", "Chaque couche testée sans compte Databricks ni réseau", "unittest"],
            ["matplotlib", "Graphiques du README", "Générés par un script à partir des tables or", "Plotly"],
            ["GitHub Actions", "Intégration continue", "Lint, types et tests Spark à chaque pull request", "GitLab CI"],
          ]}
        />
      </Section>

      <Section id="depot" title="Organisation du dépôt">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
          <pre className="font-mono text-[12.5px] leading-relaxed text-ink">{TREE}</pre>
        </div>
      </Section>

      <Section id="modifier" title="Comment modifier le code">
        <div className="space-y-3">
          <Recipe title="Ajouter un indicateur en or">
            <p>Une fonction dans <Code>gold.py</Code> qui part de la table propre (valeurs douteuses déjà exclues), une entrée dans le dictionnaire des tables de <Code>build_gold</Code>, et un test dans <Code>tests/test_gold.py</Code> sur des données fabriquées.</p>
          </Recipe>
          <Recipe title="Ajouter une mesure (par exemple l’humidité)">
            <p>Les fichiers « autres paramètres » contiennent l’humidité et l’ensoleillement : élargir le filtre de <Code>sources.py</Code>, ajouter la mesure, ses bornes et son code qualité dans <Code>MEASURES</Code> (<Code>silver.py</Code>), puis compléter les tests.</p>
          </Recipe>
          <Recipe title="Lancer et déployer">
            <p><Code>make check</Code> : style, types et tests sur un Spark local (Java 17).</p>
            <p><Code>make run-local</Code> : le pipeline complet sur les vrais fichiers, tables sous <Code>data/</Code>.</p>
            <p><Code>databricks bundle deploy</Code> puis <Code>databricks bundle run climate</Code> : le job sur Databricks.</p>
          </Recipe>
        </div>
      </Section>

      <Section id="tests" title="Tests et intégration continue">
        <Table
          head={["Couche", "Ce qui est vérifié"]}
          rows={[
            ["Sources", "Seuls les bons fichiers sont retenus ; l’empreinte est calculée pendant le téléchargement"],
            ["Bronze", "Un fichier identique n’écrit rien ; un fichier republié remplace ses lignes, l’ancienne version reste lisible"],
            ["Argent", "Typage et bornes ; changement de période ; une correction ne réécrit qu’une ligne ; une republication identique rien ; territoires"],
            ["Or", "Seuils, valeurs douteuses exclues, mois incomplets, anomalies, panel, records datés"],
            ["Job", "Les quatre étapes enchaînées comme sur Databricks, sur des fichiers simulés"],
          ]}
        />
        <P>Les tests tournent sur un Spark local avec Delta, sans compte Databricks : 20 tests, dans la CI à chaque pull request.</P>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <div className="space-y-5">
          <Lesson title="Spark ne doit pas être une dépendance du job">
            Sur Databricks, l’environnement serverless fournit Spark. Un paquet qui déclarerait
            pyspark le remplacerait : PySpark n’est installé qu’en local, dans une option à part.
          </Lesson>
          <Lesson title="Une expression plutôt qu’une fonction Python">
            Le territoire d’une station est une expression Spark (<Code>CASE</Code>), pas une
            fonction Python : pas d’aller-retour vers un processus Python, et le même plan
            d’exécution partout.
          </Lesson>
          <Lesson title="Le réseau de stations change plus vite que le climat">
            Des stations ouvrent et ferment chaque décennie. Compter les jours chauds de toutes les
            stations du moment aurait montré une hausse due au réseau ; d’où le panel fixe, et sa
            taille affichée avec chaque chiffre.
          </Lesson>
          <Lesson title="Des records à lire avec leur contexte">
            Les journées les plus chaudes de la série, 38,4 à 38,7 °C en 2024 et 2025, sont des
            valeurs validées de stations de réseaux secondaires. Elles restent dans les données,
            et la documentation le dit.
          </Lesson>
        </div>
      </Section>

      <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-ink-muted">
        <a href={REPO} className="underline hover:text-ink">
          Dépôt GitHub
        </a>
        <a href={`${REPO}/blob/main/README.md`} className="underline hover:text-ink">
          README (anglais)
        </a>
        <Link href="/projets" className="underline hover:text-ink">
          Les autres projets
        </Link>
      </footer>
    </article>
  );
}
