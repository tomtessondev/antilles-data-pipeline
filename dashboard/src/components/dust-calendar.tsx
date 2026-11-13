"use client";

import Link from "next/link";
import { useState } from "react";

import { dateRange, formatDay, type TownDay, type TownSeries } from "@/lib/analysis";
import { normalise, rampColor } from "@/lib/colors";

type Props = {
  series: TownSeries[];
  end: string;
  period: number;
  highlight?: string | null;
  onHighlight?: (code: string | null) => void;
};

type Hovered = { town: string; date: string; day?: TownDay };

// Fixed scale, so a calm month looks calm: Saharan episodes push the hourly peak well
// above 100 µg/m³, while background levels stay in the low tens.
const DUST_SCALE_MAX_UGM3 = 200;

/**
 * One row per town, one cell per day, shaded by the dust peak. A triangle marks the days
 * whose PM10 daily mean is above the EU limit, so the alert never relies on colour.
 */
export function DustCalendar({ series, end, period, highlight = null, onHighlight }: Props) {
  const [hovered, setHovered] = useState<Hovered | null>(null);
  const dates = dateRange(end, period);
  const lookup = new Map(series.map((s) => [s.location.location_code, new Map(s.days.map((d) => [d.date, d]))]));
  const max = DUST_SCALE_MAX_UGM3;

  const readout = hovered
    ? `${formatDay(hovered.date)} · ${hovered.town} · ` +
      (hovered.day?.airQuality
        ? `dust peak ${hovered.day.airQuality.dust_max_ugm3?.toFixed(0) ?? "–"} µg/m³, PM10 mean ${
            hovered.day.airQuality.pm10_avg_ugm3?.toFixed(0) ?? "–"
          } µg/m³${hovered.day.airQuality.exceeds_pm10_daily_limit ? " (above EU limit)" : ""}`
        : "no data")
    : "Hover a day for its values.";

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[36rem] items-center gap-[2px]"
          style={{ gridTemplateColumns: `8.5rem repeat(${dates.length}, minmax(0, 1fr)) 4.5rem` }}
          onMouseLeave={() => setHovered(null)}
        >
          <span />
          {dates.map((date, i) => (
            <span key={date} className="whitespace-nowrap text-[10px] text-ink-muted">
              {i % Math.ceil(dates.length / 6) === 0 ? formatDay(date) : ""}
            </span>
          ))}
          <span className="pl-2 text-[10px] text-ink-muted">Days &gt; limit</span>

          {series.map((s) => {
            const code = s.location.location_code;
            const days = lookup.get(code);
            const exceedances = dates.filter((d) => days?.get(d)?.airQuality?.exceeds_pm10_daily_limit).length;
            const dimmed = highlight !== null && highlight !== code;
            return (
              <div
                key={code}
                className={`contents ${dimmed ? "[&>*]:opacity-50" : ""}`}
                onMouseEnter={() => onHighlight?.(code)}
                onMouseLeave={() => onHighlight?.(null)}
              >
                <Link href={`/towns/${code}`} className="truncate pr-2 text-sm hover:underline">
                  {s.location.town}
                </Link>
                {dates.map((date) => {
                  const day = days?.get(date);
                  const dust = day?.airQuality?.dust_max_ugm3 ?? null;
                  const t = dust === null ? 0 : normalise(dust, 0, max);
                  const exceeds = day?.airQuality?.exceeds_pm10_daily_limit ?? false;
                  return (
                    <span
                      key={date}
                      onMouseEnter={() => setHovered({ town: s.location.town, date, day })}
                      className="flex h-7 items-center justify-center rounded-[3px] text-[10px] leading-none"
                      style={{
                        background: dust === null ? "var(--land)" : rampColor("orange", t),
                        color: t > 0.55 ? "var(--on-seq-high)" : "var(--ink)",
                      }}
                      aria-label={`${s.location.town}, ${formatDay(date)}: dust peak ${
                        dust === null ? "no data" : `${dust.toFixed(0)} µg/m³`
                      }${exceeds ? ", PM10 above EU limit" : ""}`}
                    >
                      {exceeds ? "▲" : ""}
                    </span>
                  );
                })}
                <span className="pl-2 text-sm tabular-nums">{exceedances}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          0
          <span
            aria-hidden
            className="h-2 w-32 rounded-full"
            style={{ background: `linear-gradient(to right, ${rampColor("orange", 0)}, ${rampColor("orange", 1)})` }}
          />
          {max}+ µg/m³ dust hourly peak
        </span>
        <span>▲ PM10 daily mean above the EU limit (50 µg/m³)</span>
      </div>
      <p className="text-sm text-ink-secondary" aria-live="polite">
        {readout}
      </p>
    </div>
  );
}
