import type { ReactNode } from "react";

/* Typographic helpers shared by the sections of the page. */

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 space-y-4">
      <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl leading-relaxed text-ink-secondary">{children}</p>;
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-grid/60 px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

export function Steps({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="max-w-3xl space-y-3">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-ink-secondary"
          >
            {i + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{item.title}</p>
            <div className="leading-relaxed text-ink-secondary">{item.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-ink-muted">
          <tr className="border-b border-border">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border align-top last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium" : "text-ink-secondary"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Recipe({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-surface p-4 open:space-y-3">
      <summary className="cursor-pointer marker:text-ink-muted">
        <h3 className="inline font-medium">{title}</h3>
      </summary>
      <div className="space-y-2 leading-relaxed text-ink-secondary">{children}</div>
    </details>
  );
}

export function Lesson({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1 border-l-2 border-series-2 pl-4">
      <h3 className="font-medium">{title}</h3>
      <div className="max-w-3xl leading-relaxed text-ink-secondary">{children}</div>
    </div>
  );
}
