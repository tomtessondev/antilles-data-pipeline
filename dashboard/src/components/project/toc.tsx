"use client";

import { useEffect, useState } from "react";

/** "Sur cette page": the sections of a project page, the one being read marked. */
export function Toc({ sections }: { sections: [id: string, title: string][] }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    // A section counts as being read once its top passes the upper third of the window.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "0px 0px -66% 0px" },
    );
    for (const [id] of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    // A short last section never reaches the upper third: at the bottom of the page, it is
    // the one being read.
    const atBottom = () => {
      const last = sections.at(-1);
      if (last && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        setCurrent(last[0]);
      }
    };
    window.addEventListener("scroll", atBottom, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", atBottom);
    };
  }, [sections]);

  return (
    <nav aria-label="Sur cette page" className="flex flex-col gap-0.5 text-sm">
      <p className="pb-2 text-xs font-semibold tracking-wider text-ink-muted uppercase">Sur cette page</p>
      {sections.map(([id, title]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={current === id ? "location" : undefined}
          className={`rounded-md border-l-2 px-3 py-1.5 outline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${
            current === id ? "border-ink font-semibold text-ink" : "border-transparent text-ink-secondary"
          }`}
        >
          {title}
        </a>
      ))}
    </nav>
  );
}
