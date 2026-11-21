# Lakehouse and warehouse explorers — design

## Intent

Phase 3 of the live demos (`2026-11-20-live-demos-design.md`): the two cloud projects get
an interactive explorer on their portfolio page, on their real data, without exposing any
secret and at no cost. The owner gave carte blanche on the design (2026-11-21).

## Approach (chosen)

Each project's scheduled run exports one small JSON of its gold tables / marts and
publishes it to a `data` branch of its public repository, exactly like the batch project's
`marts.json`. The site fetches it server side (`"use cache"`, hours), validates it with
zod, falls back to a bundled sample, and renders client explorers (MapLibre + Recharts).

Rejected: querying BigQuery / Databricks from the site (secrets, cost, cold starts);
static PNGs only (not interactive).

## Warehouse (antilles-hurricane-warehouse)

- `hurricane-load export --out <file>`: `google-cloud-bigquery`, every query capped
  (`maximum_bytes_billed` 100 MB), tests with a mocked client.
- Runs as a step after `dbt build` in `daily.yml`; the job gets `contents: write` and
  force-pushes a one-commit `data` branch (pattern of antilles-data-pipeline's
  `pipeline.yml`). Published at
  `https://raw.githubusercontent.com/tomtessondev/antilles-hurricane-warehouse/data/hurricanes.json`.
- Contract (`hurricanes.json`, target < 1 MB):
  `{generated_at, islands: [{island, lat, lon}],
   passages: [{passage_id, sid, name, season, island, closest_km, closest_time,
               max_wind_kt, category}],
   passage_weather: [{passage_id, date, day_offset, precipitation_mm, wind_max_kmh,
                      gust_max_kmh}],
   by_decade: [{island, decade, category, passages}],
   tracks: [{sid, name, season, points: [[lon, lat, wind_kt | null]]}]}`
  — tracks only for storms in `fct_storm_passages`, coordinates rounded to 0.1°,
  clipped to lon −100..−20, lat 0..45; no time per fix (the map does not use it, and it
  weighed on the page, which carries the data to the client).

## Lakehouse (antilles-climate-lakehouse)

- New job step `export` (after `gold`) writes `climate.json` to a Unity Catalog volume
  (`--local` writes under `data/`); unit-tested on local Spark.
- `publish.yml` (monthly cron + manual) downloads it with the Databricks CLI and pushes
  the `data` branch. It needs `DATABRICKS_HOST` (variable) and `DATABRICKS_TOKEN`
  (secret), which only the owner can create: until then the workflow skips with a clear
  message, and the first export is published by hand from the owner's machine (bundle
  deploy + run approved under the carte blanche). Published at
  `https://raw.githubusercontent.com/tomtessondev/antilles-climate-lakehouse/data/climate.json`.
- Contract (`climate.json`, target < 600 KB):
  `{generated_at, normal_period: "1991-2020",
   stations: [{station_id, name, territory, lat, lon, altitude_m, first_year, last_year}],
   territory_anomalies: [{territory, year, month, tx_anomaly, rr_anomaly, tx_stations,
                         rr_stations}],
   station_year_anomalies: [{station_id, year, tx_anomaly, months}],
   extremes: [{territory, year, indicator, panel_size, mean_per_station}],
   records: [{station_id, territory, indicator, value, date}]}`
  (anomalies rounded to 0.01; station-year only with ≥ 10 complete months; `tx_stations` and
  `rr_stations` count the stations behind each mean, which differ when a station measures
  rain but not temperature).

## Site (antilles-data-pipeline/dashboard)

- `src/lib/hurricanes.ts`, `src/lib/climate.ts`: zod contracts above, server loaders with
  `HURRICANES_URL` / `CLIMATE_URL` overrides and the public URLs as defaults, bundled
  samples for CI and offline builds, `generated_at` shown on the page. An export with no
  tracks, passages, stations or territory anomalies counts as broken: the sample is shown;
  so does one over 2 MB (checked on `content-length`, then on the body, before parsing).
- Hurricane explorer (section "Résultats"): MapLibre map of tracks (GeoJSON line layer,
  segments coloured by wind / category), filters season range, island, minimum
  category; selecting a storm shows its passages and the J−1..J+1 rain/wind of
  `passage_weather`; decade chart counted from `passages` (season, island, category), so it
  follows the season range to the year. `by_decade` stays in the contract for other readers
  but is no longer needed by the site, which leaves it out of the page.
- Climate explorer: heat map year × month of the territory Tx anomaly (territory
  selector, rain toggle; cells selected by tap, click or arrow keys in a roving-tabindex
  grid, the value read in an aria-live line, a screen-reader table of the yearly means);
  MapLibre map of stations coloured by the selected year's anomaly (year slider) with
  records in the popup; extremes chart with panel size (panels under 3 stations drawn
  dashed, with a note to read them with care).
- Client components only for the explorers; no polling; offline/fallback text if the
  file cannot be read. French UI, site tokens, light and dark.
- Hard-coded figures in the page text that the data contradicts get updated.

## Left to the builder

