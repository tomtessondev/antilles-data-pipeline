import Link from "next/link";

import { PROJECTS } from "@/lib/portfolio";

export function ProjectCards() {
  return (
    <ol className="grid gap-5 md:grid-cols-2">
      {PROJECTS.map((p, i) => (
        <li key={p.slug} className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-secondary uppercase">
              <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(${p.color})` }} />
              {p.family}
            </span>
            <span className="text-sm text-ink-muted">
              {i + 1} / {PROJECTS.length}
            </span>
          </div>
          <h3 className="font-mono text-[17px] font-medium">{p.slug}</h3>
          <p className="text-[15px] leading-relaxed text-ink-secondary">{p.pitch}</p>
          <p className="text-[15px] leading-relaxed">
            <span className="font-semibold">Pour un client : </span>
            {p.clientValue}
          </p>
          <ul aria-label="Technologies" className="flex flex-wrap gap-1.5">
            {p.stack.map((tech) => (
              <li key={tech} className="rounded-md border border-border px-2 py-0.5 text-[13px] text-ink-secondary">
                {tech}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-1.5 text-[15px]">
            <Link href={`/projets/${p.slug}`} className="font-semibold text-accent hover:underline">
              Comment ça marche →
            </Link>
            <a href={p.repo} className="text-ink-secondary hover:text-ink hover:underline">
              Code sur GitHub
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}
