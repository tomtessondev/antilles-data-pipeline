"""Load the test fixtures into DuckDB so dbt can run without network access (used in CI)."""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from antilles_pipeline.config import AIR_QUALITY_VARIABLES, DEFAULT_LOCATIONS, HOURLY_VARIABLES
from antilles_pipeline.extract import parse_air_quality, parse_hourly
from antilles_pipeline.load import connect, load_air_quality, load_locations, load_weather

FIXTURES = Path(__file__).resolve().parent.parent / "tests" / "fixtures"


def _read(name: str) -> dict[str, Any]:
    payload: dict[str, Any] = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return payload


def main(db_path: str) -> None:
    weather = _read("open_meteo_sample.json")
    air = _read("open_meteo_air_quality_sample.json")
    extracted_at = datetime.now(UTC).isoformat(timespec="seconds")
    weather_records = [
        record
        for location in DEFAULT_LOCATIONS
        for record in parse_hourly(
            weather, location, HOURLY_VARIABLES, extracted_at, not_after=datetime.max
        )
    ]
    air_records = [
        record
        for location in DEFAULT_LOCATIONS
        for record in parse_air_quality(
            air, location, AIR_QUALITY_VARIABLES, extracted_at, not_after=datetime.max
        )
    ]
    con = connect(Path(db_path))
    try:
        load_locations(con, DEFAULT_LOCATIONS)
        n_weather = load_weather(con, weather_records)
        n_air = load_air_quality(con, air_records)
    finally:
        con.close()
    print(f"Loaded {n_weather} weather and {n_air} air-quality fixture rows into {db_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/antilles.duckdb")
