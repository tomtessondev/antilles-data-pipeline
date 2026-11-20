# Dashboard

Next.js (App Router, Cache Components) site: the French portfolio of the five projects, and
the weather demo built on this repository's dbt marts.

- **Portfolio (`/`)**: overview diagram of the five projects, skills grid, project cards; the
  projects' metadata lives in `src/lib/portfolio.ts`.
- **Project pages (`/projets/<slug>`)**: one template (`src/components/project/`) with an
  architecture diagram, a table of contents and an "En bref" box; `/projets/glossaire`.
- **Demo (`/demo`)**: pick a measure (temperature, rain, PM10, Saharan dust) and a period (7, 14 or
  30 days). Headline figures for the period, a map of both islands with each town's commune
  shaded by the period value, a ranking with the change versus the previous period and a
  sparkline, every town on one chart, and a calendar of dust peaks with the days above the
  EU PM10 limit marked. Hovering a town in any view highlights it in all of them.
- **Town page (`/demo/<code>`)**: the same period control, period figures with their trend, temperature,
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

## Live maps

The AIS and sensor project pages each draw a live map polled from the browser. Their
endpoints are base URLs, without a path or trailing slash:

| Variable | Service | Production |
| --- | --- | --- |
| `NEXT_PUBLIC_AIS_LIVE_URL` | caribbean-ais-stream's site endpoint (`/v1/ships`, every 5 s) | `https://ais.horizon-studio.dev` |
| `NEXT_PUBLIC_SENSORS_LIVE_URL` | caribbean-sensor-pipeline's stations endpoint (`/v1/stations`, every minute) | `https://capteurs.horizon-studio.dev` |

Next.js inlines `NEXT_PUBLIC_` variables at build time: set them before `npm run build`
(on Vercel, a new deployment picks up a change). Unset, the map says the demo is coming
soon; set but unreachable, it shows an offline banner and keeps retrying. Each service
only accepts the site's origins (CORS), `http://localhost:3000` included for development:

```bash
NEXT_PUBLIC_AIS_LIVE_URL=http://localhost:8089 NEXT_PUBLIC_SENSORS_LIVE_URL=http://localhost:8010 npm run dev
```

Polling pauses while the tab is hidden; a marker's details show on hover and on click or
tap.

## Deploy (Vercel)

Live at https://antilles-data-pipeline.vercel.app/demo (the portfolio is the home page; production follows `main`, every pull
request touching the dashboard gets a preview URL).

Import the repository, set **Root Directory** to `dashboard` and add the `MARTS_URL`,
`NEXT_PUBLIC_AIS_LIVE_URL` and `NEXT_PUBLIC_SENSORS_LIVE_URL` environment variables above.
No other configuration is needed.
