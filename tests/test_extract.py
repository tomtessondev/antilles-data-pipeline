from __future__ import annotations

from typing import Any

import httpx
import pytest
import respx

from antilles_pipeline.config import DEFAULT_LOCATIONS, HOURLY_VARIABLES, Settings
from antilles_pipeline.extract import ExtractError, extract_weather, parse_hourly
from tests.conftest import API_URL


def test_parse_hourly_flattens_columns(sample_payload: dict[str, Any]) -> None:
    rows = parse_hourly(sample_payload, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "2026-11-12T03:00")

    assert len(rows) == 3
    assert rows[0].location_code == "PAP"
    assert rows[0].observed_at == "2026-11-12T00:00"
    assert rows[1].precipitation == 1.2
    assert rows[2].temperature_2m is None  # missing values are kept as NULL


def test_parse_hourly_rejects_missing_block() -> None:
    with pytest.raises(ExtractError):
        parse_hourly({}, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "now")


def test_parse_hourly_rejects_misaligned_columns(sample_payload: dict[str, Any]) -> None:
    sample_payload["hourly"]["precipitation"] = [0.0]
    with pytest.raises(ExtractError, match="precipitation"):
        parse_hourly(sample_payload, DEFAULT_LOCATIONS[0], HOURLY_VARIABLES, "now")


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
