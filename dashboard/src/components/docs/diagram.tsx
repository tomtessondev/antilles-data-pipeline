import type { ReactNode } from "react";

// SVG building blocks for the architecture diagrams. Every colour comes from the site's
// tokens, so the diagrams follow the light and dark themes.

export type Tone = "source" | "process" | "store" | "serve" | "infra" | "alert";

const TONE: Record<Tone, string> = {
  source: "var(--series-2)",
  process: "var(--town-3)",
  store: "var(--series-1)",
  serve: "var(--town-5)",
  infra: "var(--ink-muted)",
  alert: "var(--critical)",
};

type DiagramProps = {
  id: string;
  title: string;
  caption?: string;
  width: number;
  height: number;
  children: ReactNode;
};

/** A figure that scrolls sideways inside itself on narrow screens instead of shrinking. */
export function Diagram({ id, title, caption, width, height, children }: DiagramProps) {
  return (
    <figure className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={`${id}-title`}
          style={{ minWidth: Math.min(width, 640), width: "100%", height: "auto" }}
        >
          <title id={`${id}-title`}>{title}</title>
          <defs>
            <marker
              id={`${id}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--ink-muted)" }} />
            </marker>
          </defs>
          {children}
        </svg>
      </div>
      {caption && <figcaption className="text-sm text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

type NodeProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  sub2?: string;
  tone?: Tone;
  dashed?: boolean;
};

export function Node({ x, y, w, h, label, sub, sub2, tone = "process", dashed }: NodeProps) {
  const color = TONE[tone];
  const lines = [sub, sub2].filter(Boolean).length;
  const top = y + h / 2 - (lines * 7);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        style={{
          fill: `color-mix(in oklab, ${color} 13%, var(--surface))`,
          stroke: color,
          strokeWidth: 1.5,
          strokeDasharray: dashed ? "5 4" : undefined,
        }}
      />
      <text
        x={x + w / 2}
        y={top}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "var(--ink)", fontSize: 13, fontWeight: 600 }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={top + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: "var(--ink-secondary)", fontSize: 11 }}
        >
          {sub}
        </text>
      )}
      {sub2 && (
        <text
          x={x + w / 2}
          y={top + 30}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: "var(--ink-secondary)", fontSize: 11 }}
        >
          {sub2}
        </text>
      )}
    </g>
  );
}

type ArrowProps = {
  id: string;
  points: [number, number][];
  label?: string;
  labelAt?: [number, number];
  dashed?: boolean;
};

/** A polyline with an arrow head at the end; `id` is the diagram's id (for the marker). */
export function Arrow({ id, points, label, labelAt, dashed }: ArrowProps) {
  const d = points.map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px} ${py}`).join(" ");
  const [lx, ly] = labelAt ?? points[Math.floor(points.length / 2)];
  return (
    <g>
      <path
        d={d}
        markerEnd={`url(#${id}-arrow)`}
        style={{
          fill: "none",
          stroke: "var(--ink-muted)",
          strokeWidth: 1.5,
          strokeDasharray: dashed ? "5 4" : undefined,
        }}
      />
      {label && (
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          style={{ fill: "var(--ink-secondary)", fontSize: 11 }}
          paintOrder="stroke"
          stroke="var(--surface)"
          strokeWidth={4}
        >
          {label}
        </text>
      )}
    </g>
  );
}

type GroupProps = { x: number; y: number; w: number; h: number; label: string };

/** A dashed frame around related nodes, labelled at the top left. */
export function Group({ x, y, w, h, label }: GroupProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        style={{ fill: "none", stroke: "var(--baseline)", strokeWidth: 1, strokeDasharray: "4 4" }}
      />
      <text x={x + 10} y={y + 16} style={{ fill: "var(--ink-muted)", fontSize: 11, fontWeight: 600 }}>
        {label}
      </text>
    </g>
  );
}

type TextProps = { x: number; y: number; children: string; muted?: boolean; anchor?: "start" | "middle" | "end"; size?: number; bold?: boolean };

export function Label({ x, y, children, muted, anchor = "start", size = 12, bold }: TextProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      style={{
        fill: muted ? "var(--ink-muted)" : "var(--ink)",
        fontSize: size,
        fontWeight: bold ? 600 : 400,
      }}
    >
      {children}
    </text>
  );
}

export function Legend({ items }: { items: [Tone, string][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary">
      {items.map(([tone, text]) => (
        <li key={tone} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm border"
            style={{
              background: `color-mix(in oklab, ${TONE[tone]} 13%, var(--surface))`,
              borderColor: TONE[tone],
            }}
          />
          {text}
        </li>
      ))}
    </ul>
  );
}
