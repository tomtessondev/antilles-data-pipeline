import type { ReactNode } from "react";

/* SVG building blocks for the documentation diagrams. Colours come from the site's tokens
   through Tailwind classes, so the drawings follow the light and dark themes. */

type Tone = "neutral" | "primary" | "accent" | "alert";

const BOX_TONE: Record<Tone, string> = {
  neutral: "fill-surface stroke-baseline",
  primary: "fill-surface stroke-series-1",
  accent: "fill-surface stroke-series-2",
  alert: "fill-surface stroke-critical",
};

export function Box({
  x,
  y,
  w,
  h,
  title,
  lines = [],
  tone = "neutral",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines?: string[];
  tone?: Tone;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} strokeWidth={1.5} className={BOX_TONE[tone]} />
      <text x={x + w / 2} y={y + 22} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={line}
          x={x + w / 2}
          y={y + 44 + i * 17}
          textAnchor="middle"
          className="fill-ink-secondary text-[11.5px]"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function ArrowMarker({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-ink-muted" />
      </marker>
    </defs>
  );
}

export function Arrow({
  from,
  to,
  marker,
  label,
  labelOffset = -8,
  dashed = false,
  tone = "neutral",
}: {
  from: [number, number];
  to: [number, number];
  marker: string;
  label?: string;
  labelOffset?: number;
  dashed?: boolean;
  tone?: "neutral" | "alert";
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd={`url(#${marker})`}
        className={tone === "alert" ? "stroke-critical" : "stroke-ink-muted"}
      />
      {label && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 + labelOffset}
          textAnchor="middle"
          className="fill-ink-muted text-[11px]"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** A diagram in its own horizontally scrollable frame, so the page itself never overflows. */
export function Figure({
  title,
  caption,
  viewBox,
  minWidth,
  children,
}: {
  title: string;
  caption: string;
  viewBox: string;
  minWidth: number;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={title}
          className="h-auto w-full"
          style={{ minWidth }}
        >
          <title>{title}</title>
          {children}
        </svg>
      </div>
      <figcaption className="text-sm text-ink-muted">{caption}</figcaption>
    </figure>
  );
}
