"""Extract hourly weather observations from the Open-Meteo API (free, no API key)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from antilles_pipeline.config import Location, Settings

logger = logging.getLogger(__name__)


class ExtractError(RuntimeError):
    """Raised when the API answers with an unusable payload."""


@dataclass(frozen=True)
class WeatherRecord:
    """One hourly observation for one location, flattened for loading."""

    location_code: str
    observed_at: str
    temperature_2m: float | None
    relative_humidity_2m: float | None
    precipitation: float | None
    wind_speed_10m: float | None
    extracted_at: str


@retry(
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
def _get_json(client: httpx.Client, url: str, params: dict[str, Any]) -> dict[str, Any]:
    response = client.get(url, params=params)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ExtractError("Unexpected payload type from weather API")
    return payload


def parse_hourly(
    payload: dict[str, Any], location: Location, variables: tuple[str, ...], extracted_at: str
) -> list[WeatherRecord]:
    """Turn Open-Meteo's column-oriented `hourly` block into one record per hour."""
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict) or "time" not in hourly:
        raise ExtractError(f"No hourly data for {location.code}")

    times: list[str] = hourly["time"]
    columns = {var: hourly.get(var, [None] * len(times)) for var in variables}
    for var, values in columns.items():
        if len(values) != len(times):
            raise ExtractError(f"Column {var} has {len(values)} values for {len(times)} timestamps")

    return [
        WeatherRecord(
            location_code=location.code,
            observed_at=ts,
            temperature_2m=columns["temperature_2m"][i],
            relative_humidity_2m=columns["relative_humidity_2m"][i],
            precipitation=columns["precipitation"][i],
            wind_speed_10m=columns["wind_speed_10m"][i],
            extracted_at=extracted_at,
        )
        for i, ts in enumerate(times)
    ]


def extract_weather(
    settings: Settings,
    past_days: int = 7,
    client: httpx.Client | None = None,
) -> list[WeatherRecord]:
    """Fetch the last `past_days` days of hourly weather for every configured location."""
    extracted_at = datetime.now(UTC).isoformat(timespec="seconds")
    owns_client = client is None
    http = client or httpx.Client(timeout=settings.timeout_seconds)
    records: list[WeatherRecord] = []
    try:
        for location in settings.locations:
            params: dict[str, Any] = {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "hourly": ",".join(settings.hourly_variables),
                "timezone": settings.timezone,
                "past_days": past_days,
                "forecast_days": 1,
            }
            payload = _get_json(http, settings.api_base_url, params)
            rows = parse_hourly(payload, location, settings.hourly_variables, extracted_at)
            logger.info("Extracted %d rows for %s", len(rows), location.name)
            records.extend(rows)
    finally:
        if owns_client:
            http.close()
    return records
