from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from antilles_pipeline.config import DEFAULT_LOCATIONS, Settings

FIXTURES = Path(__file__).parent / "fixtures"
API_URL = "https://weather.test/v1/forecast"
AIR_QUALITY_URL = "https://air-quality.test/v1/air-quality"


@pytest.fixture
def sample_payload() -> dict[str, Any]:
    return json.loads((FIXTURES / "open_meteo_sample.json").read_text(encoding="utf-8"))


@pytest.fixture
def air_quality_payload() -> dict[str, Any]:
    return json.loads((FIXTURES / "open_meteo_air_quality_sample.json").read_text(encoding="utf-8"))


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        db_path=tmp_path / "test.duckdb",
        lake_url=str(tmp_path / "lake"),
        s3_endpoint=None,
        api_base_url=API_URL,
        air_quality_api_url=AIR_QUALITY_URL,
        locations=DEFAULT_LOCATIONS[:2],
    )
