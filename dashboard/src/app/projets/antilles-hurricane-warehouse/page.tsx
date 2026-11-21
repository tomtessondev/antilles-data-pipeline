import type { Metadata } from "next";
import Image from "next/image";

import { ProjectLayout } from "@/components/project/project-layout";
import { Code, Lesson, P, Recipe, Section, Steps, Table } from "@/components/project/prose";

import { WarehouseArchitecture } from "./_components/architecture";
import { HurricaneResults } from "./_components/hurricane-results";
import perIsland from "./_images/hurricanes_per_island.png";

export const metadata: Metadata = {
  title: "Projet entrepôt cloud : les ouragans des Antilles depuis 1851",
  description:
    "Comment fonctionne antilles-hurricane-warehouse : les trajectoires d’ouragans de la NOAA et la météo des îles dans BigQuery, modélisées avec dbt, à coût maîtrisé et sans clé stockée.",
};

const SECTIONS: [string, string][] = [
  ["probleme", "Le problème"],
  ["resultats", "Ce que montrent les données"],
  ["architecture", "Architecture"],
  ["passage", "Un passage dans l’entrepôt"],
  ["couts", "Maîtriser les coûts"],
  ["securite", "Une CI sans clé"],
  ["technologies", "Technologies"],
  ["depot", "Organisation du dépôt"],
  ["modifier", "Comment modifier"],
  ["tests", "Tests et CI"],
  ["lecons", "Choix et leçons"],
];

const TREE = `antilles-hurricane-warehouse/
├── src/hurricane_loaders/      le chargement Python
│   ├── tracks.py               fichier IBTrACS de la NOAA → raw.tracks
│   ├── weather.py              API Open-Meteo (réanalyse) → raw.island_weather
│   ├── cli.py                  hurricane-load tracks | weather
│   ├── cost_check.py           dry run de chaque modèle, échec au-delà de 200 Mo
│   └── islands.py              les six îles (identique au seed, un test le vérifie)
├── models/                     dbt : staging, intermediate, marts (+ tests unitaires)
├── macros/                     catégorie Saffir-Simpson, noms des datasets
├── seeds/islands.csv           les points des six îles
├── profiles.yml                connexion BigQuery, plafond de 1 Go par requête
├── infra/                      Terraform : datasets, compte de service, fédération, budget
├── scripts/charts.py           les graphiques du README
└── .github/workflows/          ci.yml, daily.yml (06:00 UTC), docs.yml (GitHub Pages)`;

const IMAGE = "h-auto w-full rounded-lg border border-border";

export default function HurricaneWarehouseProjectPage() {
  return (
    <ProjectLayout slug="antilles-hurricane-warehouse" sections={SECTIONS} diagram={<WarehouseArchitecture />}>

      <Section id="probleme" title="Le problème et ce que fait le projet">
        <P>
          La NOAA publie les « meilleures trajectoires » de chaque tempête : une position, un vent
          et une pression toutes les 3 ou 6 heures, depuis 1851. Le fichier de l’Atlantique Nord
          fait 60 Mo et 126 000 positions. La copie publique dans BigQuery s’arrête à la saison
          2023 : le projet charge donc le fichier officiel, à jour.
        </P>
        <P>
          Le projet en fait un entrepôt de données : des tables BigQuery modélisées avec dbt,
          testées, documentées, reconstruites chaque matin par GitHub Actions. Pour un client,
          c’est ce que demandent les missions « entrepôt cloud » : dbt sur un vrai entrepôt, des
          coûts sous contrôle et un accès sécurisé sans clé.
        </P>
      </Section>

      <Section id="resultats" title="Ce que montrent les données">
        <P>
          Un passage, c’est une tempête dont la trajectoire est venue à moins de 100 km du point
          d’une île ; sa catégorie est celle de son vent le plus fort dans ce rayon. Les années
          2010 comptent deux ouragans de catégorie 5, en septembre 2017 : Irma à Saint-Martin et
          Saint-Barthélemy, Maria à la Dominique (à 6 km), mais aussi à 72 km de la Guadeloupe et
          62 km de la Martinique, encore en catégorie 5 dans ce rayon de 100 km.
        </P>
        <P>
          L’explorateur ci-dessous lit l’export que le build quotidien publie depuis les marts :
          les trajectoires des tempêtes passées près des îles, leurs passages, la météo des îles
          autour de chaque passage et le décompte par décennie. Choisissez une période, une île,
          une catégorie minimale, puis une tempête.
        </P>
        <HurricaneResults />
        <Image src={perIsland} alt="Nombre d’ouragans passés à moins de 100 km de chaque île depuis 1950, par catégorie : Saint-Martin 14, Saint-Barthélemy 13, Guadeloupe 12, Dominique 8, Martinique 7, Sainte-Lucie 6" className={IMAGE} />
        <P>
          Depuis 1950, les îles du nord sont les plus exposées : 14 ouragans à Saint-Martin,
          6 à Sainte-Lucie. La météo des îles complète le tableau : le jour où Maria est passée
          à 6 km de la Dominique, la réanalyse donne 229 mm de pluie et des rafales de 170 km/h ;
          pour Hugo en Guadeloupe en 1989, 129 mm.
        </P>
      </Section>

      <Section id="architecture" title="Architecture">
        <Table
          head={["Couche", "Contenu", "Règle"]}
          rows={[
            ["raw", "Le fichier IBTrACS et la météo Open-Meteo, chargés par Python", "Les trajectoires sont remplacées entières (la NOAA révise le passé) ; la météo recharge ses dix derniers jours (la réanalyse les complète)"],
            ["staging", "Positions typées, météo quotidienne, les six îles (seed)", "Partitionnées par saison ou par mois, regroupées par tempête ou par île ; la météo est incrémentale"],
            ["intermediate", "Chaque position à moins de 100 km d’une île, avec sa distance", "Calcul géographique de BigQuery (ST_DWITHIN)"],
            ["marts", "Passages, passages par décennie, saison en cours, météo des passages", "Une ligne par tempête et par île ; catégorie Saffir-Simpson"],
          ]}
        />
        <P>
          Trois workflows GitHub Actions font tourner l’ensemble : <Code>ci.yml</Code> à chaque
          pull request, <Code>daily.yml</Code> chaque matin à 06:00 UTC (chargement puis{" "}
          <Code>dbt build</Code>) et <Code>docs.yml</Code>, qui publie la documentation dbt
          (modèles, colonnes, tests, graphe de dépendances) sur GitHub Pages.
        </P>
      </Section>

      <Section id="passage" title="Un passage dans l’entrepôt">
        <P>Suivons l’ouragan Maria, en septembre 2017.</P>
        <Steps
          items={[
            {
              title: "Le fichier de la NOAA est chargé",
              body: (
                <>
                  <Code>hurricane-load tracks</Code> lit le fichier ligne à ligne, saute la ligne
                  des unités, garde la trajectoire principale (et les tempêtes de la saison en
                  cours, encore « provisoires ») et prend le vent de l’agence
                  américaine (celui de l’OMM s’il manque). Les 126 000 positions remplacent la
                  table <Code>raw.tracks</Code>.
                </>
              ),
            },
            {
              title: "Staging reconstruit la table entière",
              body: (
                <>
                  La NOAA révise aussi les saisons anciennes : <Code>stg_tracks</Code> est reconstruite
                  chaque jour, partitionnée par saison. Tout l’historique ne pèse que 8 Mo.
                </>
              ),
            },
            {
              title: "BigQuery mesure les distances",
              body: (
                <>
                  Les positions de Maria à moins de 100 km d’une île sont retenues avec leur
                  distance : la plus proche est à 6 km de la Dominique, avec un vent de 145 nœuds.
                </>
              ),
            },
            {
              title: "Les marts donnent la réponse",
              body: (
                <>
                  <Code>fct_storm_passages</Code> écrit une ligne par île : Dominique, Guadeloupe,
                  Martinique, toutes en catégorie 5. <Code>fct_passage_weather</Code> y ajoute la
                  pluie et le vent de chaque île la veille, le jour et le lendemain.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="couts" title="Maîtriser les coûts">
        <P>
          BigQuery facture les octets lus. Le compte a une carte bancaire ; le projet doit donc
          rester loin du téraoctet gratuit chaque mois, et quatre garde-fous l’y maintiennent.
        </P>
        <Table
          head={["Garde-fou", "Ce qu’il fait"]}
          rows={[
            ["Partitionnement et clustering", "Les tables sont découpées par saison ou par mois et triées par tempête ou par île : une requête filtrée ne lit que les blocs utiles"],
            ["Plafond par requête", "Le profil dbt fixe maximum_bytes_billed à 1 Go : une requête qui lirait plus échoue au lieu de coûter (un test le vérifie)"],
            ["Dry run en CI", "Chaque pull request fait estimer par BigQuery les octets de chaque modèle, gratuitement ; au-delà de 200 Mo, la CI échoue"],
            ["Budget", "5 USD par mois sur le compte de facturation, avec alertes à 50, 90 et 100 %"],
          ]}
        />
        <Table
          head={["Exécution", "Requêtes", "Lu", "Facturé"]}
          rows={[
            ["Premier build (tout l’historique)", "69", "82 Mo", "459 Mo"],
            ["Build quotidien", "26", "33 Mo", "189 Mo"],
            ["Plus gros modèle, en dry run", "1", "10 Mo", "0"],
          ]}
        />
        <P>
          BigQuery facture au moins 10 Mo par requête, d’où l’écart entre lu et facturé. Trente
          builds quotidiens font moins de 6 Go par mois : moins de 1 % de la part gratuite.
        </P>
      </Section>

      <Section id="securite" title="Une CI sans clé">
        <P>
          Aucune clé de compte de service n’existe. GitHub Actions demande un jeton OIDC à
          GitHub ; la fédération d’identité de Google l’échange contre des droits temporaires
          du compte <Code>dbt-runner</Code>, et seulement pour les workflows de ce dépôt.{" "}
          <Code>dbt-runner</Code> peut lancer des requêtes et écrire dans les quatre datasets,
          rien d’autre. Les pull requests venues d’un fork sautent les étapes BigQuery. Tout
          cela est décrit en Terraform dans <Code>infra/</Code>.
        </P>
      </Section>

      <Section id="technologies" title="Les technologies">
        <Table
          head={["Technologie", "Rôle ici", "Pourquoi ce choix", "Alternatives"]}
          rows={[
            ["BigQuery", "L’entrepôt : stockage, SQL, calcul géographique", "Serverless, gratuit jusqu’à 1 To lu par mois, fonctions GIS intégrées", "Snowflake, Redshift"],
            ["dbt (dbt-bigquery)", "Modèles, tests, documentation", "Le standard de la modélisation SQL ; tests unitaires sur des lignes fixes", "SQLMesh, Dataform"],
            ["Python (httpx)", "Chargement des deux sources", "Lecture en flux du fichier NOAA, reprise si Open-Meteo limite le débit", "dlt, Airbyte"],
            ["Terraform", "Datasets, droits, fédération, budget", "Le côté Google Cloud relu et appliqué comme du code", "Console, gcloud"],
            ["Workload Identity Federation", "Authentification de la CI", "Droits temporaires, aucune clé à stocker ni à faire tourner", "Clé JSON dans un secret GitHub"],
            ["GitHub Actions", "CI, build quotidien, documentation", "Gratuit pour un dépôt public, planification incluse", "dbt Cloud, Cloud Composer"],
            ["pytest + respx", "Tests Python sans réseau", "HTTP et client BigQuery simulés", "unittest"],
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
          <Recipe title="Ajouter une île">
            <p>Une ligne dans <Code>seeds/islands.csv</Code> et la même dans <Code>islands.py</Code> (un test vérifie qu’ils concordent), la valeur dans le test <Code>accepted_values</Code> de <Code>_marts.yml</Code>, puis <Code>hurricane-load weather --since 1940-01-01</Code> pour charger son historique.</p>
          </Recipe>
          <Recipe title="Ajouter un mart">
            <p>Un fichier SQL dans <Code>models/marts/</Code>, sa description et ses tests dans <Code>_marts.yml</Code>, un test unitaire sur des lignes fixes si la logique le mérite. La CI estimera son coût avant la fusion.</p>
          </Recipe>
          <Recipe title="Lancer">
            <p><Code>make check</Code> : style, types et tests Python, sans réseau.</p>
            <p><Code>make load</Code>, <Code>make dbt-build</Code>, <Code>make cost-check</Code> : chargement, modèles et tests, contrôle des coûts, sur le vrai projet BigQuery.</p>
          </Recipe>
        </div>
      </Section>

      <Section id="tests" title="Tests et intégration continue">
        <Table
          head={["Niveau", "Ce qui est vérifié"]}
          rows={[
            ["pytest", "Lecture du fichier NOAA (ligne des unités, cases vides, trajectoires secondaires, vent américain puis OMM) ; requête météo et reprise après un refus de débit ; rechargement de jours sans doublon ; contrôle des coûts ; plafond du profil"],
            ["Tests unitaires dbt", "Une position à 94 km compte, une à 106 km non ; un passage par tempête et par île ; chaque seuil Saffir-Simpson ; vent inconnu, catégorie vide"],
            ["Tests de données dbt", "Clés uniques et non nulles, îles et catégories attendues"],
          ]}
        />
        <P>À chaque pull request : style, types et 18 tests Python, puis les tests unitaires dbt sur des tables vides, dans un dataset de CI dont les tables expirent au bout d’un jour, et le dry run de chaque modèle.</P>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <div className="space-y-5">
          <Lesson title="La donnée publique n’était pas à jour">
            La copie de la NOAA dans BigQuery s’arrête en 2023. Vérifier la dernière saison avant
            de bâtir dessus a évité un entrepôt muet sur 2024 et 2025. Même piège dans le fichier
            officiel : la saison en cours y est marquée « provisoire », et un filtre sur la seule
            trajectoire principale l’écartait ; la relecture finale l’a repéré.
          </Lesson>
          <Lesson title="Lu et facturé, ce n’est pas pareil">
            Les modèles lisent quelques mégaoctets, mais BigQuery facture 10 Mo minimum par
            requête : le coût réel dépend du nombre de requêtes autant que de leur taille.
          </Lesson>
          <Lesson title="Une API gratuite a ses limites">
            Open-Meteo compte une longue période comme plusieurs appels et répond « trop de
            requêtes » au-delà de son quota par minute. Le chargeur attend la minute suivante et
            reprend, et un test le vérifie.
          </Lesson>
          <Lesson title="Une réanalyse lisse les extrêmes">
            La météo d’ERA5 est une série complète depuis 1940, mais sur une maille de plusieurs
            kilomètres : elle dit qu’une journée a été violente, pas la rafale mesurée par une
            station.
          </Lesson>
        </div>
      </Section>

    </ProjectLayout>
  );
}
