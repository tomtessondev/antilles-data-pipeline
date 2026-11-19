import Link from "next/link";

import type { FamilyColor } from "@/lib/portfolio";

export type NavEntry = { href: string; label: string; sub?: string; color?: FamilyColor };
export type NavGroup = { title?: string; entries: NavEntry[] };

function isCurrent(href: string, pathname: string | null): boolean {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The site's links, grouped; `pathname` marks the current one (null while unknown). */
export function NavLinks({ groups, pathname }: { groups: NavGroup[]; pathname: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 text-[15px]">
      {groups.map((group, i) => (
        <div key={group.title ?? i} className="flex flex-col gap-0.5">
          {group.title ? (
            <p className="px-3 pt-5 pb-1.5 text-xs font-semibold tracking-wider text-ink-muted uppercase">
              {group.title}
            </p>
          ) : null}
          {group.entries.map((entry) => {
            const current = isCurrent(entry.href, pathname);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 outline-offset-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent ${
                  current ? "bg-surface-2 font-semibold text-ink" : "text-ink-secondary"
                }`}
              >
                {entry.color ? (
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ background: `var(${entry.color})` }}
                  />
                ) : null}
                <span className="flex min-w-0 flex-col leading-snug">
                  <span className={entry.sub ? "text-ink" : undefined}>{entry.label}</span>
                  {entry.sub ? (
                    <span className="truncate font-mono text-[11px] text-ink-muted">{entry.sub}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
