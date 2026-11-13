from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from antilles_pipeline.config import DEFAULT_LOCATIONS, Settings

FIXTURES = Path(__file__).parent / "fixtures"
API_URL = "https://weather.test/v1/forecast"


@pytest.fixture
def sample_payload() -> dict[str, Any]:
    return json.loads((FIXTURES / "open_meteo_sample.json").read_text(encoding="utf-8"))


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        db_path=tmp_path / "test.duckdb",
        api_base_url=API_URL,
        locations=DEFAULT_LOCATIONS[:2],
    )
