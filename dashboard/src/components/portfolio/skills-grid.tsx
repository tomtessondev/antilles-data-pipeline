import { PROJECTS, SKILL_LABELS, type Skill } from "@/lib/portfolio";

const HEAD = "border-b border-border text-left text-xs font-semibold tracking-wider text-ink-muted uppercase";

/** One row per skill, one column per project; each cell names how the project shows it. */
export function SkillsGrid() {
  const skills = Object.keys(SKILL_LABELS) as Skill[];
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[50rem] border-collapse text-[13.5px] leading-snug">
        <caption className="sr-only">Savoir-faire démontrés par chaque projet</caption>
        <thead>
          <tr>
            <th scope="col" className={`w-40 px-4 py-4 ${HEAD}`}>
              Savoir-faire
            </th>
            {PROJECTS.map((p) => (
              <th key={p.slug} scope="col" className="border-b border-border px-3 py-4 text-left font-semibold">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: `var(${p.color})` }} />
                  {p.family}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                {SKILL_LABELS[skill]}
              </th>
              {PROJECTS.map((p) => {
                const proof = p.skills[skill];
                return (
                  <td key={p.slug} className={`px-3 py-3 ${proof ? "" : "text-ink-muted"}`}>
                    {proof ?? <span aria-label="non couvert">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
