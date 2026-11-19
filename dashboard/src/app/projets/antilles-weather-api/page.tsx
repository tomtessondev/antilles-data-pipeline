import type { Metadata } from "next";

import { ProjectLayout } from "@/components/project/project-layout";
import { Code, Lesson, P, Recipe, Section, Steps, Table } from "@/components/project/prose";

import { ApiArchitecture } from "./_components/architecture";

export const metadata: Metadata = {
  title: "Projet API : la météo des Antilles, servie par une API",
  description:
    "Comment fonctionne antilles-weather-api : les indicateurs du pipeline batch chargés dans PostgreSQL et servis par une API FastAPI sur Cloud Run, avec clés, quotas et documentation interactive.",
};

const API = "https://weather-api-v4mw6h4rqa-uk.a.run.app";
const DEMO_KEY = "aw_QdQUnLvY1Ne2TOfZXPrP_2yex_ty9u9c03gHqnCgHgw";

const SECTIONS: [string, string][] = [
  ["probleme", "Le problème"],
  ["essayer", "L’essayer"],
  ["architecture", "Architecture"],
  ["passage", "Un appel, étape par étape"],
  ["acces", "Clés et quotas"],
  ["couts", "Un service qui dort"],
  ["technologies", "Technologies"],
  ["depot", "Organisation du dépôt"],
  ["modifier", "Comment modifier"],
  ["tests", "Tests et CI"],
  ["lecons", "Choix et leçons"],
];

const TREE = `antilles-weather-api/
├── src/weather_api/
│   ├── load.py         marts.json → PostgreSQL (une transaction)
│   ├── marts.py        le contrat du fichier, en Pydantic
│   ├── keys.py         clés d’API : création, révocation, hachage
│   ├── snapshot.py     clés, villes, dernier chargement, en mémoire
│   ├── access.py       contrôle de clé et quota par minute
│   ├── cache.py        réponses gardées jusqu’au chargement suivant
│   ├── queries.py      le SQL (jours complets uniquement)
│   ├── routes/         /v1 : villes, météo, air, résumé, épisodes
│   └── app.py          l’application FastAPI
├── migrations/         Alembic
├── infra/              Terraform : Cloud Run, registre, secret, fédération
├── Dockerfile          image légère, utilisateur non root
└── .github/workflows/  ci.yml, deploy.yml (main), daily.yml (11:00 UTC)`;

export default function WeatherApiProjectPage() {
  return (
    <ProjectLayout slug="antilles-weather-api" sections={SECTIONS} diagram={<ApiArchitecture />}>
      <Section id="probleme" title="Le problème et ce que fait le projet">
        <P>
          Le pipeline batch prépare chaque matin les indicateurs météo et qualité de l’air de six
          villes. Jusqu’ici, seul ce site pouvait les lire : il récupère un fichier JSON. Une
          application mobile, un tableur ou le système d’un client n’avaient aucun moyen propre
          de les interroger.
        </P>
        <P>
          Le projet les sert par une vraie API REST : des routes versionnées, filtrables et
          paginées, un contrat typé, des erreurs normalisées, une documentation interactive, des
          clés d’accès avec quota. Pour un client, c’est l’étape qui suit le pipeline : rendre
          la donnée utilisable par d’autres, sans risque et sans coût fixe.
        </P>
      </Section>

      <Section id="essayer" title="L’essayer">
        <P>
          Ouvrez la{" "}
          <a href={`${API}/docs`} className="underline">
            documentation interactive
          </a>
          , cliquez sur <Code>Authorize</Code> et collez la clé de démo (60 requêtes par minute,
          partagée par tous) : <Code>{DEMO_KEY}</Code>. Le premier appel après un moment de
          calme peut prendre une ou deux secondes : le service et la base se réveillent.
        </P>
        <Table
          head={["Route", "Ce qu’elle renvoie"]}
          rows={[
            [<Code key="r">/v1/locations</Code>, "Les six villes"],
            [<Code key="r">/v1/weather</Code>, "Températures, pluie et vent par jour et par ville"],
            [<Code key="r">/v1/air-quality</Code>, "PM10, PM2.5, poussières du Sahara, ozone, indice européen"],
            [<Code key="r">/v1/locations/FDF/summary?days=7</Code>, "Les 7 derniers jours complets d’une ville, comparés aux 7 d’avant"],
            [<Code key="r">/v1/dust-episodes</Code>, "Les jours où la moyenne PM10 dépasse la limite européenne de 50 µg/m³"],
            [<Code key="r">/v1/meta</Code>, "La date des données servies"],
          ]}
        />
      </Section>

      <Section id="architecture" title="Architecture">
        <P>
          Chaque matin à 11:00 UTC, une heure après l’export du pipeline batch, GitHub Actions
          lance <Code>weather-api load</Code> : le fichier est validé, puis copié dans PostgreSQL
          chez Neon en une seule transaction. L’API, en FastAPI, tourne sur Cloud Run dans un
          conteneur Docker ; elle descend à zéro instance quand personne ne l’appelle et monte à
          deux au plus.
        </P>
      </Section>

      <Section id="passage" title="Un appel, étape par étape">
        <P>Suivons une demande du résumé de Fort-de-France sur sept jours.</P>
        <Steps
          items={[
            {
              title: "La clé est vérifiée en mémoire",
              body: (
                <>
                  Une clé mal formée est refusée sur sa forme. Une clé bien formée est cherchée
                  par son empreinte SHA-256 parmi les clés actives gardées en mémoire : une clé
                  inventée ne coûte aucune requête à la base.
                </>
              ),
            },
            {
              title: "Le quota est compté",
              body: (
                <>
                  60 appels par minute pour la clé de démo ; au-delà, une réponse 429 indique
                  quand réessayer. Chaque réponse porte <Code>RateLimit-Remaining</Code>.
                </>
              ),
            },
            {
              title: "La réponse vient du cache, ou de PostgreSQL une seule fois",
              body: (
                <>
                  Si la même question a déjà été posée depuis le dernier chargement, la réponse
                  est en mémoire. Sinon, une requête SQL calcule moyennes, cumul de pluie et pic
                  de poussières sur les jours complets, puis la réponse est gardée.
                </>
              ),
            },
            {
              title: "Le client reçoit du JSON typé",
              body: (
                <>
                  Les champs portent leur unité (<Code>temp_avg_c</Code>,{" "}
                  <Code>pm10_avg_ugm3</Code>) ; une erreur est un document « problem details »
                  (RFC 9457) avec son statut et son explication.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="acces" title="Clés et quotas">
        <P>
          Une clé ressemble à <Code>aw_…</Code> (43 caractères aléatoires) ; seule son empreinte
          est stockée, si bien qu’une fuite de la base ne révèle aucune clé. La commande{" "}
          <Code>weather-api keys create --name client --per-minute 120</Code> crée une clé et
          l’affiche une seule fois ; <Code>revoke</Code> et <Code>list</Code> la gèrent. Une clé
          créée ou révoquée prend effet en quinze minutes au plus.
        </P>
      </Section>

      <Section id="couts" title="Un service qui dort">
        <P>
          Cloud Run et Neon sont gratuits dans ces volumes, à une condition : ne pas réveiller la
          base à chaque appel, car le calcul gratuit de Neon serait épuisé en deux ou trois
          semaines. L’API garde donc en mémoire les clés actives, les codes des villes et la date
          du dernier chargement, relus d’un coup au plus toutes les quinze minutes, et met chaque
          réponse en cache jusqu’au chargement suivant.
        </P>
        <Table
          head={["Service", "Part gratuite", "Usage"]}
          rows={[
            ["Cloud Run", "Environ 2 millions de requêtes par mois", "Zéro instance au repos, CPU facturé pendant les requêtes seulement"],
            ["Neon", "1 Go, 100 heures de calcul par mois", "Quelques dizaines de Ko ; éveillée au chargement et aux rafraîchissements"],
            ["Artifact Registry", "0,5 Go", "Les deux dernières images, quelques centimes par mois"],
          ]}
        />
      </Section>

      <Section id="technologies" title="Les technologies">
        <Table
          head={["Technologie", "Rôle ici", "Pourquoi ce choix", "Alternatives"]}
          rows={[
            ["FastAPI", "L’API", "Typage Pydantic, documentation OpenAPI générée, standard du Python moderne", "Flask, Django REST"],
            ["PostgreSQL (Neon)", "La base", "PostgreSQL géré, gratuit, mis en veille quand il ne sert pas", "Cloud SQL (payant au repos)"],
            ["SQLAlchemy + Alembic", "Requêtes et migrations", "SQL explicite, schéma versionné et appliqué avant chaque déploiement", "ORM complet, SQL brut"],
            ["Cloud Run", "Hébergement", "Un conteneur Docker, mis à l’échelle de zéro à deux instances", "Railway, Render, Fly.io"],
            ["Terraform", "Infrastructure", "Registre, secret, service, droits et fédération décrits en code", "Console, gcloud"],
            ["Workload Identity Federation", "Déploiement sans clé", "GitHub obtient des droits temporaires, seulement depuis main", "Clé de compte de service"],
            ["pytest", "Tests", "Contre un vrai PostgreSQL dans Docker, sans appel au cloud", "Base simulée"],
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
          <Recipe title="Ajouter une route">
            <p>Une requête dans <Code>queries.py</Code> (jours complets uniquement), une route dans <Code>routes/data.py</Code> avec son modèle de réponse et une clé de cache construite sur ses paramètres validés, puis un test dans <Code>tests/test_data.py</Code>.</p>
          </Recipe>
          <Recipe title="Changer le schéma">
            <p>Modifier <Code>db.py</Code>, ajouter une migration dans <Code>migrations/versions/</Code> : GitHub Actions l’applique avant le déploiement.</p>
          </Recipe>
          <Recipe title="Lancer en local">
            <p><Code>make db</Code> (PostgreSQL dans Docker), <Code>make check</Code> (style, typage strict, tests), puis <Code>make migrate load run</Code>.</p>
          </Recipe>
        </div>
      </Section>

      <Section id="tests" title="Tests et intégration continue">
        <Table
          head={["Domaine", "Ce qui est vérifié"]}
          rows={[
            ["Chargement", "Idempotent ; un fichier plus récent met à jour et supprime ce qui a disparu ; un fichier plus ancien est ignoré ; un fichier vide ou invalide n’écrit rien"],
            ["Accès", "401 sans clé, clé inconnue ou révoquée ; 429 avec délai ; une clé inventée ne touche pas la base"],
            ["Données", "Jours partiels jamais servis ; pagination complète sans doublon ; curseur trafiqué et ville inconnue refusés ; valeurs exactes du résumé"],
            ["Mémoire", "/health et les questions répétées ne touchent pas la base ; le cache ne grossit pas avec des paramètres parasites"],
          ]}
        />
        <P>37 tests contre PostgreSQL ; à chaque pull request, puis avant chaque déploiement depuis main.</P>
      </Section>

      <Section id="lecons" title="Choix de conception et leçons">
        <div className="space-y-5">
          <Lesson title="Gratuit, à condition de laisser dormir la base">
            Une première version vérifiait les clés dans PostgreSQL : la relecture finale a
            montré qu’un simple moniteur de disponibilité aurait gardé Neon éveillé jour et nuit,
            jusqu’à épuiser son quota. D’où la mémoire relue toutes les quinze minutes.
          </Lesson>
          <Lesson title="Le vrai fichier n’est pas le contrat">
            Le premier chargement réel a échoué : l’export contient des colonnes que le contrat
            ne liste pas. Le chargeur les ignore désormais, comme le fait déjà le site.
          </Lesson>
          <Lesson title="Un fichier plus ancien n’est pas une mise à jour">
            Une copie en cache du fichier pourrait écraser des données plus récentes : le
            chargeur compare les dates de production et garde la plus récente.
          </Lesson>
        </div>
      </Section>
    </ProjectLayout>
  );
}
