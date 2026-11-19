import Link from "next/link";
import type { ReactNode } from "react";

// Building blocks of the French project documentation (/projets).

export type TocItem = { id: string; label: string };

export function DocHeader({
  eyebrow,
  title,
  lead,
  links,
}: {
  eyebrow: string;
  title: string;
  lead: ReactNode;
  links: { href: string; label: string }[];
}) {
  return (
    <header className="space-y-3">
      <Link href="/#projets" className="text-sm text-ink-secondary hover:text-ink">
        ← Tous les projets
      </Link>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <div className="max-w-3xl space-y-2 text-ink-secondary">{lead}</div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="text-series-1 underline underline-offset-2">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}

export function Toc({ items }: { items: TocItem[] }) {
  return (
    <nav aria-label="Sommaire" className="rounded-lg border border-border bg-surface p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Sommaire</p>
      <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="text-ink-secondary hover:text-ink">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4">
      <h2 className="border-b border-border pb-2 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-3 leading-relaxed text-ink-secondary [&_strong]:text-ink">{children}</div>;
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-grid/60 px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="max-w-3xl space-y-3">
      {steps.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-medium text-ink">{step.title}</p>
            <div className="text-sm leading-relaxed text-ink-secondary">{step.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type Tech = { name: string; role: string; why: string; instead: string };

export function TechTable({ rows }: { rows: Tech[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-ink-muted">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-medium">Technologie</th>
            <th className="px-3 py-2 font-medium">Rôle ici</th>
            <th className="px-3 py-2 font-medium">Pourquoi ce choix</th>
            <th className="px-3 py-2 font-medium">Alternatives</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-medium text-ink">{row.name}</td>
              <td className="px-3 py-2 text-ink-secondary">{row.role}</td>
              <td className="px-3 py-2 text-ink-secondary">{row.why}</td>
              <td className="px-3 py-2 text-ink-muted">{row.instead}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** [path, description] pairs; indentation in the path (two spaces per level) is kept. */
export function RepoTree({ entries }: { entries: [string, string][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
      <table className="min-w-[40rem] font-mono text-[0.8rem] leading-relaxed">
        <tbody>
          {entries.map(([path, note]) => (
            <tr key={path}>
              <td className="whitespace-pre pr-6 align-top text-ink">{path}</td>
              <td className="font-sans text-ink-secondary">{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Recipe({ title, files, children }: { title: string; files: string[]; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="text-xs text-ink-muted">
        Fichiers :{" "}
        {files.map((f, i) => (
          <span key={f}>
            {i > 0 && ", "}
            <Code>{f}</Code>
          </span>
        ))}
      </p>
      <div className="space-y-2 text-sm leading-relaxed text-ink-secondary [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function Shell({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[0.8rem] leading-relaxed text-ink">
      {children}
    </pre>
  );
}

export function Lessons({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <dl className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-lg border border-border bg-surface p-4">
          <dt className="font-medium text-ink">{item.title}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-ink-secondary">{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}
