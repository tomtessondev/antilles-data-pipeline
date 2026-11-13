from __future__ import annotations

from datetime import datetime
from typing import Any

from antilles_pipeline.config import DEFAULT_LOCATIONS, HOURLY_VARIABLES, Settings
from antilles_pipeline.extract import parse_hourly
from antilles_pipeline.load import connect, load_locations, load_weather


def test_load_is_idempotent(settings: Settings, sample_payload: dict[str, Any]) -> None:
    rows = parse_hourly(
        sample_payload,
        DEFAULT_LOCATIONS[0],
        HOURLY_VARIABLES,
        "2026-11-12T03:00",
        not_after=datetime.max,
    )
    con = connect(settings.db_path)
    load_locations(con, settings.locations)

    load_weather(con, rows)
    load_weather(con, rows)  # second run must not duplicate

    count = con.execute("select count(*) from raw.weather_hourly").fetchone()
    assert count == (3,)
    locations = con.execute("select count(*) from raw.locations").fetchone()
    assert locations == (2,)
    con.close()


def test_load_empty_is_noop(settings: Settings) -> None:
    con = connect(settings.db_path)
    assert load_weather(con, []) == 0
    con.close()
