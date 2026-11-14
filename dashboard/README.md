# Dashboard

Next.js (App Router, Cache Components) view of the dbt marts.

- **Home**: pick a measure (temperature, rain, PM10, Saharan dust) and a period (7, 14 or
  30 days). Headline figures for the period, a map of both islands with each town's commune
  shaded by the period value, a ranking with the change versus the previous period and a
  sparkline, every town on one chart, and a calendar of dust peaks with the days above the
  EU PM10 limit marked. Hovering a town in any view highlights it in all of them.
- **Town page**: the same period control, period figures with their trend, temperature,
  rainfall and PM10/dust charts, the dust calendar and a table of daily values.

The map is projected on the server (d3-geo): the browser only receives SVG paths.
`data/communes.json` comes from the IGN commune outlines, see `scripts/prepare_communes.py`.

```bash
npm ci
npm run dev        # http://localhost:3000, bundled sample data
npm run lint && npm run typecheck && npm test && npm run build
```

## Data

`src/lib/marts.ts` reads the document written by `antilles-pipeline export`:

- `MARTS_URL` set: fetched from that URL and cached for an hour. In production this is
  `https://raw.githubusercontent.com/tomtessondev/antilles-data-pipeline/data/marts.json`,
  refreshed by the daily pipeline.
- `MARTS_URL` unset: `data/sample.json`, a real export committed for development and CI.

`src/lib/schema.ts` (zod) is the contract with the Python export. CI parses a fresh export
of the fixture build with it, so both sides have to change together.

Charts show complete days only: the pipeline runs at 06:00 local time, so the current
day is always partial.

## Deploy (Vercel)

Live at https://antilles-data-pipeline.vercel.app/ (production follows `main`, every pull
request touching the dashboard gets a preview URL).

Import the repository, set **Root Directory** to `dashboard` and add the `MARTS_URL`
environment variable above. No other configuration is needed.
