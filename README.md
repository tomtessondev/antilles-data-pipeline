# Antilles Data Pipeline

[![CI](https://github.com/tomtessondev/antilles-data-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/tomtessondev/antilles-data-pipeline/actions/workflows/ci.yml)
[![dbt docs](https://img.shields.io/badge/dbt-docs-FF694B?logo=dbt&logoColor=white)](https://tomtessondev.github.io/antilles-data-pipeline/)

A production-style data pipeline built on open data from **Guadeloupe and Martinique**.
It extracts hourly weather and air quality (including Saharan dust) from the
[Open-Meteo](https://open-meteo.com/) APIs, loads them into **DuckDB**, transforms it with **dbt**, and runs on a schedule with **GitHub Actions**.

The goal is to show, end to end, how I structure a data project meant to run in production:
typed and tested Python, idempotent loads, retries, data-quality tests, CI/CD and containers.

## Architecture

```
Open-Meteo weather ─────┐
                        ├─► extract (httpx + retries) ──► DuckDB raw.* ──► dbt staging ──► dbt marts
Open-Meteo air quality ─┘        Python package                              (tests)          │
                                                                                              ▼
                                                                           dashboard (Next.js, planned)
```

| Layer | Tooling | Where |
| --- | --- | --- |
| Extract | Python 3.11+, httpx, tenacity (exponential retries) | `src/antilles_pipeline/extract.py` |
| Load | DuckDB, idempotent upserts on `(location, hour)` | `src/antilles_pipeline/load.py` |
| Transform | dbt-duckdb: staging views, incremental daily facts, location dimension, tests, source freshness | `transform/` |
| Orchestration | GitHub Actions cron (daily) | `.github/workflows/pipeline.yml` |
| Quality | pytest + respx (HTTP mocked), ruff, mypy `--strict` | `tests/`, `.github/workflows/ci.yml` |
| Documentation | dbt docs (lineage, column descriptions, tests) on GitHub Pages | `.github/workflows/docs.yml` |
| Packaging | pyproject, CLI entry point, Docker image | `pyproject.toml`, `Dockerfile` |

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev,transform]"

antilles-pipeline run --past-days 7      # extract + load into data/antilles.duckdb
make transform                            # dbt build (models + tests)
make check                                # lint, type-check, tests
make docs                                 # dbt docs as a single static HTML page
```

With Docker:

```bash
docker build -t antilles-pipeline .
docker run --rm -v "$PWD/data:/app/data" antilles-pipeline run --past-days 7
```

## Data model

Browse the models, lineage graph and column descriptions in the
[dbt docs](https://tomtessondev.github.io/antilles-data-pipeline/), rebuilt from fixture data
on every merge to `main`.

- `raw.locations`: the six towns tracked (3 in Guadeloupe, 3 in Martinique).
- `raw.weather_hourly`, `raw.air_quality_hourly`: one row per location and hour, primary key
  `(location_code, observed_at)`.
- `stg_locations`, `stg_weather_hourly`, `stg_air_quality_hourly`: typed and renamed.
- `dim_location`: one row per town with territory and coordinates.
- `fct_daily_weather`: daily min/max/avg temperature, total rainfall, max wind, per town.
- `fct_daily_air_quality`: daily PM10 and PM2.5, peak Saharan dust, ozone, European AQI, and
  a flag when the daily PM10 mean exceeds the EU limit (50 µg/m³).
- Both facts are **incremental**: each run rebuilds only the (town, day) pairs that received
  new hourly rows, from all of that day's hours. CI loads the data twice to exercise this path.
- **Source freshness** on `extracted_at` for both raw tables: warns after 26 h, fails after
  50 h (`make freshness`).

Air quality comes from the CAMS global model (coarse grid, interpolated by Open-Meteo), not
from ground stations: it shows regional episodes such as Saharan dust well, but differences
between two neighbouring towns are smoothing, not local measurements.

## Design choices

- **Idempotent loads**: re-running a day never duplicates rows (`insert or replace` on the key).
- **Past hours only**: the forecast endpoint also returns the rest of today as predictions;
  hours after the extraction time are dropped. `observed_at` is local Antilles time (UTC−4),
  `extracted_at` is UTC.
- **Retries with backoff** on network errors and 5xx answers; a malformed payload fails loudly.
- **Config by environment variables** (`ANTILLES_DB_PATH`, `ANTILLES_WEATHER_API`,
  `ANTILLES_AIR_QUALITY_API`), no secrets in code.
- **Tests never hit the network**: the APIs are mocked with respx and JSON fixtures.
- **Why not fuel prices?** The national fuel price feed has no station in Guadeloupe or
  Martinique: prices there are capped monthly by prefectoral order, published only as PDF.

## Roadmap

Full plan in [docs/ROADMAP.md](docs/ROADMAP.md).

- [x] Python package: extract, load, CLI, tests, CI
- [x] dbt staging and daily mart with data-quality tests
- [x] Incremental facts, location dimension, source freshness
- [x] Second source: air quality and Saharan dust (Open-Meteo, CAMS)
- [x] dbt docs published on GitHub Pages
- [ ] Orchestration with Airflow or Kestra in Docker Compose
- [ ] Next.js dashboard reading the marts
- [ ] Cloud deployment (BigQuery or MotherDuck) with Terraform

## Author

Tom Tesson, data engineer and FPGA engineer, based in Guadeloupe (UTC−4), available for remote missions.
