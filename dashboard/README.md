# Dashboard

Next.js (App Router, Cache Components) view of the dbt marts: one card per town on the
home page, then temperature, rainfall, PM10 and Saharan dust charts per town.

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

Import the repository, set **Root Directory** to `dashboard` and add the `MARTS_URL`
environment variable above. No other configuration is needed.
