import type { DailyAirQuality } from "@/lib/schema";

/** EU PM10 daily-limit status: icon and label, never colour alone. */
export function Pm10Status({ airQuality }: { airQuality: DailyAirQuality }) {
  if (airQuality.exceeds_pm10_daily_limit) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-critical">
        <span aria-hidden>▲</span> Above EU limit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-good">
      <span aria-hidden>●</span> Within EU limit
    </span>
  );
}
