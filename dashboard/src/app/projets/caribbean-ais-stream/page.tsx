import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ArchitectureDiagram } from "./_components/architecture";
import { CompactionDiagram, PartitionsDiagram } from "./_components/partitions";
import { TrafficMap } from "./_components/traffic-map";

export const metadata: Metadata = {
  title: "Trafic maritime AIS en temps réel",
  description:
    "Comment fonctionne caribbean-ais-stream : les messages AIS des navires autour des Petites Antilles, normalisés et publiés dans Kafka, puis traités par Flink.",
};

const REPO = "https://github.com/tomtessondev/caribbean-ais-stream";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-3 leading-relaxed text-ink-secondary [&_strong]:text-ink">{children}</div>;
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-grid px-1 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>;
}

function Block({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-4 font-mono text-sm leading-relaxed text-ink">
      {children}
    </pre>
  );
}

type Status = "fait" | "en cours" | "à venir";

function StatusPill({ status }: { status: Status }) {
  const tone =
    status === "fait"
      ? "border-good text-good"
      : status === "en cours"
        ? "border-series-1 text-series-1"
        : "border-baseline text-ink-muted";
  return <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>;
}

// The roadmap of the repository (docs/ROADMAP.md). Update the statuses here as steps land.
const ROADMAP: { step: string; status: Status; detail: string }[] = [
  {
    step: "1. Ingestion dans Kafka",
    status: "fait",
    detail:
      "Client aisstream.io avec reconnexion, normalisation AIS, producteur idempotent par navire, topics positions / navires compacté / rejets, rejeu et trafic synthétique, tests sur un vrai Kafka.",
  },
  {
    step: "2. Flink SQL",
    status: "fait",
    detail:
      "Fenêtres en temps d'événement avec watermark de 30 s : navires par zone portuaire toutes les 5 minutes et une ligne par navire et par heure, écrites dans PostgreSQL par upsert. Un test de bout en bout en CI relance le job depuis le début de Kafka et vérifie que les résultats sont identiques.",
  },
  {
    step: "3. Anomalies",
    status: "à venir",
    detail:
      "Navires qui « s'éteignent » (silence AIS plus long que d'habitude, fenêtres de session), sauts de vitesse ou de position physiquement impossibles, navires qui tournent en rond.",
  },
  {
    step: "4. Carte et métriques",
    status: "à venir",
    detail: "Carte en direct des navires et de l'activité des ports, retard des consommateurs, débit.",
  },
  {
    step: "5. Schémas",
    status: "à venir",
    detail: "Avro avec un registre de schémas, pour que producteurs et Flink partagent des enregistrements typés et les fassent évoluer sans casse.",
  },
];

const TECHNOLOGIES: { name: string; role: string; why: string; alternatives: string }[] = [
  {
    name: "Python 3.12",
    role: "Tout le code du producteur et des tests.",
    why: "Rapide à écrire et à tester, très bon écosystème Kafka et WebSocket.",
    alternatives: "Go, Java (plus verbeux pour un producteur de cette taille).",
  },
  {
    name: "websockets",
    role: "Connexion permanente au flux aisstream.io.",
    why: "Bibliothèque asynchrone standard ; la reconnexion est écrite à la main pour en maîtriser le délai.",
    alternatives: "aiohttp, websocket-client (synchrone).",
  },
  {
    name: "pydantic",
    role: "Modèles des enregistrements (Position, ShipStatic, Rejected) et validation des bornes.",
    why: "Un message hors bornes (MMSI à 5 chiffres, latitude impossible) est refusé au bord du système, avec la raison.",
    alternatives: "dataclasses + validation manuelle, marshmallow.",
  },
  {
    name: "confluent-kafka",
    role: "Client Kafka du producteur et des tests.",
    why: "Basé sur librdkafka, la bibliothèque C de référence : idempotence, compression, rappels de livraison.",
    alternatives: "kafka-python (moins maintenu), aiokafka.",
  },
  {
    name: "typer",
    role: "La commande ais-stream (topics, live, replay, synthesize, demo).",
    why: "Une commande typée, avec aide et variables d'environnement, en quelques lignes.",
    alternatives: "click, argparse.",
  },
  {
    name: "Apache Kafka 3.9 (KRaft)",
    role: "Le journal d'événements : les messages y sont stockés, répartis et relus.",
    why: "La norme du streaming en entreprise. Le mode KRaft supprime ZooKeeper : un seul conteneur en local.",
    alternatives: "Redpanda (compatible Kafka, plus léger), Pulsar, Kinesis.",
  },
  {
    name: "Apache Flink 1.20",
    role: "Traitement continu : fenêtres, jointures, détection d'événements.",
    why: "Le moteur de référence du temps d'événement (watermarks), en SQL. Avec Kafka, c'est la paire la plus demandée en mission ; Redpanda aurait été plus simple à faire tourner, mais moins représentatif.",
    alternatives: "Kafka Streams, Spark Structured Streaming, RisingWave.",
  },
  {
    name: "Kafka UI (kafbat)",
    role: "Interface web pour voir les topics, partitions et messages.",
    why: "Indispensable pour montrer et déboguer ce qui circule.",
    alternatives: "Redpanda Console, AKHQ.",
  },
  {
    name: "Docker Compose",
    role: "Lance Kafka, la création des topics, la démo et Kafka UI d'une commande.",
    why: "Tout l'environnement reproductible sur un portable.",
    alternatives: "Kubernetes (surdimensionné ici).",
  },
  {
    name: "testcontainers",
    role: "Démarre un vrai Kafka (image apache/kafka) pendant les tests.",
    why: "Tester contre le vrai broker, pas contre un simulacre.",
    alternatives: "Un Kafka partagé de test, des mocks.",
  },
  {
    name: "GitHub Actions",
    role: "Intégration continue à chaque pull request.",
    why: "Gratuit pour un dépôt public, intégré à GitHub.",
    alternatives: "GitLab CI, CircleCI.",
  },
  {
    name: "ruff, mypy --strict",
    role: "Style, erreurs courantes et typage strict.",
    why: "Le typage strict attrape les erreurs avant l'exécution.",
    alternatives: "flake8 + black, pyright.",
  },
];

const TREE = `caribbean-ais-stream/
├── src/ais_stream/
│   ├── messages.py     modèles et normalisation AIS (sentinelles → null)
│   ├── sources.py      flux aisstream.io (WebSocket, reconnexion), rejeu de fichiers
│   ├── pipeline.py     un message brut → un enregistrement ou un rejet
│   ├── kafka.py        topics et producteur (clé MMSI, idempotent, acks=all)
│   ├── synthetic.py    trafic synthétique au format exact d'aisstream
│   └── cli.py          commande ais-stream : topics, live, replay, synthesize, demo
├── tests/
│   ├── fixtures/aisstream_samples.jsonl   vrais formats, cas limites et messages cassés
│   ├── conftest.py     fixture : un vrai broker apache/kafka dans Docker
│   ├── test_messages.py  test_pipeline.py  test_synthetic.py
│   ├── test_sources.py   faux serveur WebSocket, reconnexion
│   └── test_kafka.py     topics, compactage, ordre par navire (intégration)
├── docker-compose.yml  Kafka, topics, demo, live (profil), Kafka UI
├── Dockerfile          image unique, point d'entrée ais-stream
├── Makefile            install, check, integration, up, live, down
├── .github/workflows/ci.yml   lint, types, tests, intégration, build Docker
├── docs/ROADMAP.md     les étapes
└── CLAUDE.md           règles du dépôt pour l'assistant de code`;

const RECIPES: { title: string; steps: ReactNode }[] = [
  {
    title: "Changer la zone géographique",
    steps: (
      <>
        Modifier <Code>LESSER_ANTILLES</Code> dans <Code>src/ais_stream/sources.py</Code> : deux coins
        [[sud, ouest], [nord, est]] en degrés. aisstream.io n&apos;envoie que les navires dans ce
        rectangle. Le test <Code>tests/test_sources.py</Code> vérifie le message d&apos;abonnement.
      </>
    ),
  },
  {
    title: "Ajouter un type de message AIS",
    steps: (
      <>
        Ajouter le type à <Code>MESSAGE_TYPES</Code> (<Code>sources.py</Code>), un modèle pydantic et
        une branche dans <Code>to_record</Code> (<Code>messages.py</Code>), le topic correspondant dans{" "}
        <Code>topic_for</Code> (<Code>kafka.py</Code>), puis un exemple dans{" "}
        <Code>tests/fixtures/aisstream_samples.jsonl</Code> et son test.
      </>
    ),
  },
  {
    title: "Ajouter un topic",
    steps: (
      <>
        Une entrée dans <Code>TOPICS</Code> (<Code>kafka.py</Code>) avec sa politique (durée de
        rétention ou compactage). <Code>ais-stream topics</Code> crée les topics manquants sans toucher
        aux autres ; le test d&apos;intégration vérifie la politique sur un vrai broker.
      </>
    ),
  },
  {
    title: "Ajouter un navire au trafic synthétique",
    steps: (
      <>
        Dans <Code>traffic()</Code> de <Code>synthetic.py</Code> : déclarer un <Code>Ship</Code> (MMSI à
        9 chiffres, type AIS, dimensions) et l&apos;ajouter aux flux avec <Code>_shuttle</Code> (route
        entre ports de <Code>PORTS</Code>), <Code>_at_anchor</Code> ou <Code>_fishing</Code>. Mettre à
        jour le nombre de navires attendu dans <Code>tests/test_synthetic.py</Code>.
      </>
    ),
  },
  {
    title: "Brancher le vrai flux",
    steps: (
      <>
        Créer une clé gratuite sur aisstream.io, l&apos;écrire dans un fichier <Code>.env</Code> à la
        racine (<Code>AISSTREAM_API_KEY=…</Code>, ignoré par git), puis{" "}
        <Code>docker compose --profile live up -d --build live</Code>. Sans clé, le producteur refuse de
        démarrer ; avec une clé invalide, il s&apos;arrête au premier message d&apos;erreur
        d&apos;aisstream.
      </>
    ),
  },
  {
    title: "Faire tourner les contrôles",
    steps: (
      <>
        <Code>make check</Code> (ruff, mypy, tests unitaires) puis <Code>make integration</Code> (tests
        sur un vrai Kafka, Docker requis). Les deux doivent passer avant chaque commit.
      </>
    ),
  },
];

const LESSONS: { title: string; text: string }[] = [
  {
    title: "Normaliser une seule fois, à l'entrée",
    text: "L'AIS dit « non disponible » avec des valeurs impossibles : cap 511, vitesse 102,3 nœuds, route 360, latitude 91, longitude 181. Elles deviennent des valeurs vides avant toute écriture, pour qu'aucune requête ne calcule jamais un cap moyen de 511°.",
  },
  {
    title: "Une clé par navire",
    text: "Le MMSI comme clé Kafka met tous les messages d'un navire dans la même partition : ils sont relus dans l'ordre. Le test d'intégration le vérifie sur un vrai broker.",
  },
  {
    title: "Des topics à l'image de leurs données",
    text: "Les positions sont un journal d'événements gardé une semaine ; les fiches de navires sont une table, d'où le compactage ; les rejets sont gardés tels quels pour le diagnostic.",
  },
  {
    title: "Développer sans compte",
    text: "Le générateur écrit le format exact d'aisstream : la démo et le rejeu passent par le même code que le flux réel. Il contient un navire qui coupe son AIS 45 minutes, le cas que la détection d'anomalies devra trouver.",
  },
  {
    title: "Une clé invalide arrête le producteur",
    text: "aisstream répond à une mauvaise clé par un message d'erreur au lieu de données : le producteur s'arrête avec ce message plutôt que de remplir le topic des rejets.",
  },
  {
    title: "Kafka annonce son adresse aux clients",
    text: "Un client Kafka se reconnecte à l'adresse que le broker lui annonce. Dans un conteneur de test, le port de l'hôte est aléatoire : la fixture choisit le port avant le démarrage et l'annonce tel quel. Les conteneurs Kafka tout faits de testcontainers reposent sur l'image Confluent ; celle-ci teste la même image qu'en production.",
  },
  {
    title: "Des tests d'intégration de 84 s à 7 s",
    text: "La lecture des topics attendait 20 s de silence faute de connaître le nombre exact de messages. Calculer ce nombre et s'arrêter après 5 s sans message a divisé la durée par douze.",
  },
  {
    title: "Docker Compose évalue toutes les variables",
    text: "Une variable obligatoire (${VAR:?}) dans un service à profil bloque aussi les services sans profil. La clé est donc optionnelle pour Compose, et c'est le producteur qui la refuse si elle est vide.",
  },
];

export default function CaribbeanAisStreamPage() {
  return (
    <article className="space-y-12">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-medium tracking-wide text-ink-muted uppercase">Projet 3 · streaming</p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          caribbean-ais-stream : le trafic maritime des Petites Antilles en temps réel
        </h1>
        <p className="text-ink-secondary">
          Les navires de commerce et de passagers diffusent leur position par radio toutes les quelques
          secondes. Ce projet capte ces messages autour de la Guadeloupe, de la Martinique et des îles
          voisines, les nettoie et les publie dans Kafka, puis les traite en continu avec Flink :
          activité des ports toutes les 5 minutes et statistiques horaires par navire.
        </p>
        <p className="text-sm">
          <a href={REPO} className="font-medium underline">
            Code source sur GitHub
          </a>
        </p>
      </header>

      <Section id="probleme" title="Le problème et ce que fait le projet">
        <Prose>
          <p>
            Un port, une capitainerie ou un armateur veut savoir <strong>quels navires arrivent, partent,
            attendent au mouillage</strong>, et repérer ceux qui se comportent anormalement, comme un
            navire qui coupe son émetteur. Ces informations existent : elles passent en permanence sur
            la radio AIS. Il faut les capter, les fiabiliser et les traiter au fil de l&apos;eau, pas une
            fois par jour.
          </p>
          <p>
            Le projet construit cette chaîne : <strong>ingestion en temps réel</strong>, normalisation,
            stockage dans un journal Kafka partitionné, puis <strong>traitement continu</strong> avec
            Flink : activité des ports, temps passés à quai, détection d&apos;anomalies. Pour un client,
            c&apos;est la démonstration d&apos;un pipeline temps réel complet, de la source à
            l&apos;indicateur, avec les garanties attendues en production : pas de perte, pas de doublon,
            ordre respecté par navire.
          </p>
        </Prose>
      </Section>

      <Section id="ais" title="Qu'est-ce que l'AIS ?">
        <Prose>
          <p>
            L&apos;<strong>AIS</strong> (Automatic Identification System) est obligatoire sur les navires
            de plus de 300 tonneaux et sur tous les navires à passagers. Chaque navire émet :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              sa <strong>position</strong>, sa vitesse et son cap, toutes les 2 à 10 secondes en route,
              toutes les 3 minutes à quai ou au mouillage ;
            </li>
            <li>
              sa <strong>fiche</strong> (nom, type, dimensions, tirant d&apos;eau, destination) toutes les
              6 minutes.
            </li>
          </ul>
          <p>
            Chaque navire est identifié par son <strong>MMSI</strong>, un numéro à 9 chiffres dont les
            trois premiers désignent le pays (227 à 228 pour la France). Des stations au sol captent ces
            messages ; le service aisstream.io les redistribue sur Internet.
          </p>
          <p>
            Particularité du format : une valeur absente n&apos;est pas vide, elle est remplacée par une
            valeur impossible. Cap <Code>511</Code>, vitesse <Code>102,3</Code> nœuds, route{" "}
            <Code>360</Code>, latitude <Code>91</Code>, longitude <Code>181</Code>. Les noms sont
            complétés par des <Code>@</Code>. Le projet transforme tout cela en valeurs vides et en noms
            propres dès l&apos;entrée.
          </p>
        </Prose>
      </Section>

      <Section id="architecture" title="Schéma d'architecture">
        <ArchitectureDiagram />
        <PartitionsDiagram />
        <CompactionDiagram />
      </Section>

      <Section id="parcours" title="Un passage dans le pipeline">
        <Prose>
          <p>Le trajet d&apos;un message, du navire à Kafka :</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Le ferry <em>Antilles Express</em>, au large de Pointe-à-Pitre, émet une position par radio
              VHF. Une station au sol la capte ; aisstream.io la pousse dans la connexion WebSocket ouverte
              par <Code>sources.live()</Code>, abonnée au rectangle des Petites Antilles.
            </li>
            <li>
              Le message arrive en JSON, avec un horodatage au format du langage Go (
              <Code>2026-11-14 18:22:32.318353123 +0000 UTC</Code>), décodé par{" "}
              <Code>parse_aisstream_time</Code>.
            </li>
            <li>
              <Code>pipeline.handle()</Code> appelle <Code>to_record()</Code> : les sentinelles deviennent
              des valeurs vides, le nom perd ses <Code>@</Code>, pydantic vérifie les bornes (MMSI à 9
              chiffres, latitude entre −90 et 90). En cas d&apos;échec, le message part tel quel dans{" "}
              <Code>ais.dlq</Code> avec la raison.
            </li>
            <li>
              Le producteur envoie l&apos;enregistrement dans <Code>ais.positions</Code> avec la clé{" "}
              <Code>227000101</Code>. Kafka calcule un hachage de la clé : ce navire va toujours dans la
              même partition.
            </li>
            <li>
              Avec <Code>acks=all</Code> et l&apos;idempotence, le broker n&apos;accuse réception
              qu&apos;une fois l&apos;écriture faite, et un envoi répété après une coupure n&apos;est pas
              écrit deux fois. Le rappel de livraison compte les succès et les échecs.
            </li>
            <li>
              Le message est dans le journal pendant 7 jours. Kafka UI le montre, et Flink le lit pour
              alimenter les fenêtres de port et les statistiques horaires dans PostgreSQL.
            </li>
          </ol>
        </Prose>
        <TrafficMap />
      </Section>

      <Section id="technologies" title="Les technologies">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-ink-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Technologie</th>
                <th className="px-3 py-2 font-medium">Rôle ici</th>
                <th className="px-3 py-2 font-medium">Pourquoi ce choix</th>
                <th className="px-3 py-2 font-medium">Alternatives</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {TECHNOLOGIES.map((t) => (
                <tr key={t.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{t.name}</td>
                  <td className="px-3 py-2 text-ink-secondary">{t.role}</td>
                  <td className="px-3 py-2 text-ink-secondary">{t.why}</td>
                  <td className="px-3 py-2 text-ink-muted">{t.alternatives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="depot" title="Organisation du dépôt">
        <Block>{TREE}</Block>
      </Section>

      <Section id="modifier" title="Comment modifier">
        <div className="grid gap-4 md:grid-cols-2">
          {RECIPES.map((recipe) => (
            <div key={recipe.title} className="min-w-0 space-y-2 rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold">{recipe.title}</h3>
              <p className="text-sm leading-relaxed text-ink-secondary">{recipe.steps}</p>
            </div>
          ))}
        </div>
        <Prose>
          <p>Lancer le projet en local :</p>
        </Prose>
        <Block>{`docker compose up -d --build     # Kafka, topics, navires synthétiques, Kafka UI
# Kafka UI : http://localhost:8088     Kafka depuis la machine : localhost:9094

python -m venv .venv && source .venv/bin/activate
make install
ais-stream synthesize --hours 6 --out data/sample.jsonl
ais-stream replay data/sample.jsonl --bootstrap localhost:9094`}</Block>
      </Section>

      <Section id="tests" title="Tests et intégration continue">
        <Prose>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Tests unitaires</strong> : normalisation sur des exemples au format réel (sentinelles,
              remplissage, dimensions, messages tronqués ou inconnus), routage vers les topics ou les
              rejets, trafic synthétique déterministe (même graine, même trafic ; un navire silencieux 45
              minutes ; le ferry atteint bien Fort-de-France).
            </li>
            <li>
              <strong>Faux serveur WebSocket</strong> : un serveur local joue aisstream.io, vérifie le
              message d&apos;abonnement, envoie deux messages et raccroche ; le client doit se reconnecter
              et continuer.
            </li>
            <li>
              <strong>Intégration sur un vrai Kafka</strong> : un broker <Code>apache/kafka</Code>{" "}
              démarré par testcontainers, avec un port fixé et annoncé avant le démarrage. Les tests
              vérifient la création des topics et leurs politiques (compactage), puis une heure de trafic
              produite et relue : aucune perte, et pour chaque navire des positions dans l&apos;ordre.
            </li>
            <li>
              <strong>À chaque pull request</strong>, GitHub Actions lance le lint, le typage strict, les
              tests unitaires (Python 3.12 et 3.13), les tests d&apos;intégration et le build de
              l&apos;image Docker.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <div className="grid gap-4 md:grid-cols-2">
          {LESSONS.map((lesson) => (
            <div key={lesson.title} className="min-w-0 space-y-2 rounded-lg border border-border bg-surface p-4">
              <h3 className="font-semibold">{lesson.title}</h3>
              <p className="text-sm leading-relaxed text-ink-secondary">{lesson.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="feuille-de-route" title="Feuille de route">
        <ol className="space-y-3">
          {ROADMAP.map((item) => (
            <li key={item.step} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-center gap-2 sm:w-56 sm:shrink-0">
                <StatusPill status={item.status} />
                <span className="font-semibold">{item.step}</span>
              </div>
              <p className="min-w-0 text-sm text-ink-secondary">{item.detail}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="liens" title="Liens">
        <Prose>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Code source : <a href={REPO} className="underline">{REPO}</a>
            </li>
            <li>
              Flux AIS : <a href="https://aisstream.io" className="underline">aisstream.io</a>
            </li>
          </ul>
        </Prose>
      </Section>
    </article>
  );
}
