from __future__ import annotations

from pathlib import Path
from typing import Any

import duckdb
import httpx
import pytest
import respx
from typer.testing import CliRunner

from antilles_pipeline.cli import app
from tests.conftest import AIR_QUALITY_URL, API_URL


@respx.mock
def test_run_end_to_end(
    tmp_path: Path,
    sample_payload: dict[str, Any],
    air_quality_payload: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANTILLES_WEATHER_API", API_URL)
    monkeypatch.setenv("ANTILLES_AIR_QUALITY_API", AIR_QUALITY_URL)
    monkeypatch.setenv("ANTILLES_LAKE_URL", str(tmp_path / "lake"))
    respx.get(API_URL).mock(return_value=httpx.Response(200, json=sample_payload))
    respx.get(AIR_QUALITY_URL).mock(return_value=httpx.Response(200, json=air_quality_payload))
    db = tmp_path / "cli.duckdb"

    result = CliRunner().invoke(app, ["run", "--past-days", "1", "--db-path", str(db)])

    assert result.exit_code == 0, result.output
    con = duckdb.connect(str(db))
    # 6 default locations x 3 hours each, for both sources
    assert con.execute("select count(*) from raw.weather_hourly").fetchone() == (18,)
    assert con.execute("select count(*) from raw.air_quality_hourly").fetchone() == (18,)
    con.close()
    landed = sorted(p.parent.parent.name for p in (tmp_path / "lake").rglob("*.parquet"))
    assert landed == ["air_quality_hourly", "weather_hourly"]
