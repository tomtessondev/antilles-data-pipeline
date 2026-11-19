import Link from "next/link";
import type { ReactNode } from "react";

import { neighbours, type Project, PROJECTS, projectBySlug } from "@/lib/portfolio";

import { Toc } from "./toc";

const LABEL = "text-xs font-semibold tracking-wider text-ink-muted uppercase";

function Swatch({ project }: { project: Project }) {
  return <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: `var(${project.color})` }} />;
}

function Brief({ project }: { project: Project }) {
  return (
    <section aria-label="En bref" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed">
      <p className={LABEL}>En bref</p>
      <p>
        <span className="font-semibold">Problème · </span>
        <span className="text-ink-secondary">{project.problem}</span>
      </p>
      <p>
        <span className="font-semibold">Résultat · </span>
        <span className="text-ink-secondary">{project.result}</span>
      </p>
      <p>
        <span className="font-semibold">Pour un client · </span>
        <span className="text-ink-secondary">{project.clientValue}</span>
      </p>
      <ul aria-label="Technologies" className="flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li key={tech} className="rounded-md border border-border px-2 py-0.5 text-[13px] text-ink-secondary">
            {tech}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5 border-t border-border pt-3 font-semibold text-accent">
        <a href={project.repo} className="hover:underline">
          Dépôt GitHub ↗
        </a>
        {project.docs ? (
          <a href={project.docs} className="hover:underline">
            Documentation dbt ↗
          </a>
        ) : null}
        {project.links?.map((link) => (
          <a key={link.href} href={link.href} className="hover:underline">
            {link.label} ↗
          </a>
        ))}
        {project.demo ? (
          <Link href={project.demo} className="hover:underline">
            Démo en ligne →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function PrevNext({ slug }: { slug: string }) {
  const { previous, next } = neighbours(slug);
  const card = "flex flex-col gap-1.5 rounded-2xl border border-border bg-surface px-5 py-4 hover:bg-surface-2";
  return (
    <nav aria-label="Projets voisins" className="grid gap-4 sm:grid-cols-2">
      {previous ? (
        <Link href={`/projets/${previous.slug}`} className={card}>
          <span className="text-sm text-ink-muted">← Projet précédent · {previous.family}</span>
          <span className="font-mono text-[15px]">{previous.slug}</span>
        </Link>
      ) : (
        <Link href="/" className={card}>
          <span className="text-sm text-ink-muted">← Vue d’ensemble</span>
          <span className="text-[15px] font-semibold">Les six projets</span>
        </Link>
      )}
      {next ? (
        <Link href={`/projets/${next.slug}`} className={`${card} sm:text-right`}>
          <span className="text-sm text-ink-muted">Projet suivant · {next.family} →</span>
          <span className="font-mono text-[15px]">{next.slug}</span>
        </Link>
      ) : (
        <Link href="/" className={`${card} sm:text-right`}>
          <span className="text-sm text-ink-muted">Retour à la vue d’ensemble →</span>
          <span className="text-[15px] font-semibold">Les six projets</span>
        </Link>
      )}
    </nav>
  );
}

type Props = {
  slug: string;
  /** The page's sections, in order: their ids and titles feed "Sur cette page". */
  sections: [id: string, title: string][];
  /** The architecture diagram shown under the title. */
  diagram: ReactNode;
  children: ReactNode;
};

/** The template of every project page: title, architecture, text with its contents and
    "En bref" box, then the neighbouring projects. */
export function ProjectLayout({ slug, sections, diagram, children }: Props) {
  const project = projectBySlug(slug);
  const position = PROJECTS.indexOf(project) + 1;
  return (
    <article className="flex flex-col gap-10">
      <header className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm text-ink-muted">
          <Link href="/#projets" className="hover:text-ink hover:underline">
            Projets
          </Link>{" "}
          / {position} sur {PROJECTS.length} · {project.family}
        </p>
        <p className="flex flex-wrap items-center gap-2.5">
          <Swatch project={project} />
          <span className="text-[13px] font-semibold tracking-widest text-ink-secondary uppercase">{project.family}</span>
          <span className="font-mono text-sm text-ink-muted">{project.slug}</span>
        </p>
        <h1 className="text-[2rem] leading-[1.12] font-bold tracking-tight text-balance sm:text-[2.75rem]">{project.title}</h1>
        <p className="text-lg leading-relaxed text-ink-secondary">{project.pitch}</p>
      </header>

      {diagram}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-12">
        <aside className="flex flex-col gap-6 self-start xl:sticky xl:top-8 xl:col-start-2 xl:row-start-1">
          <Toc sections={sections} />
          <Brief project={project} />
        </aside>
        <div className="flex min-w-0 flex-col gap-12 xl:col-start-1 xl:row-start-1">{children}</div>
      </div>

      <PrevNext slug={slug} />
    </article>
  );
}
