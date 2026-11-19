import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Glossaire",
  description: "Les termes techniques des cinq projets, expliqués simplement.",
};

type Term = { term: string; definition: string };

const GROUPS: { title: string; terms: Term[] }[] = [
  {
    title: "Données et stockage",
    terms: [
      { term: "Pipeline de données", definition: "Chaîne automatique qui récupère des données, les transforme et les livre là où elles servent." },
      { term: "Batch", definition: "Traitement par lots à intervalle fixe (ici chaque matin), par opposition au flux continu." },
      { term: "Streaming (temps réel)", definition: "Traitement des événements au fil de leur arrivée, en secondes plutôt qu’en heures." },
      { term: "Lac de données (data lake)", definition: "Stockage brut et bon marché (ici S3) où l’on garde les données telles qu’elles sont arrivées, pour pouvoir tout recalculer." },
      { term: "Parquet", definition: "Format de fichier colonnaire et compressé : on lit seulement les colonnes utiles, très vite." },
      { term: "Partitionnement", definition: "Ranger les données en sous-dossiers selon une colonne (date, ville…) pour ne lire que la partie utile." },
      { term: "Entrepôt / base analytique", definition: "Base optimisée pour calculer des agrégats sur beaucoup de lignes (ici DuckDB, TimescaleDB)." },
      { term: "Staging, marts", definition: "Couches d’un modèle dbt : le staging nettoie et renomme les données brutes, les marts sont les tables finales prêtes à l’usage." },
      { term: "Fait, dimension", definition: "Une table de faits contient des mesures (pluie par jour et par ville) ; une dimension décrit les objets (les villes)." },
      { term: "Modèle incrémental", definition: "Ne recalcule que la partie qui a changé (les jours touchés) au lieu de toute la table." },
      { term: "Fraîcheur (freshness)", definition: "Contrôle qui alerte si les dernières données sont trop anciennes, signe qu’un run a échoué." },
      { term: "Hypertable", definition: "Table TimescaleDB découpée automatiquement par tranches de temps (« chunks »), compressée et purgée selon des règles." },
      { term: "Agrégat continu", definition: "Résumé (ex. moyenne horaire) que TimescaleDB tient à jour en arrière-plan." },
    ],
  },
  {
    title: "Fiabilité",
    terms: [
      { term: "Idempotence", definition: "Rejouer une opération donne le même résultat : un message reçu deux fois n’est stocké qu’une fois." },
      { term: "Clé primaire, ON CONFLICT", definition: "La clé identifie une ligne de façon unique ; ON CONFLICT DO NOTHING ignore une ligne déjà présente au lieu d’échouer." },
      { term: "Contrat de données", definition: "Format convenu entre un producteur et un consommateur, vérifié automatiquement (pydantic côté Python, zod côté site)." },
      { term: "File des rejets (DLQ)", definition: "Endroit où l’on range, tels quels et avec la raison, les messages qu’on n’a pas pu traiter, au lieu de les perdre." },
      { term: "Nouvelle tentative (retry, backoff)", definition: "Réessayer une opération en échec en espaçant de plus en plus les essais." },
      { term: "Asset (Dagster)", definition: "Une donnée produite par le pipeline (une table, un fichier) ; Dagster orchestre les assets et leurs dépendances." },
      { term: "Test de contrôle (asset check)", definition: "Test attaché à un asset ; s’il échoue, le run s’arrête avant de publier." },
    ],
  },
  {
    title: "IoT et messagerie",
    terms: [
      { term: "MQTT", definition: "Protocole de messagerie léger pour objets connectés : les appareils publient sur des « topics », les services s’y abonnent." },
      { term: "Broker", definition: "Serveur qui reçoit les messages et les distribue aux abonnés (ici Mosquitto pour MQTT, Kafka pour le flux AIS)." },
      { term: "Topic", definition: "Canal nommé (ex. antilles/gp-pap-01/telemetry) sur lequel on publie et on s’abonne." },
      { term: "QoS 1", definition: "Niveau de garantie MQTT « au moins une fois » : le message arrive, parfois en double." },
      { term: "Last will (testament)", definition: "Message que le broker publie lui-même si un appareil disparaît sans prévenir (ici « offline »)." },
      { term: "Message retenu (retained)", definition: "Dernier message gardé par le broker et envoyé immédiatement à tout nouvel abonné." },
      { term: "TLS", definition: "Chiffrement de la connexion, avec vérification de l’identité du serveur par un certificat." },
      { term: "ACL", definition: "Liste de droits : qui peut publier ou lire sur quel topic. Ici, une station ne peut publier que sur ses propres topics." },
      { term: "Firmware", definition: "Programme qui tourne sur le microcontrôleur (ici un ESP32) et pilote les capteurs." },
    ],
  },
  {
    title: "Kafka et Flink",
    terms: [
      { term: "Kafka", definition: "Journal d’événements distribué : les messages sont conservés dans l’ordre et relus par autant de consommateurs que nécessaire." },
      { term: "Partition", definition: "Morceau d’un topic Kafka ; l’ordre des messages est garanti à l’intérieur d’une partition." },
      { term: "Clé de message", definition: "Identifiant qui décide de la partition : tous les messages d’un même navire (même MMSI) vont dans la même partition, donc dans l’ordre." },
      { term: "Topic compacté", definition: "Topic où Kafka ne garde que le dernier message de chaque clé : une table toujours à jour (la fiche de chaque navire)." },
      { term: "Groupe de consommateurs", definition: "Plusieurs lecteurs qui se partagent les partitions d’un topic pour lire en parallèle." },
      { term: "Flink", definition: "Moteur de calcul sur flux : agrège et détecte des motifs dans des événements en continu, en SQL ou en code." },
      { term: "Temps de l’événement, watermark", definition: "On calcule sur l’heure où l’événement s’est produit, pas celle de son arrivée ; le watermark dit jusqu’où les données sont considérées complètes." },
      { term: "Fenêtre", definition: "Tranche de temps sur laquelle on agrège un flux (toutes les 5 minutes, par session d’activité…)." },
      { term: "Détection de motifs (MATCH_RECOGNIZE)", definition: "Recherche en SQL d’une suite d’événements dans un flux, par exemple « une position, puis une position trop loin pour le temps écoulé »." },
      { term: "AIS, MMSI", definition: "AIS : système radio par lequel les navires diffusent position et identité. MMSI : numéro à 9 chiffres qui identifie un navire." },
    ],
  },
  {
    title: "Lakehouse et Databricks",
    terms: [
      { term: "Lakehouse", definition: "Des fichiers dans un lac de données, mais organisés en vraies tables (mises à jour, historique, schéma), comme dans un entrepôt." },
      { term: "Architecture médaillon", definition: "Trois couches successives : bronze (données brutes telles que reçues), argent (nettoyées et typées), or (indicateurs prêts à lire)." },
      { term: "Spark, PySpark", definition: "Moteur de calcul qui répartit le traitement de gros volumes sur plusieurs machines ; PySpark est son interface Python." },
      { term: "Delta Lake", definition: "Format de tables sur des fichiers Parquet : mises à jour fusionnées (MERGE), historique des versions et lecture d’une version passée." },
      { term: "MERGE", definition: "Opération qui, en une fois, insère les lignes nouvelles et met à jour les lignes existantes d’une table selon une clé." },
      { term: "Databricks", definition: "Plateforme de données construite autour de Spark et Delta : calcul à la demande, catalogue, jobs planifiés." },
      { term: "Unity Catalog", definition: "Le catalogue de Databricks : il range les tables en catalogue, schéma et table, et gère les droits d’accès." },
      { term: "Asset Bundle", definition: "Description en fichiers d’un job Databricks et de son code, déployée en une commande depuis la ligne de commande." },
      { term: "Normale climatique", definition: "Moyenne d’une mesure sur 30 ans (ici 1991–2020), qui sert de référence pour dire si un mois est plus chaud ou plus pluvieux que d’habitude." },
    ],
  },
  {
    title: "Entrepôt cloud et BigQuery",
    terms: [
      { term: "Entrepôt de données cloud", definition: "Base analytique hébergée et gérée par un fournisseur (BigQuery, Snowflake) : pas de serveur à administrer, on paie le stockage et les requêtes." },
      { term: "BigQuery", definition: "L’entrepôt de données de Google Cloud : SQL sur des tables en colonnes, facturé selon les octets lus par chaque requête." },
      { term: "Clustering", definition: "Trier les lignes d’une table selon une colonne (ici la tempête ou l’île) pour qu’une requête filtrée ne lise que les blocs utiles." },
      { term: "Dry run", definition: "Requête planifiée mais pas exécutée : BigQuery indique combien d’octets elle lirait, gratuitement. Sert à contrôler le coût avant de lancer." },
      { term: "Plafond d’octets facturés", definition: "Limite posée sur une requête (maximum_bytes_billed) : si elle doit lire plus, elle échoue au lieu de coûter." },
      { term: "Fédération d’identité (Workload Identity Federation)", definition: "L’équivalent Google de l’OIDC : GitHub Actions échange un jeton contre des droits Google temporaires, sans clé de compte de service stockée." },
      { term: "Réanalyse", definition: "Reconstitution de la météo passée par un modèle qui assimile toutes les observations disponibles (ici ERA5, depuis 1940) : une série complète, mais qui lisse les extrêmes." },
    ],
  },
  {
    title: "Cloud, déploiement et web",
    terms: [
      { term: "S3", definition: "Service de stockage d’objets d’AWS : des fichiers dans des « buckets », durables et peu coûteux." },
      { term: "IAM", definition: "Gestion des identités et des droits sur AWS : qui peut faire quoi sur quelle ressource." },
      { term: "OIDC", definition: "Méthode qui permet à GitHub Actions d’obtenir des droits AWS temporaires sans clé stockée." },
      { term: "Infrastructure as code (Terraform)", definition: "Décrire les ressources cloud dans des fichiers versionnés, relus et appliqués par un outil, au lieu de cliquer dans une console." },
      { term: "CI (intégration continue)", definition: "Vérifications automatiques (lint, types, tests, builds) lancées à chaque proposition de changement." },
      { term: "Conteneur, Docker Compose", definition: "Un conteneur emballe une application et ses dépendances ; Compose lance plusieurs conteneurs ensemble." },
      { term: "ISR (Next.js)", definition: "Page générée à l’avance puis régénérée en arrière-plan à intervalle régulier : rapide et à jour." },
      { term: "Lint, typage strict", definition: "Outils qui détectent erreurs et incohérences dans le code avant même de l’exécuter (ruff, mypy, eslint, tsc)." },
    ],
  },
];

export default function GlossaryPage() {
  return (
    <article lang="fr" className="space-y-8">
      <header className="max-w-3xl space-y-2">
        <Link href="/#projets" className="text-sm text-ink-secondary hover:text-ink">
          ← Tous les projets
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Glossaire</h1>
        <p className="text-ink-secondary">Les termes des cinq projets, en une phrase chacun.</p>
      </header>
      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight">{group.title}</h2>
          <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {group.terms.map((t) => (
              <div key={t.term} className="min-w-0">
                <dt className="font-medium text-ink">{t.term}</dt>
                <dd className="text-sm leading-relaxed text-ink-secondary">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </article>
  );
}
