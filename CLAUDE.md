# CLAUDE.md

Context for Claude Code working in this repository.

## Purpose

Portfolio project showing production-grade data engineering on open data from the
French Antilles (Guadeloupe, Martinique). The owner is an FPGA / embedded engineer
moving toward freelance data engineering, so code quality, tests and clear docs matter
more than feature count. Every change should be something a recruiter can read.

## Stack

- Python 3.11+ package in `src/antilles_pipeline` (src layout, hatchling)
  - `config.py`: towns and settings (env: `ANTILLES_DB_PATH`, `ANTILLES_WEATHER_API`,
    `ANTILLES_AIR_QUALITY_API`)
  - `extract.py`: Open-Meteo hourly weather and air quality, httpx + tenacity retries
  - `lake.py`: append-only Parquet landing zone (`ANTILLES_LAKE_URL`, local dir or s3://),
    Hive-partitioned by `extracted_date`; raw tables are rebuilt from it, latest wins
  - `load.py`: DuckDB schema `raw` (DDL, locations, direct upserts used by the fixture loader)
  - `export.py`: marts to one JSON document for the dashboard
  - `cli.py`: typer CLI `antilles-pipeline run` and `antilles-pipeline export`
  - `orchestration/`: Dagster assets (raw tables keyed like the dbt sources, dbt models via
    dagster-dbt, `marts_json`), job `daily_pipeline` and its 06:00 schedule. No
    `from __future__ import annotations` in asset modules: Dagster reads annotations at runtime.
    The dbt assets need `transform/target/manifest.json` (`dbt parse`) before import.
- dbt-duckdb project in `transform/` (staging views, marts tables, data tests)
- pytest + respx (HTTP is always mocked), ruff, mypy --strict
- GitHub Actions: `ci.yml` (lint, types, tests incl. the full Dagster job, dbt on fixture
  data, dashboard, Docker builds), `pipeline.yml` (daily cron running the Dagster job on the
  real API, publishes `marts.json` to the `data` branch) and `docs.yml` (dbt docs on
  fixture data, deployed to GitHub Pages from `main`)
- Multi-stage Dockerfile: default target is the CLI, `dagster` target is used by
  `docker-compose.yml` (webserver on host port 3070 + daemon + SeaweedFS as local S3 on 8333;
  MinIO images are no longer published)
- S3 tests use a moto server over HTTP (`tests/test_lake.py`), never real AWS
- Next.js dashboard in `dashboard/` (App Router, Cache Components, Tailwind, Recharts).
  Reads `MARTS_URL` (the `data` branch `marts.json` in production) or the bundled
  `dashboard/data/sample.json`. `dashboard/src/lib/schema.ts` is the export contract:
  change it together with `export.py`. Read `dashboard/AGENTS.md` before editing.

## Commands

```bash
python -m venv .venv && source .venv/bin/activate
make install      # pip install -e ".[dev,orchestration]"
make check        # ruff + mypy + pytest
make run          # real extraction (needs internet)
make fixture      # load test data instead, no network
make transform    # dbt build (models + tests)
make docs         # dbt docs as a single static HTML page
make dagster      # dagster dev (UI, hot reload)
make up / down    # Docker Compose: Dagster webserver + daemon
cd dashboard && npm run lint && npm run typecheck && npm test && npm run build
```

## Rules

- Run `make check` and `make transform` before every commit; both must pass.
- Never call the real API in tests; mock with respx and use `tests/fixtures/`.
- Loads must stay idempotent (primary keys + `insert or replace`).
- Every new dbt model gets a `.yml` with a description and at least one test.
- Keep mypy strict; no `type: ignore` without a comment explaining why.
- Code, comments, commits and README in English.
- Small commits with clear messages; open a PR per feature so CI runs.

## Roadmap

See `docs/ROADMAP.md`. Work through it in order unless told otherwise.
