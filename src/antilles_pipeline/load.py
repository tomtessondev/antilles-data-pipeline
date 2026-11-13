"""Load extracted records into the DuckDB `raw` schema. Loads are idempotent."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from dataclasses import astuple
from pathlib import Path

import duckdb

from antilles_pipeline.config import Location
from antilles_pipeline.extract import AirQualityRecord, WeatherRecord

logger = logging.getLogger(__name__)

DDL = """
create schema if not exists raw;

create table if not exists raw.locations (
    location_code varchar primary key,
    name          varchar not null,
    territory     varchar not null,
    latitude      double  not null,
    longitude     double  not null
);

create table if not exists raw.weather_hourly (
    location_code        varchar   not null,
    observed_at          timestamp not null,
    temperature_2m       double,
    relative_humidity_2m double,
    precipitation        double,
    wind_speed_10m       double,
    extracted_at         timestamp not null,
    primary key (location_code, observed_at)
);

create table if not exists raw.air_quality_hourly (
    location_code    varchar   not null,
    observed_at      timestamp not null,
    pm10             double,
    pm2_5            double,
    dust             double,
    ozone            double,
    nitrogen_dioxide double,
    european_aqi     integer,
    extracted_at     timestamp not null,
    primary key (location_code, observed_at)
);
"""


def connect(db_path: Path) -> duckdb.DuckDBPyConnection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(db_path))
    con.execute(DDL)
    return con


def load_locations(con: duckdb.DuckDBPyConnection, locations: Sequence[Location]) -> None:
    con.executemany(
        "insert or replace into raw.locations values (?, ?, ?, ?, ?)",
        [astuple(loc) for loc in locations],
    )


def _upsert(
    con: duckdb.DuckDBPyConnection,
    table: str,
    records: Sequence[WeatherRecord] | Sequence[AirQualityRecord],
) -> int:
    """Upsert records on the table's primary key: re-running never creates duplicates."""
    if not records:
        logger.warning("No records to load into %s", table)
        return 0
    rows = [astuple(r) for r in records]
    placeholders = ", ".join("?" * len(rows[0]))
    con.executemany(f"insert or replace into {table} values ({placeholders})", rows)
    logger.info("Loaded %d rows into %s", len(rows), table)
    return len(rows)


def load_weather(con: duckdb.DuckDBPyConnection, records: Sequence[WeatherRecord]) -> int:
    return _upsert(con, "raw.weather_hourly", records)


def load_air_quality(con: duckdb.DuckDBPyConnection, records: Sequence[AirQualityRecord]) -> int:
    return _upsert(con, "raw.air_quality_hourly", records)
