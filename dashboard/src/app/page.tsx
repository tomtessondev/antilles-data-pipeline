import Link from "next/link";

import { OverviewDiagram } from "@/components/portfolio/overview-diagram";
import { ProjectCards } from "@/components/portfolio/project-cards";
import { SkillsGrid } from "@/components/portfolio/skills-grid";

const FACTS: { value: string; label: string }[] = [
  { value: "5 projets", label: "cinq familles du data engineering" },
  { value: "5 dépôts", label: "publics, testés en intégration continue" },
  { value: "3 clouds", label: "AWS, Google Cloud, Databricks" },
  { value: "1851 → 2026", label: "des ouragans d’hier aux navires d’aujourd’hui" },
];

function SectionHead({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-3xl flex-col gap-2.5">
      <h2 id={id} className="text-[2rem] leading-tight font-bold tracking-tight">
        {title}
      </h2>
      <p className="text-[17px] text-ink-secondary">{children}</p>
    </div>
  );
}

export default function PortfolioHome() {
  return (
    <div className="flex flex-col gap-24 lg:gap-28">
      <section className="flex max-w-[54rem] flex-col gap-6 pt-6 lg:pt-10">
        <p className="text-[13px] font-semibold tracking-widest text-ink-muted uppercase">
          Portfolio · données des Antilles
        </p>
        <h1 className="text-[2rem] leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
          Cinq projets de data engineering, de la donnée brute au résultat, sur les mêmes îles.
        </h1>
        <p className="text-lg leading-relaxed text-ink-secondary sm:text-[19px]">
          Ingénieur FPGA et systèmes embarqués, je me suis tourné vers le data engineering. Ce
          portfolio en couvre les grandes familles — batch, IoT, temps réel, lakehouse, entrepôt
          cloud — chacune construite de bout en bout sur des données réelles de Guadeloupe, de
          Martinique et des îles voisines : testée, documentée, déployée.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <a href="#projets" className="rounded-[10px] bg-ink px-5 py-3 text-center font-semibold text-page">
            Voir les projets
          </a>
          <Link href="/demo" className="rounded-[10px] border border-border px-5 py-3 text-center font-semibold hover:bg-surface-2">
            Démo météo en direct
          </Link>
        </div>
      </section>

      <section
        aria-label="En chiffres"
        className="-mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4"
      >
        {FACTS.map((f) => (
          <div key={f.value} className="flex flex-col gap-1 bg-surface px-6 py-5">
            <span className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">{f.value}</span>
            <span className="text-sm text-ink-secondary">{f.label}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="vue" className="flex flex-col gap-7">
        <SectionHead id="vue" title="Comment les projets s’articulent">
          Chaque projet suit le même chemin, de la source au résultat, avec une technique
          différente. Du lot quotidien au flux continu, puis aux plateformes de données des grandes
          entreprises.
        </SectionHead>
        <OverviewDiagram />
      </section>

      <section aria-labelledby="competences" className="flex flex-col gap-7">
        <SectionHead id="competences" title="Ce que chaque projet démontre">
          Une ligne par savoir-faire, une colonne par projet. Chaque case dit avec quoi c’est fait ;
          les détails sont sur la page du projet.
        </SectionHead>
        <SkillsGrid />
      </section>

      <section id="projets" aria-labelledby="projets-titre" className="flex scroll-mt-6 flex-col gap-7">
        <SectionHead id="projets-titre" title="Les projets">
          À lire dans l’ordre ou séparément : chaque page explique le fonctionnement, les choix et
          comment modifier le code.
        </SectionHead>
        <ProjectCards />
      </section>
    </div>
  );
}
