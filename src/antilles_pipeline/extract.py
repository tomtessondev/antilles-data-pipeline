"""Extract hourly weather and air quality from the Open-Meteo APIs (free, no API key)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol, TypeVar
from zoneinfo import ZoneInfo

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


@dataclass(frozen=True)
class AirQualityRecord:
    """One hourly air-quality value for one location (CAMS model data via Open-Meteo)."""

    location_code: str
    observed_at: str
    pm10: float | None
    pm2_5: float | None
    dust: float | None
    ozone: float | None
    nitrogen_dioxide: float | None
    european_aqi: int | None
    extracted_at: str


R = TypeVar("R")


class HourlyParser(Protocol[R]):
    def __call__(
        self,
        payload: dict[str, Any],
        location: Location,
        variables: tuple[str, ...],
        extracted_at: str,
        *,
        not_after: datetime,
    ) -> list[R]: ...


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
        raise ExtractError(f"Unexpected payload type from {url}")
    return payload


def _past_hours(
    payload: dict[str, Any], location: Location, variables: tuple[str, ...], not_after: datetime
) -> list[tuple[str, dict[str, Any]]]:
    """Validate Open-Meteo's column-oriented `hourly` block and return (timestamp, values) rows.

    The APIs also return the rest of the current day as forecasts; hours later than `not_after`
    (naive, in the API's local timezone) are dropped so the tables only hold past hours.
    """
    hourly = payload.get("hourly")
    if not isinstance(hourly, dict) or "time" not in hourly:
        raise ExtractError(f"No hourly data for {location.code}")

    times: list[str] = hourly["time"]
    columns = {var: hourly.get(var, [None] * len(times)) for var in variables}
    for var, values in columns.items():
        if len(values) != len(times):
            raise ExtractError(f"Column {var} has {len(values)} values for {len(times)} timestamps")

    return [
        (ts, {var: values[i] for var, values in columns.items()})
        for i, ts in enumerate(times)
        if datetime.fromisoformat(ts) <= not_after
    ]


def parse_hourly(
    payload: dict[str, Any],
    location: Location,
    variables: tuple[str, ...],
    extracted_at: str,
    *,
    not_after: datetime,
) -> list[WeatherRecord]:
    """Turn a weather payload into one record per past hour."""
    return [
        WeatherRecord(
            location_code=location.code,
            observed_at=ts,
            temperature_2m=values["temperature_2m"],
            relative_humidity_2m=values["relative_humidity_2m"],
            precipitation=values["precipitation"],
            wind_speed_10m=values["wind_speed_10m"],
            extracted_at=extracted_at,
        )
        for ts, values in _past_hours(payload, location, variables, not_after)
    ]


def parse_air_quality(
    payload: dict[str, Any],
    location: Location,
    variables: tuple[str, ...],
    extracted_at: str,
    *,
    not_after: datetime,
) -> list[AirQualityRecord]:
    """Turn an air-quality payload into one record per past hour."""
    return [
        AirQualityRecord(
            location_code=location.code,
            observed_at=ts,
            pm10=values["pm10"],
            pm2_5=values["pm2_5"],
            dust=values["dust"],
            ozone=values["ozone"],
            nitrogen_dioxide=values["nitrogen_dioxide"],
            european_aqi=values["european_aqi"],
            extracted_at=extracted_at,
        )
        for ts, values in _past_hours(payload, location, variables, not_after)
    ]


def _extract(
    settings: Settings,
    url: str,
    variables: tuple[str, ...],
    parse: HourlyParser[R],
    past_days: int,
    client: httpx.Client | None,
) -> list[R]:
    now = datetime.now(UTC)
    extracted_at = now.isoformat(timespec="seconds")
    local_now = now.astimezone(ZoneInfo(settings.timezone)).replace(tzinfo=None)
    owns_client = client is None
    http = client or httpx.Client(timeout=settings.timeout_seconds)
    records: list[R] = []
    try:
        for location in settings.locations:
            params: dict[str, Any] = {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "hourly": ",".join(variables),
                "timezone": settings.timezone,
                "past_days": past_days,
                "forecast_days": 1,
            }
            payload = _get_json(http, url, params)
            rows = parse(payload, location, variables, extracted_at, not_after=local_now)
            logger.info("Extracted %d rows for %s from %s", len(rows), location.name, url)
            records.extend(rows)
    finally:
        if owns_client:
            http.close()
    return records


def extract_weather(
    settings: Settings,
    past_days: int = 7,
    client: httpx.Client | None = None,
) -> list[WeatherRecord]:
    """Fetch the last `past_days` days of hourly weather for every configured location."""
    return _extract(
        settings, settings.api_base_url, settings.hourly_variables, parse_hourly, past_days, client
    )


def extract_air_quality(
    settings: Settings,
    past_days: int = 7,
    client: httpx.Client | None = None,
) -> list[AirQualityRecord]:
    """Fetch the last `past_days` days of hourly air quality for every configured location."""
    return _extract(
        settings,
        settings.air_quality_api_url,
        settings.air_quality_variables,
        parse_air_quality,
        past_days,
        client,
    )
