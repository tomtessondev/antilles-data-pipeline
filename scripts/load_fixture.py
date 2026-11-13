"""Load the test fixture into DuckDB so dbt can run without network access (used in CI)."""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from antilles_pipeline.config import DEFAULT_LOCATIONS, HOURLY_VARIABLES
from antilles_pipeline.extract import parse_hourly
from antilles_pipeline.load import connect, load_locations, load_weather

FIXTURE = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "open_meteo_sample.json"


def main(db_path: str) -> None:
    payload = json.loads(FIXTURE.read_text())
    extracted_at = datetime.now(UTC).isoformat(timespec="seconds")
    records = [
        record
        for location in DEFAULT_LOCATIONS
        for record in parse_hourly(payload, location, HOURLY_VARIABLES, extracted_at)
    ]
    con = connect(Path(db_path))
    try:
        load_locations(con, DEFAULT_LOCATIONS)
        rows = load_weather(con, records)
    finally:
        con.close()
    print(f"Loaded {rows} fixture rows into {db_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/antilles.duckdb")
