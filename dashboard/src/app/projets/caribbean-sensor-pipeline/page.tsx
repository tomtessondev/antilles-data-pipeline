import type { Metadata } from "next";

import { StationsMap } from "@/components/live/stations-map";
import { ProjectLayout } from "@/components/project/project-layout";
import { Code, Lesson, P, Recipe, Section, Steps, Table } from "@/components/project/prose";

import { FirmwareDiagram, MqttDiagram, QualityDiagram, SensorArchitecture } from "./_components/diagrams";

export const metadata: Metadata = {
  title: "Projet IoT : capteurs de qualité de l’air",
  description:
    "Comment fonctionne caribbean-sensor-pipeline : stations ESP32 ou simulées, MQTT sécurisé, TimescaleDB, contrôle qualité et Grafana.",
};

const SECTIONS: [string, string][] = [
  ["probleme", "Le problème"],
  ["direct", "Démo en direct"],
  ["architecture", "Architecture"],
  ["passage", "Un passage dans le pipeline"],
  ["technologies", "Technologies"],
  ["depot", "Organisation du dépôt"],
  ["modifier", "Comment modifier"],
  ["securite", "Sécurité"],
  ["tests", "Tests et CI"],
  ["lecons", "Choix et leçons"],
];

const TREE = `caribbean-sensor-pipeline/
├── src/sensor_pipeline/        le service Python (paquet installable)
│   ├── messages.py             contrat MQTT : topics, modèle Telemetry v1, statut
│   ├── stations.py             les 6 stations (id, ville, coordonnées, paramètres)
│   ├── simulator.py            physique simulée + pannes, déterministe par graine
│   ├── publisher.py            une session MQTT par station, last will
│   ├── ingest.py               file d’attente, validation, lots, rejets
│   ├── db.py                   migrations et écritures TimescaleDB
│   ├── mqtt.py                 client MQTT (TLS, identifiants)
│   ├── provision.py            CA locale, certificat, mots de passe, ACL
│   ├── cli.py                  commandes sensor-pipeline …
│   └── sql/                    migrations numérotées, appliquées dans l’ordre
│       ├── 001_schema.sql      hypertable, compression, rétention, agrégat horaire
│       ├── 002_station_health.sql   vue santé + rôle grafana_reader
│       ├── 003_data_quality.sql     règles, drapeaux, vue validée, score
│       └── 004_ingestor_role.sql    rôle insertion seule de l’ingestor
├── firmware/                   projet PlatformIO pour l’ESP32
│   ├── lib/telemetry/src/      logique testable : JSON, décodeur PMS5003, tampon
│   ├── src/main.cpp            colle matérielle : Wi-Fi, NTP, capteurs, MQTT
│   ├── include/station_config.example.h   réglages de la station (à copier)
│   └── test/                   tests Unity + message de référence (golden)
├── grafana/                    Grafana en fichiers
│   ├── provisioning/           source de données, dossier, règles d’alerte
│   └── dashboards/             air-quality.json, fleet-health.json
├── docker/                     configuration Mosquitto + script de démarrage
├── docker-compose.yml          toute la chaîne en local
├── tests/                      pytest : unitaires et intégration (vrais conteneurs)
└── .github/workflows/ci.yml    lint, types, tests, firmware, image Docker`;

export default function SensorProjectPage() {
  return (
    <ProjectLayout slug="caribbean-sensor-pipeline" sections={SECTIONS} diagram={<SensorArchitecture />}>
      <Section id="probleme" title="Le problème et ce que fait le projet">
        <P>
          Aux Antilles, la qualité de l’air dépend surtout des brumes de sable venues du Sahara :
          plusieurs fois par an, les particules fines (PM10) dépassent la limite européenne de
          50 µg/m³. Mesurer cela avec des capteurs, c’est gérer des appareils sur batterie, une
          radio qui perd des messages, des capteurs qui se bloquent, et des données qu’on ne peut
          pas croire sur parole.
        </P>
        <P>
          Le projet traite tout cela de bout en bout. Les stations publient une mesure toutes les
          dix secondes sur un broker MQTT sécurisé ; un service les valide et les écrit dans une
          base temporelle ; des règles SQL repèrent les valeurs douteuses sans les effacer ;
          Grafana affiche l’état de l’air, la santé de chaque station, et déclenche des alertes
          (épisode de poussière, station hors ligne, capteur bloqué). Pour un client, c’est le
          socle d’un réseau de capteurs : fiable quand la radio flanche, sûr face à un appareil
          compromis, et transparent sur la qualité de ses propres données.
        </P>
        <P>
          Aujourd’hui, les six stations sont simulées avec une physique réaliste (cycle jour/nuit,
          marée barométrique, panaches de poussière, batterie solaire) et des pannes réelles. Le
          firmware d’une vraie station ESP32 est écrit, testé et compilé ; il parle exactement le
          même protocole.
        </P>
      </Section>

      <Section id="direct" title="Démo en direct">
        <P>
          La démo en ligne utilise les <strong className="text-ink">stations automatiques de
          Météo-France</strong> en Guadeloupe, en Martinique, à Saint-Barthélemy et à Saint-Martin : des
          données réelles, une mesure toutes les 6 minutes. Un pont les publie sur le même broker MQTT que
          les stations du projet, avec le même contrat de message ; elles suivent donc le même chemin
          (validation, base temporelle, contrôle qualité). Le simulateur reste en place pour les tests :
          il produit à volonté les pannes et les cas limites qu’un vrai réseau ne fournit pas sur
          commande.
        </P>
        <P>
          Toutes les stations mesurent toutes les 6 minutes, mais deux rythmes de livraison cohabitent :
          la moitié transmet chaque mesure dans les minutes qui suivent, l’autre envoie son heure
          écoulée d’un seul bloc, parfois avec une heure de retard. Le seuil avant de déclarer une
          station hors ligne est donc réglé par station, à partir du rythme observé sur les vraies
          données : 100 minutes de silence aujourd’hui. Si le pont s’interrompt (service
          arrêté, API indisponible), il rattrape à son redémarrage tous les créneaux manqués, jusqu’à
          3 heures en arrière.
        </P>
        <P>
          La carte affiche la dernière mesure de chaque station, colorée selon la température, et se met
          à jour toutes les minutes. Cliquez ou appuyez sur une station pour voir ses valeurs.
        </P>
        <StationsMap baseUrl={process.env.NEXT_PUBLIC_SENSORS_LIVE_URL} />
      </Section>

      <Section id="architecture" title="Architecture">
        <P>
          Trois principes guident l’ensemble : <strong className="text-ink">rien ne se perd</strong>{" "}
          (accusés de réception MQTT, tampon dans la station, session persistante de l’ingestor),{" "}
          <strong className="text-ink">rien ne se duplique</strong> (une lecture est identifiée par
          sa station et son horodatage, un doublon est ignoré) et{" "}
          <strong className="text-ink">rien n’est jeté en silence</strong> (les messages invalides
          sont gardés avec la raison du refus, les valeurs suspectes sont marquées, pas effacées).
        </P>
        <MqttDiagram />
        <FirmwareDiagram />
        <QualityDiagram />
      </Section>

      <Section id="passage" title="Un passage dans le pipeline">
        <P>Suivons une mesure de PM10 prise à Pointe-à-Pitre.</P>
        <Steps
          items={[
            {
              title: "La station mesure",
              body: (
                <>
                  Le PMS5003 envoie une trame série par seconde ; le décodeur vérifie l’en-tête et la
                  somme de contrôle. Au début de chaque créneau de 10 s (heure NTP), la station
                  assemble une lecture : température, humidité, pression, PM2.5, PM10, batterie,
                  signal radio. Son numéro de séquence est le numéro du créneau.
                </>
              ),
            },
            {
              title: "Elle la met en file, puis la publie",
              body: (
                <>
                  La lecture entre dans le tampon circulaire (une heure de mesures). Si le broker est
                  joignable, elle part aussitôt en JSON sur <Code>antilles/gp-pap-01/telemetry</Code>,
                  en QoS 1 : la station la renverra tant que le broker n’a pas accusé réception.
                </>
              ),
            },
            {
              title: "Le broker filtre",
              body: (
                <>
                  Mosquitto vérifie la connexion TLS et l’identifiant <Code>gp-pap-01</Code>, puis
                  l’ACL : ce client a le droit d’écrire sous <Code>antilles/gp-pap-01/…</Code> et nulle
                  part ailleurs. Le message est transmis à l’ingestor, abonné à{" "}
                  <Code>antilles/+/telemetry</Code>.
                </>
              ),
            },
            {
              title: "L’ingestor valide et regroupe",
              body: (
                <>
                  Le message est validé par le modèle <Code>Telemetry</Code> (version du contrat,
                  format de l’identifiant, bornes physiques des capteurs, station identique à celle du
                  topic). Valide, il rejoint le lot en cours ; invalide, il part dans{" "}
                  <Code>ingest_errors</Code> avec la raison. Le lot est écrit dans une seule
                  transaction dès qu’il atteint 500 lectures ou au bout de 2 secondes.
                </>
              ),
            },
            {
              title: "TimescaleDB stocke",
              body: (
                <>
                  La ligne arrive dans l’hypertable <Code>telemetry</Code>, découpée en morceaux d’un
                  jour, compressée après 7 jours, purgée après 180. Si la station a renvoyé la même
                  lecture, la clé (station, horodatage) l’ignore. L’agrégat horaire{" "}
                  <Code>telemetry_hourly</Code> se met à jour en arrière-plan.
                </>
              ),
            },
            {
              title: "Les règles qualité passent",
              body: (
                <>
                  Dans les cinq minutes, le job <Code>flag_readings</Code> examine les lectures
                  reçues : si ce PM10 est trois fois plus élevé que ses trente voisines, il est marqué{" "}
                  <Code>pm_spike</Code>. La ligne brute reste intacte ; la vue{" "}
                  <Code>telemetry_clean</Code> masque seulement la valeur suspecte.
                </>
              ),
            },
            {
              title: "Grafana affiche, et alerte si besoin",
              body: (
                <>
                  Le panneau PM10 du tableau « Air quality — Antilles » lit la vue validée, avec la
                  ligne rouge des 50 µg/m³. Si la moyenne horaire dépasse ce seuil pendant 15 minutes,
                  l’alerte « Saharan dust episode » se déclenche pour cette station.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="technologies" title="Les technologies">
        <Table
          head={["Technologie", "Rôle ici", "Pourquoi ce choix", "Alternatives"]}
          rows={[
            ["Python 3.12", "Simulateur, ingestor, migrations, outils", "Rapide à écrire et à tester, riche en bibliothèques réseau et base", "Go, Rust (plus de code)"],
            ["paho-mqtt", "Client MQTT des stations simulées et de l’ingestor", "Client de référence de la fondation Eclipse, gère QoS, last will et TLS", "aiomqtt (asynchrone)"],
            ["pydantic", "Contrat des messages : types, bornes, version", "Un message invalide est refusé avec une raison lisible", "dataclasses + validation à la main"],
            ["psycopg 3", "Accès PostgreSQL / TimescaleDB", "Pilote moderne, typé, insertions par lots", "asyncpg, SQLAlchemy"],
            ["typer", "Ligne de commande sensor-pipeline", "Une commande par rôle (migrate, ingest, simulate, provision-broker)", "argparse, click"],
            ["MQTT + Mosquitto", "Transport des mesures, broker", "Protocole léger conçu pour l’IoT : QoS, last will, messages retenus", "HTTP, Kafka (trop lourd pour un ESP32)"],
            ["TimescaleDB", "Base temporelle", "C’est PostgreSQL : SQL, jointures, outils connus, plus hypertables, compression, agrégats continus, jobs", "InfluxDB, QuestDB"],
            ["Grafana", "Tableaux de bord et alertes", "Standard des séries temporelles ; tout est décrit en fichiers versionnés", "Superset, Metabase"],
            ["Docker Compose", "Toute la chaîne en local", "Une commande lance broker, base, ingestor, stations et Grafana", "Kubernetes (surdimensionné ici)"],
            ["testcontainers", "Tests d’intégration", "Lance un vrai Mosquitto et une vraie TimescaleDB pour chaque série de tests", "Bouchons (moins fidèles)"],
            ["cryptography", "Génération de la CA et des certificats", "Clés ECDSA P-256, légères pour un ESP32, sans dépendre d’openssl", "openssl en ligne de commande"],
            ["ESP32 + Arduino", "Microcontrôleur de la station", "Wi-Fi intégré, peu coûteux, écosystème mature", "nRF, STM32 + module radio"],
            ["PlatformIO", "Build et tests du firmware", "Versions des outils figées, tests sur ordinateur, intégration CI simple", "Arduino IDE, ESP-IDF seul"],
            ["esp-mqtt", "Client MQTT de l’ESP32", "Fourni par ESP-IDF : QoS 1 avec renvoi, last will, TLS", "PubSubClient (pas de QoS 1 en publication)"],
            ["ArduinoJson", "Sérialisation JSON du firmware", "Sans allocation dynamique, fonctionne aussi sur ordinateur pour les tests", "Écriture à la main (fragile)"],
            ["Unity", "Tests unitaires C++", "Framework de test léger intégré à PlatformIO", "GoogleTest"],
            ["GitHub Actions", "Intégration continue", "Lint, types, tests, firmware et image Docker sur chaque pull request", "GitLab CI"],
            ["ruff, mypy --strict", "Style et typage Python", "Erreurs de type et de style bloquées avant revue", "flake8, pyright"],
          ]}
        />
      </Section>

      <Section id="depot" title="Organisation du dépôt">
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
          <pre className="font-mono text-[12.5px] leading-relaxed text-ink">{TREE}</pre>
        </div>
      </Section>

      <Section id="modifier" title="Comment modifier le code">
        <P>
          Chaque recette donne les fichiers à toucher. Ouvrir une recette pour la lire ; le
          principe général : le contrat MQTT, le schéma SQL et les tests avancent ensemble.
        </P>
        <div className="space-y-3">
          <Recipe title="Ajouter une station">
            <p>
              1. Ajouter une ligne <Code>Station(…)</Code> dans <Code>src/sensor_pipeline/stations.py</Code>{" "}
              (identifiant au format <Code>gp-xxx-01</Code>, ville, territoire, coordonnées,
              paramètres de simulation).
            </p>
            <p>
              2. <Code>sensor-pipeline migrate</Code> l’enregistre en base ;{" "}
              <Code>sensor-pipeline provision-broker</Code> lui crée un mot de passe sans toucher à
              ceux des autres (l’ACL l’autorise automatiquement grâce au motif <Code>%u</Code>).
            </p>
            <p>3. Pour une vraie station : renseigner son identifiant, son mot de passe et la CA dans <Code>firmware/include/station_config.h</Code>, puis la flasher.</p>
          </Recipe>
          <Recipe title="Ajouter une mesure (par exemple le CO₂)">
            <p>1. Contrat : ajouter le champ optionnel avec ses bornes physiques dans <Code>Telemetry</Code> (<Code>messages.py</Code>). Un changement incompatible impose une nouvelle version <Code>v</Code>.</p>
            <p>2. Base : une nouvelle migration <Code>sql/005_….sql</Code> qui ajoute la colonne (ne jamais modifier une migration déjà appliquée), et l’ajouter à <Code>TELEMETRY_COLUMNS</Code> dans <Code>db.py</Code>.</p>
            <p>3. Simulateur : produire la valeur dans <Code>simulator.py</Code>.</p>
            <p>4. Firmware : le champ dans <Code>Reading</Code> et <Code>toJson</Code> (<Code>lib/telemetry/src/telemetry.*</Code>), puis mettre à jour <Code>test/golden/telemetry_v1.json</Code> : le test C++ et <Code>tests/test_firmware_contract.py</Code> vérifient que les deux côtés restent d’accord.</p>
            <p>5. Grafana : un panneau dans <Code>grafana/dashboards/air-quality.json</Code>.</p>
          </Recipe>
          <Recipe title="Ajouter une règle de qualité">
            <p>Dans une nouvelle migration, redéfinir la procédure <Code>flag_readings</Code> avec une branche <Code>union all</Code> de plus, et ajouter le nom du drapeau à la contrainte <Code>check</Code> de <Code>reading_flags</Code>. Décider dans <Code>telemetry_clean</Code> quelles valeurs ce drapeau masque.</p>
            <p>Tester dans <Code>tests/test_quality.py</Code> avec des données fabriquées : la règle doit marquer exactement les lectures visées, et rien sur un cas légitime proche.</p>
          </Recipe>
          <Recipe title="Ajouter un panneau ou une alerte Grafana">
            <p>Modifier <Code>grafana/dashboards/*.json</Code> (les changements faits dans l’interface ne sont pas conservés) ou <Code>grafana/provisioning/alerting/rules.yaml</Code>. Grafana recharge les tableaux de bord en quelques secondes.</p>
            <p>La CI exécute chaque requête SQL de ces fichiers avec le rôle en lecture seule de Grafana : une requête cassée ou un droit manquant fait échouer la pull request.</p>
          </Recipe>
          <Recipe title="Lancer les contrôles">
            <p><Code>make check</Code> : style, typage strict et tests unitaires (quelques secondes).</p>
            <p><Code>make integration</Code> : tests sur un vrai Mosquitto et une vraie TimescaleDB (Docker nécessaire).</p>
            <p><Code>make up</Code> puis <Code>http://localhost:3001</Code> : toute la chaîne avec Grafana ; <Code>make psql</Code> pour interroger la base.</p>
            <p><Code>cd firmware &amp;&amp; pio test -e native</Code> : tests du firmware sur ordinateur, sans carte.</p>
          </Recipe>
        </div>
      </Section>

      <Section id="securite" title="Sécurité">
        <Table
          head={["Menace", "Protection", "Où"]}
          rows={[
            ["Écoute du réseau", "TLS obligatoire sur le port 8883 ; le MQTT en clair est refusé", "docker/mosquitto.conf"],
            ["Faux broker", "Les clients ne font confiance qu’à la CA du projet et vérifient le nom du serveur", "provision.py, firmware"],
            ["Connexion anonyme ou mot de passe deviné", "Un mot de passe aléatoire de 32 caractères par client, haché par le broker", "provision.py, broker-entrypoint.sh"],
            ["Station volée qui se fait passer pour une autre", "ACL : chaque station n’écrit que sous antilles/<son-id>/…", "fichier acl généré"],
            ["Ingestor compromis", "Il ne peut que lire MQTT et insérer en base : pas de lecture, modification ni suppression des mesures", "sql/004_ingestor_role.sql"],
            ["Grafana compromis", "Rôle grafana_reader en lecture seule", "sql/002_station_health.sql"],
            ["Secrets dans le dépôt", "Tout est généré au démarrage, fichiers lisibles par leur seul propriétaire, rien n’est versionné", ".gitignore, volume broker-secrets"],
          ]}
        />
        <P>
          Ces protections sont vérifiées par des tests d’attaque sur un vrai broker configuré comme
          en production : connexion sans TLS, mauvais mot de passe, mot de passe d’une autre
          station, connexion anonyme, publication sur le topic d’une autre station, ingestor qui
          tente de publier. Tous doivent échouer, et le pipeline sécurisé doit fonctionner de bout
          en bout.
        </P>
      </Section>

      <Section id="tests" title="Tests et intégration continue">
        <Table
          head={["Niveau", "Ce qui est vérifié", "Outil"]}
          rows={[
            ["Unitaire Python", "Contrat des messages, physique et pannes du simulateur, regroupement par lots, génération des certificats", "pytest"],
            ["Intégration", "Simulateur → broker → ingestor → base ; doublons ; rejets ; redémarrage du simulateur sans fausse perte ; règles qualité ; rôles base", "pytest + testcontainers"],
            ["Grafana", "Chaque requête des tableaux de bord et des alertes, exécutée avec le rôle de Grafana", "tests/test_grafana.py"],
            ["Sécurité", "Les six tentatives d’intrusion décrites plus haut", "tests/test_security.py"],
            ["Firmware", "JSON, horodatages, décodeur PMS5003, tampon ; message de référence partagé avec Python", "Unity (pio test -e native)"],
            ["Build", "Firmware ESP32 (RAM et flash affichées), image Docker", "PlatformIO, Docker"],
          ]}
        />
        <P>Chaque pull request lance les cinq jobs de <Code>.github/workflows/ci.yml</Code> : Python 3.12 et 3.13, intégration, firmware, Docker.</P>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <div className="space-y-5">
          <Lesson title="Le faux taux de perte de 87 %">
            Après un redémarrage du simulateur, le tableau de bord affichait 87 % de messages
            perdus. L’historique republié repartait à la séquence 0 et s’entrelaçait avec l’ancien.
            Correctif : les lectures sont alignées sur une grille de 10 s et numérotées par
            créneau ; un redémarrage republie des lignes identiques, que la base ignore.
          </Lesson>
          <Lesson title="Les règles qualité ont pris le simulateur en défaut">
            Elles ont d’abord marqué 20 % des lectures comme « capteur bloqué ». Elles avaient
            raison : la probabilité de panne, appliquée toutes les 10 s, bloquait chaque capteur
            toutes les 80 minutes. Elle a été ramenée à un blocage toutes les 14 heures environ.
          </Lesson>
          <Lesson title="Contrôler à l’arrivée, pas à l’horodatage">
            Une station qui vide son tampon après une coupure envoie des lectures vieilles d’une
            heure. Une fenêtre « 3 dernières heures d’horodatage » ne les verrait jamais ; les règles
            examinent donc ce qui est arrivé récemment, quel que soit son horodatage.
          </Lesson>
          <Lesson title="Un pic se juge par rapport à ses voisines">
            Un panache de poussière monte sur des heures : ses voisines montent avec lui, il n’est
            pas marqué. Un parasite électrique isolé, si.
          </Lesson>
          <Lesson title="ON CONFLICT et les droits PostgreSQL">
            Nommer la clé dans <Code>ON CONFLICT (station_id, ts)</Code> exige le droit de lecture, et
            un droit limité à ces colonnes échoue sur la table compressée interne de TimescaleDB.
            Sans nommer la clé, <Code>ON CONFLICT DO NOTHING</Code> n’exige que l’insertion : le rôle
            de l’ingestor reste en insertion seule.
          </Lesson>
          <Lesson title="Un nom de fichier trop générique">
            <Code>__has_include(&quot;config.h&quot;)</Code> trouvait le <Code>config.h</Code>{" "}
            d’ESP-IDF : le firmware compilait avec de mauvaises constantes. Le fichier s’appelle
            désormais <Code>station_config.h</Code>.
          </Lesson>
          <Lesson title="Un test de sécurité doit échouer quand la protection disparaît">
            Le premier test « MQTT en clair refusé » levait lui-même l’exception attendue : il
            serait passé face à un broker ouvert. Il vérifie maintenant qu’aucune session
            n’aboutit.
          </Lesson>
          <Lesson title="Les détails de Grafana">
            L’unité µg/m³ s’écrit avec la lettre grecque mu (μ), pas le signe micro (µ) ; le fond
            de carte par défaut exige désormais une clé, d’où le passage à OpenStreetMap.
          </Lesson>
        </div>
      </Section>
    </ProjectLayout>
  );
}
