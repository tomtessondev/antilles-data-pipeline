import Link from "next/link";
import { Suspense } from "react";

import { PROJECTS } from "@/lib/portfolio";

import { CurrentNavLinks } from "./current-nav-links";
import { MobileMenu } from "./mobile-menu";
import { type NavGroup, NavLinks } from "./nav-links";

export const GITHUB_URL = "https://github.com/tomtessondev";

const GROUPS: NavGroup[] = [
  { entries: [{ href: "/", label: "Vue d’ensemble" }] },
  {
    title: "Projets",
    entries: PROJECTS.map((p) => ({ href: `/projets/${p.slug}`, label: p.family, sub: p.slug, color: p.color })),
  },
  {
    title: "Explorer",
    entries: [
      { href: "/demo", label: "Démo météo" },
      { href: "/projets/glossaire", label: "Glossaire" },
    ],
  },
];

function Brand() {
  return (
    <Link href="/" className="flex flex-col px-3 leading-tight focus-visible:outline-2 focus-visible:outline-accent">
      <span className="text-lg font-bold tracking-tight">Tom Tesson</span>
      <span className="text-sm text-ink-muted">Data engineer · Antilles</span>
    </Link>
  );
}

/** Wide screens: a sidebar that stays in place while the page scrolls. */
export function SiteSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-66 shrink-0 flex-col gap-7 overflow-y-auto border-r border-border bg-surface px-3.5 py-7 lg:flex">
      <Brand />
      <nav aria-label="Navigation principale">
        <Suspense fallback={<NavLinks groups={GROUPS} pathname={null} />}>
          <CurrentNavLinks groups={GROUPS} />
        </Suspense>
      </nav>
      <a
        href={GITHUB_URL}
        className="mt-auto rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
      >
        GitHub ↗
      </a>
    </aside>
  );
}

/** Narrow screens: a top bar whose menu lists the same links. */
export function SiteTopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-page lg:hidden">
      <div className="relative flex items-center justify-between px-4 py-3">
        <Brand />
        <Suspense fallback={null}>
          <MobileMenu groups={GROUPS} />
        </Suspense>
      </div>
    </header>
  );
}
