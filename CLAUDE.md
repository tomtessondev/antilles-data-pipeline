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
  - `load.py`: idempotent upserts into DuckDB schema `raw`
  - `cli.py`: typer CLI `antilles-pipeline run`
- dbt-duckdb project in `transform/` (staging views, marts tables, data tests)
- pytest + respx (HTTP is always mocked), ruff, mypy --strict
- GitHub Actions: `ci.yml` (lint, types, tests, dbt on fixture data) and
  `pipeline.yml` (daily cron, real API, uploads the DuckDB file)
- Docker image whose entrypoint is the CLI

## Commands

```bash
python -m venv .venv && source .venv/bin/activate
make install      # pip install -e ".[dev,transform]"
make check        # ruff + mypy + pytest
make run          # real extraction (needs internet)
make fixture      # load test data instead, no network
make transform    # dbt build (models + tests)
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
