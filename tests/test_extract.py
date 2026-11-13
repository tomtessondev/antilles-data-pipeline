from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx
import pytest
import respx

from antilles_pipeline.config import (
    AIR_QUALITY_VARIABLES,
    DEFAULT_LOCATIONS,
    HOURLY_VARIABLES,
    Settings,
)
from antilles_pipeline.extract import (
    ExtractError,
    extract_air_quality,
    extract_weather,
    parse_air_quality,
    parse_hourly,
)
from tests.conftest import AIR_QUALITY_URL, API_URL

LATE = datetime(2026, 11, 12, 23, 0)


def test_parse_hourly_flattens_columns(sample_payload: dict[str, Any]) -> None:
    rows = parse_hourly(
        sample_payload, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "2026-11-12T03:00", not_after=LATE
    )

    assert len(rows) == 3
    assert rows[0].location_code == "PAP"
    assert rows[0].observed_at == "2026-11-12T00:00"
    assert rows[1].precipitation == 1.2
    assert rows[2].temperature_2m is None  # missing values are kept as NULL


def test_parse_hourly_drops_forecast_hours(sample_payload: dict[str, Any]) -> None:
    rows = parse_hourly(
        sample_payload,
        DEFAULT_LOCATIONS[0],
        HOURLY_VARIABLES,
        "now",
        not_after=datetime(2026, 11, 12, 1, 30),
    )

    assert [r.observed_at for r in rows] == ["2026-11-12T00:00", "2026-11-12T01:00"]


def test_parse_hourly_rejects_missing_block() -> None:
    with pytest.raises(ExtractError):
        parse_hourly({}, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "now", not_after=LATE)


def test_parse_hourly_rejects_misaligned_columns(sample_payload: dict[str, Any]) -> None:
    sample_payload["hourly"]["precipitation"] = [0.0]
    with pytest.raises(ExtractError, match="precipitation"):
        parse_hourly(sample_payload, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "now", not_after=LATE)


@respx.mock
def test_extract_weather_calls_api_per_location(
    settings: Settings, sample_payload: dict[str, Any]
) -> None:
    route = respx.get(API_URL).mock(return_value=httpx.Response(200, json=sample_payload))

    records = extract_weather(settings, past_days=2)

    assert route.call_count == len(settings.locations)
    assert {r.location_code for r in records} == {"PAP", "BTE"}
    assert route.calls[0].request.url.params["past_days"] == "2"


@respx.mock
def test_extract_weather_retries_transient_errors(
    settings: Settings, sample_payload: dict[str, Any]
) -> None:
    single = Settings(
        db_path=settings.db_path, api_base_url=API_URL, locations=settings.locations[:1]
    )
    route = respx.get(API_URL).mock(
        side_effect=[httpx.Response(503), httpx.Response(200, json=sample_payload)]
    )

    records = extract_weather(single)

    assert route.call_count == 2
    assert len(records) == 3


def test_parse_air_quality_flattens_columns(air_quality_payload: dict[str, Any]) -> None:
    rows = parse_air_quality(
        air_quality_payload, DEFAULT_LOCATIONS[3], AIR_QUALITY_VARIABLES, "now", not_after=LATE
    )

    assert len(rows) == 3
    assert rows[0].location_code == "FDF"
    assert rows[1].dust == 6.5
    assert rows[2].european_aqi == 29
    assert rows[2].pm10 is None  # missing values are kept as NULL


def test_parse_air_quality_drops_forecast_hours(air_quality_payload: dict[str, Any]) -> None:
    rows = parse_air_quality(
        air_quality_payload,
        DEFAULT_LOCATIONS[0],
        AIR_QUALITY_VARIABLES,
        "now",
        not_after=datetime(2026, 11, 12, 0, 0),
    )

    assert [r.observed_at for r in rows] == ["2026-11-12T00:00"]


@respx.mock
def test_extract_air_quality_calls_its_own_api(
    settings: Settings, air_quality_payload: dict[str, Any]
) -> None:
    route = respx.get(AIR_QUALITY_URL).mock(
        return_value=httpx.Response(200, json=air_quality_payload)
    )

    records = extract_air_quality(settings, past_days=2)

    assert route.call_count == len(settings.locations)
    assert len(records) == 3 * len(settings.locations)
    params = route.calls[0].request.url.params
    assert params["hourly"] == ",".join(AIR_QUALITY_VARIABLES)
    assert params["timezone"] == "America/Guadeloupe"
