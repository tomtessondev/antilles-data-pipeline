"""Export the dbt marts to a single JSON document for the dashboard."""

from __future__ import annotations

import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import duckdb

# dbt-duckdb prefixes custom schemas with the target schema ("main").
MARTS_SCHEMA = "main_marts"

TABLES: dict[str, str] = {
    "locations": "select * from {schema}.dim_location order by location_code",
    "weather": "select * from {schema}.fct_daily_weather order by location_code, observed_date",
    "air_quality": (
        "select * from {schema}.fct_daily_air_quality order by location_code, observed_date"
    ),
}


def _to_json_value(value: Any) -> Any:
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


def _rows(con: duckdb.DuckDBPyConnection, sql: str) -> list[dict[str, Any]]:
    cursor = con.execute(sql)
    columns = [column[0] for column in cursor.description]
    return [
        {column: _to_json_value(value) for column, value in zip(columns, row, strict=True)}
        for row in cursor.fetchall()
    ]


def export_marts(
    con: duckdb.DuckDBPyConnection, schema: str = MARTS_SCHEMA, now: datetime | None = None
) -> dict[str, Any]:
    """Read every mart into a JSON-serialisable document."""
    generated_at = (now or datetime.now(UTC)).isoformat(timespec="seconds")
    document: dict[str, Any] = {"generated_at": generated_at}
    for key, sql in TABLES.items():
        document[key] = _rows(con, sql.format(schema=schema))
    return document


def write_export(db_path: Path, out_path: Path, schema: str = MARTS_SCHEMA) -> dict[str, Any]:
    con = duckdb.connect(str(db_path), read_only=True)
    try:
        document = export_marts(con, schema)
    finally:
        con.close()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(document, ensure_ascii=False, indent=1), encoding="utf-8")
    return document
