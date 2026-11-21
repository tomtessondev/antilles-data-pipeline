import type { ReactNode } from "react";

import { generatedLabel } from "@/lib/published";

export const SELECT =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent";

export const AXIS_TICK = { fill: "var(--ink-muted)", fontSize: 12 };

export function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4">
      <header className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-secondary">
      {label}
      {children}
    </label>
  );
}

/** "Données du …" under an explorer, or why the sample is shown. */
export function Generated({ at, sample }: { at: string; sample: boolean }) {
  return <p className={`text-sm ${sample ? "font-medium text-ink-secondary" : "text-ink-muted"}`}>{generatedLabel(at, sample)}</p>;
}
