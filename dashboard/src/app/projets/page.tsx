import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projets",
  description:
    "Quatre projets de data engineering sur les Antilles : un pipeline batch, une chaîne IoT, un flux temps réel et un lakehouse. Comment ils fonctionnent et comment les modifier.",
};

type Project = {
  slug: string;
  kind: string;
  name: string;
  pitch: string;
  client: string;
  stack: string[];
  repo: string;
};

const PROJECTS: Project[] = [
  {
    slug: "antilles-data-pipeline",
    kind: "Batch",
    name: "antilles-data-pipeline",
    pitch:
      "Chaque matin, la météo et la qualité de l’air de six villes de Guadeloupe et de Martinique sont extraites, gardées dans un lac de données, transformées, testées et publiées sur ce site.",
    client:
      "Un pipeline complet des API au tableau de bord : historique conservé, données testées, infrastructure en code.",
    stack: ["Python", "S3 + Parquet", "DuckDB", "dbt", "Dagster", "Terraform", "Next.js"],
    repo: "https://github.com/tomtessondev/antilles-data-pipeline",
  },
  {
    slug: "caribbean-sensor-pipeline",
    kind: "IoT",
    name: "caribbean-sensor-pipeline",
    pitch:
      "Des stations de mesure (simulées, et un firmware ESP32) publient la qualité de l’air en MQTT ; un service les valide et les stocke dans TimescaleDB ; Grafana affiche, contrôle et alerte.",
    client:
      "Du capteur au tableau de bord : messages sécurisés, aucune donnée perdue ni dupliquée, contrôle qualité automatique.",
    stack: ["C++ / ESP32", "MQTT (Mosquitto)", "Python", "TimescaleDB", "Grafana"],
    repo: "https://github.com/tomtessondev/caribbean-sensor-pipeline",
  },
  {
    slug: "caribbean-ais-stream",
    kind: "Temps réel",
    name: "caribbean-ais-stream",
    pitch:
      "Les positions des navires autour des Petites Antilles arrivent en continu ; elles sont nettoyées et rangées dans Kafka, avant d’être analysées en temps réel avec Flink.",
    client:
      "Un flux d’événements continu traité sans perte et dans l’ordre : la base de tout suivi en temps réel.",
    stack: ["Python", "WebSocket", "Kafka", "Flink"],
    repo: "https://github.com/tomtessondev/caribbean-ais-stream",
  },
  {
    slug: "antilles-climate-lakehouse",
    kind: "Lakehouse",
    name: "antilles-climate-lakehouse",
    pitch:
      "Toutes les mesures quotidiennes de Météo-France aux Antilles depuis 1950, rangées en couches bronze, argent et or, pour suivre l’évolution du climat de chaque île.",
    client:
      "Une plateforme Databricks type : historique fiable, corrections prises en compte, indicateurs qui ne trompent pas.",
    stack: ["PySpark", "Delta Lake", "Databricks", "Unity Catalog"],
    repo: "https://github.com/tomtessondev/antilles-climate-lakehouse",
  },
];

export default function ProjectsPage() {
  return (
    <article lang="fr" className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Portfolio</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Quatre projets de data engineering, sur les mêmes îles
        </h1>
        <p className="text-ink-secondary">
          Un pipeline batch, une chaîne IoT, un flux temps réel et un lakehouse : les grandes familles de
          projets de données, construites sur des données réelles des Antilles. Chaque page
          explique le fonctionnement, les technologies, l’organisation du code et comment le
          modifier.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {PROJECTS.map((project) => (
          <section
            key={project.slug}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{project.kind}</p>
            <h2 className="font-mono text-lg font-semibold text-ink">{project.name}</h2>
            <p className="text-sm leading-relaxed text-ink-secondary">{project.pitch}</p>
            <p className="text-sm leading-relaxed text-ink">
              <span className="font-medium">Pour un client : </span>
              {project.client}
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
              {project.stack.map((tech) => (
                <li key={tech} className="rounded border border-border px-2 py-0.5 text-xs text-ink-secondary">
                  {tech}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
              <Link href={`/projets/${project.slug}`} className="font-medium text-series-1 underline underline-offset-2">
                Comment ça marche
              </Link>
              <a href={project.repo} className="text-ink-secondary hover:text-ink">
                Code sur GitHub
              </a>
            </div>
          </section>
        ))}
      </div>

      <p className="text-sm text-ink-muted">
        Un mot inconnu ? Le{" "}
        <Link href="/projets/glossaire" className="underline underline-offset-2">
          glossaire
        </Link>{" "}
        explique les termes des quatre projets.
      </p>
    </article>
  );
}
