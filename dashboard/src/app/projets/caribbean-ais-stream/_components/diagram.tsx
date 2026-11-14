import type { ReactNode } from "react";

/** A titled figure whose SVG scrolls sideways on narrow screens instead of shrinking. */
export function Figure({
  title,
  caption,
  minWidth,
  children,
}: {
  title: string;
  caption: string;
  minWidth: number;
  children: ReactNode;
}) {
  return (
    <figure className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4">
      <figcaption className="space-y-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-secondary">{caption}</span>
      </figcaption>
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>{children}</div>
      </div>
    </figure>
  );
}

/** Arrow-head marker; `id` must be unique per SVG. */
export function ArrowMarker({ id, color = "var(--ink-muted)" }: { id: string; color?: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={color} />
      </marker>
    </defs>
  );
}

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  accent?: string;
  dashed?: boolean;
};

/** A labelled box: bold title, then smaller lines. Colours come from the site tokens. */
export function Box({ x, y, w, h, title, lines = [], accent, dashed = false }: BoxProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="var(--surface)"
        stroke={accent ?? "var(--baseline)"}
        strokeWidth={accent ? 2 : 1.2}
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <text x={x + 12} y={y + 22} fill="var(--ink)" fontSize={14} fontWeight={600}>
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 12} y={y + 42 + i * 17} fill="var(--ink-secondary)" fontSize={12}>
          {line}
        </text>
      ))}
    </g>
  );
}
