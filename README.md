# Antilles Data Pipeline

[![CI](https://github.com/tomtessondev/antilles-data-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/tomtessondev/antilles-data-pipeline/actions/workflows/ci.yml)

A production-style data pipeline built on open data from **Guadeloupe and Martinique**.
It extracts hourly weather from the [Open-Meteo](https://open-meteo.com/) API, loads it
into **DuckDB**, transforms it with **dbt**, and runs on a schedule with **GitHub Actions**.

The goal is to show, end to end, how I structure a data project meant to run in production:
typed and tested Python, idempotent loads, retries, data-quality tests, CI/CD and containers.

## Architecture

```
Open-Meteo API ──► extract (httpx + retries) ──► DuckDB raw.*  ──► dbt staging ──► dbt marts
                         Python package                              (tests)          │
                                                                                      ▼
                                                                   dashboard (Next.js, planned)
```

| Layer | Tooling | Where |
| --- | --- | --- |
| Extract | Python 3.11+, httpx, tenacity (exponential retries) | `src/antilles_pipeline/extract.py` |
| Load | DuckDB, idempotent upserts on `(location, hour)` | `src/antilles_pipeline/load.py` |
| Transform | dbt-duckdb: staging views, daily mart, schema tests | `transform/` |
| Orchestration | GitHub Actions cron (daily) | `.github/workflows/pipeline.yml` |
| Quality | pytest + respx (HTTP mocked), ruff, mypy `--strict` | `tests/`, `.github/workflows/ci.yml` |
| Packaging | pyproject, CLI entry point, Docker image | `pyproject.toml`, `Dockerfile` |

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev,transform]"

antilles-pipeline run --past-days 7      # extract + load into data/antilles.duckdb
make transform                            # dbt build (models + tests)
make check                                # lint, type-check, tests
```

With Docker:

```bash
docker build -t antilles-pipeline .
docker run --rm -v "$PWD/data:/app/data" antilles-pipeline run --past-days 7
```

## Data model

- `raw.locations`: the six towns tracked (3 in Guadeloupe, 3 in Martinique).
- `raw.weather_hourly`: one row per location and hour, primary key `(location_code, observed_at)`.
- `stg_weather_hourly`: typed, renamed, with the territory joined in.
- `fct_daily_weather`: daily min/max/avg temperature, total rainfall, max wind, per town.

## Design choices

- **Idempotent loads**: re-running a day never duplicates rows (`insert or replace` on the key).
- **Past hours only**: the forecast endpoint also returns the rest of today as predictions;
  hours after the extraction time are dropped. `observed_at` is local Antilles time (UTC−4),
  `extracted_at` is UTC.
- **Retries with backoff** on network errors and 5xx answers; a malformed payload fails loudly.
- **Config by environment variables** (`ANTILLES_DB_PATH`, `ANTILLES_WEATHER_API`), no secrets in code.
- **Tests never hit the network**: the API is mocked with respx and a JSON fixture.

## Roadmap

Full plan in [docs/ROADMAP.md](docs/ROADMAP.md).

- [x] Python package: extract, load, CLI, tests, CI
- [x] dbt staging and daily mart with data-quality tests
- [ ] Second source: fuel prices or water data from data.gouv.fr
- [ ] Orchestration with Airflow or Kestra in Docker Compose
- [ ] Next.js dashboard reading the marts
- [ ] Cloud deployment (BigQuery or MotherDuck) with Terraform

## Author

Tom Tesson, data engineer and FPGA engineer, based in Guadeloupe (UTC−4), available for remote missions.
