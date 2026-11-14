from __future__ import annotations

from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path

import boto3
import duckdb
import pytest
from moto.server import ThreadedMotoServer

from antilles_pipeline.config import Settings
from antilles_pipeline.extract import WeatherRecord
from antilles_pipeline.lake import attach_lake, load_from_lake, write_to_lake
from antilles_pipeline.load import connect


def weather(temperature: float, extracted_at: str, hour: str = "2026-11-01T10:00") -> WeatherRecord:
    return WeatherRecord(
        location_code="PAP",
        observed_at=hour,
        temperature_2m=temperature,
        relative_humidity_2m=80.0,
        precipitation=0.0,
        wind_speed_10m=12.0,
        extracted_at=extracted_at,
    )


def raw_weather(con: duckdb.DuckDBPyConnection) -> list[tuple[str, float]]:
    rows = con.execute(
        "select strftime(observed_at, '%H:%M'), temperature_2m from raw.weather_hourly order by 1"
    ).fetchall()
    return [(hour, temperature) for hour, temperature in rows]


def test_local_lake_keeps_every_extraction_and_loads_the_latest(settings: Settings) -> None:
    con = connect(settings.db_path)
    # Two daily runs re-send 10:00; the second also brings 11:00.
    write_to_lake(con, settings, "weather_hourly", [weather(27.0, "2026-11-02T10:00:00")])
    write_to_lake(
        con,
        settings,
        "weather_hourly",
        [
            weather(27.5, "2026-11-03T10:00:00"),
            weather(28.0, "2026-11-03T10:00:00", hour="2026-11-01T11:00"),
        ],
    )

    partitions = sorted(p.parent.name for p in Path(settings.lake_url).rglob("*.parquet"))
    assert partitions == ["extracted_date=2026-11-02", "extracted_date=2026-11-03"]

    assert load_from_lake(con, settings, "weather_hourly") == 2
    assert raw_weather(con) == [("10:00", 27.5), ("11:00", 28.0)]
    # Rebuilding twice changes nothing: the load is idempotent.
    load_from_lake(con, settings, "weather_hourly")
    assert raw_weather(con) == [("10:00", 27.5), ("11:00", 28.0)]
    con.close()


def test_raw_tables_can_be_rebuilt_from_the_lake_alone(settings: Settings) -> None:
    con = connect(settings.db_path)
    write_to_lake(con, settings, "weather_hourly", [weather(27.0, "2026-11-02T10:00:00")])
    con.close()

    fresh = replace(settings, db_path=settings.db_path.with_name("fresh.duckdb"))
    con = connect(fresh.db_path)
    assert load_from_lake(con, fresh, "weather_hourly") == 1
    con.close()


@pytest.fixture
def s3_lake(settings: Settings, monkeypatch: pytest.MonkeyPatch) -> Iterator[Settings]:
    """An S3 bucket served by moto over HTTP, so DuckDB speaks the real S3 protocol."""
    server = ThreadedMotoServer(port=0, verbose=False)
    server.start()
    host, port = server.get_host_and_port()
    endpoint = f"http://{host}:{port}"
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    boto3.client("s3", endpoint_url=endpoint, region_name="us-east-1").create_bucket(
        Bucket="antilles-lake"
    )
    yield replace(settings, lake_url="s3://antilles-lake/v1", s3_endpoint=endpoint)
    server.stop()


def test_s3_lake_round_trip(s3_lake: Settings) -> None:
    con = connect(s3_lake.db_path)
    attach_lake(con, s3_lake)

    write_to_lake(con, s3_lake, "weather_hourly", [weather(27.0, "2026-11-02T10:00:00")])
    write_to_lake(con, s3_lake, "weather_hourly", [weather(27.5, "2026-11-03T10:00:00")])

    keys = [
        obj["Key"]
        for obj in boto3.client(
            "s3", endpoint_url=s3_lake.s3_endpoint, region_name="us-east-1"
        ).list_objects_v2(Bucket="antilles-lake")["Contents"]
    ]
    assert len(keys) == 2
    assert all(k.startswith("v1/weather_hourly/extracted_date=2026-11-0") for k in keys)
    assert load_from_lake(con, s3_lake, "weather_hourly") == 1
    assert raw_weather(con) == [("10:00", 27.5)]
    con.close()


def test_attach_lake_is_a_no_op_for_a_local_lake(settings: Settings) -> None:
    con = duckdb.connect()
    attach_lake(con, settings)
    assert con.execute("select count(*) from duckdb_secrets()").fetchone() == (0,)
