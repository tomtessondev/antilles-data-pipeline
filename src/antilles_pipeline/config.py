"""Runtime configuration, read from environment variables with safe defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Location:
    """A place we collect data for. Coordinates are approximate town centres."""

    code: str
    name: str
    territory: str
    latitude: float
    longitude: float


DEFAULT_LOCATIONS: tuple[Location, ...] = (
    Location("PAP", "Pointe-à-Pitre", "Guadeloupe", 16.2411, -61.5331),
    Location("BTE", "Basse-Terre", "Guadeloupe", 15.9985, -61.7255),
    Location("MOU", "Le Moule", "Guadeloupe", 16.3333, -61.3443),
    Location("FDF", "Fort-de-France", "Martinique", 14.6161, -61.0588),
    Location("LAM", "Le Lamentin", "Martinique", 14.6133, -60.9997),
    Location("SAN", "Sainte-Anne", "Martinique", 14.4400, -60.8817),
)

HOURLY_VARIABLES: tuple[str, ...] = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "wind_speed_10m",
)

AIR_QUALITY_VARIABLES: tuple[str, ...] = (
    "pm10",
    "pm2_5",
    "dust",
    "ozone",
    "nitrogen_dioxide",
    "european_aqi",
)


@dataclass(frozen=True)
class Settings:
    """Pipeline settings. Override any field with the matching environment variable."""

    db_path: Path = field(
        default_factory=lambda: Path(os.getenv("ANTILLES_DB_PATH", "data/antilles.duckdb"))
    )
    api_base_url: str = field(
        default_factory=lambda: os.getenv(
            "ANTILLES_WEATHER_API", "https://api.open-meteo.com/v1/forecast"
        )
    )
    air_quality_api_url: str = field(
        default_factory=lambda: os.getenv(
            "ANTILLES_AIR_QUALITY_API", "https://air-quality-api.open-meteo.com/v1/air-quality"
        )
    )
    timezone: str = "America/Guadeloupe"
    timeout_seconds: float = 30.0
    locations: tuple[Location, ...] = DEFAULT_LOCATIONS
    hourly_variables: tuple[str, ...] = HOURLY_VARIABLES
    air_quality_variables: tuple[str, ...] = AIR_QUALITY_VARIABLES
