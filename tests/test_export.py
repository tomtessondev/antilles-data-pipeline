from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import duckdb
import pytest
from typer.testing import CliRunner

from antilles_pipeline.cli import app
from antilles_pipeline.export import export_marts

MARTS_DDL = """
create schema main_marts;
create table main_marts.dim_location (
    location_code varchar, town varchar, territory varchar, latitude double, longitude double
);
insert into main_marts.dim_location values ('PAP', 'Pointe-à-Pitre', 'Guadeloupe', 16.24, -61.53);
create table main_marts.fct_daily_weather (
    location_code varchar, observed_date date, temp_min_c double, temp_max_c double,
    rain_total_mm double, hours_observed bigint, last_extracted_at timestamp
);
insert into main_marts.fct_daily_weather values
    ('PAP', '2026-11-02', 24.1, 30.2, 3.4, 24, '2026-11-03 10:00'),
    ('PAP', '2026-11-01', 23.9, 29.8, 0.0, 24, '2026-11-03 10:00');
create table main_marts.fct_daily_air_quality (
    location_code varchar, observed_date date, pm10_avg_ugm3 double,
    exceeds_pm10_daily_limit boolean, hours_observed bigint
);
insert into main_marts.fct_daily_air_quality values ('PAP', '2026-11-01', 61.2, true, 24);
"""


@pytest.fixture
def marts_db(tmp_path: Path) -> Path:
    db = tmp_path / "marts.duckdb"
    con = duckdb.connect(str(db))
    con.execute(MARTS_DDL)
    con.close()
    return db


def test_export_marts_serialises_dates_and_orders_rows(marts_db: Path) -> None:
    con = duckdb.connect(str(marts_db), read_only=True)
    document = export_marts(con, now=datetime(2026, 11, 3, 10, 5, tzinfo=UTC))
    con.close()

    assert document["generated_at"] == "2026-11-03T10:05:00+00:00"
    assert document["locations"][0]["town"] == "Pointe-à-Pitre"
    assert [row["observed_date"] for row in document["weather"]] == ["2026-11-01", "2026-11-02"]
    assert document["weather"][0]["last_extracted_at"] == "2026-11-03T10:00:00"
    assert document["air_quality"][0]["exceeds_pm10_daily_limit"] is True
    json.dumps(document)


def test_cli_export_writes_json(marts_db: Path, tmp_path: Path) -> None:
    out = tmp_path / "nested" / "marts.json"

    result = CliRunner().invoke(app, ["export", "--db-path", str(marts_db), "--out", str(out)])

    assert result.exit_code == 0, result.output
    assert "2 weather and 1 air-quality days" in result.output
    document = json.loads(out.read_text(encoding="utf-8"))
    assert set(document) == {"generated_at", "locations", "weather", "air_quality"}
