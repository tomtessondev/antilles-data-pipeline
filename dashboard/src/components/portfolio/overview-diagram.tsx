import { type Project, PROJECTS, SHARED } from "@/lib/portfolio";

const STAGES: { key: keyof Project["flow"]; label: string; tinted: boolean }[] = [
  { key: "source", label: "Source", tinted: false },
  { key: "process", label: "Traitement", tinted: true },
  { key: "result", label: "Résultat", tinted: false },
];

const STAGE_LABEL = "text-xs font-semibold tracking-wider text-ink-muted uppercase";

function Family({ project }: { project: Project }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-ink-secondary uppercase">
        <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(${project.color})` }} />
        {project.family}
      </span>
      <span className="font-mono text-[13px] text-ink">{project.slug}</span>
    </span>
  );
}

function Box({ text, tinted }: { text: string; tinted: boolean }) {
  return (
    <div
      className={`flex min-h-19 items-center rounded-[10px] border border-border px-3.5 py-3 text-sm leading-snug ${
        tinted ? "bg-[color-mix(in_srgb,var(--series-1)_7%,transparent)]" : "bg-page"
      }`}
    >
      {text}
    </div>
  );
}

/** The six projects side by side, each from source to result, and what they share. */
export function OverviewDiagram() {
  return (
    <figure className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <figcaption className="sr-only">
        Les six projets, chacun de sa source à son résultat, et ce qu’ils ont en commun.
      </figcaption>

      {/* Wide screens: one column per project, one row per stage. Hidden from screen readers,
          which read the same content as the list below, one project at a time. */}
      <div aria-hidden="true" className="hidden grid-cols-[6rem_repeat(6,minmax(0,1fr))] gap-3 md:grid">
        <div />
        {PROJECTS.map((p) => (
          <div key={p.slug} className="pb-1.5">
            <Family project={p} />
          </div>
        ))}
        {STAGES.map((stage) => (
          <div key={stage.key} className="contents">
            <div className={`flex items-center ${STAGE_LABEL}`}>{stage.label}</div>
            {PROJECTS.map((p) => (
              <Box key={p.slug} text={p.flow[stage.key]} tinted={stage.tinted} />
            ))}
          </div>
        ))}
      </div>

      {/* Phones: one block per project, its stages one under the other; on wide screens the
          same list stays for screen readers only. */}
      <ol className="flex flex-col gap-4 md:sr-only">
        {PROJECTS.map((p) => (
          <li key={p.slug} className="flex flex-col gap-2">
            <Family project={p} />
            {STAGES.map((stage, i) => (
              <div key={stage.key} className="flex flex-col gap-1">
                {i > 0 ? (
                  <span aria-hidden="true" className="text-center leading-none text-ink-muted">
                    ↓
                  </span>
                ) : null}
                <Box text={p.flow[stage.key]} tinted={stage.tinted} />
              </div>
            ))}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 border-t border-dashed border-border pt-4">
        <p className={STAGE_LABEL}>Ce qui les relie</p>
        <ul className="flex flex-wrap gap-2.5">
          {SHARED.map((s) => (
            <li
              key={s.what}
              className="inline-flex items-center gap-2.5 rounded-full border border-border bg-page px-3 py-2 text-sm"
            >
              <span className="font-semibold">{s.what}</span>
              <span className="text-ink-secondary">{s.where}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
