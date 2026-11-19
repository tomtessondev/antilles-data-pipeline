"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { type NavGroup, NavLinks } from "./nav-links";

/** The phone menu. The layout, and so this menu, stays mounted across navigations: it
    closes on any link click (even to the page already open), on Escape, and when the page
    changes. */
export function MobileMenu({ groups, githubUrl }: { groups: NavGroup[]; githubUrl: string }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const button = useRef<HTMLButtonElement>(null);

  function close(returnFocus: boolean) {
    setOpenOn(null);
    if (returnFocus) button.current?.focus();
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) close(true);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => (open ? close(false) : setOpenOn(pathname))}
        className="flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
        {open ? "Fermer" : "Menu"}
      </button>
      <nav
        id="mobile-menu"
        aria-label="Navigation principale"
        hidden={!open}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) close(false);
        }}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-border bg-page px-2 pb-4"
      >
        <NavLinks groups={groups} pathname={pathname} />
        <a href={githubUrl} className="mt-2 block rounded-lg px-3 py-2 text-[15px] text-ink-secondary hover:bg-surface-2">
          GitHub ↗
        </a>
      </nav>
    </div>
  );
}
