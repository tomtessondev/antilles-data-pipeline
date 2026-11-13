from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import httpx
import pytest
import respx
from dagster import AssetKey, DagsterInstance

from tests.conftest import AIR_QUALITY_URL, API_URL

TRANSFORM_DIR = Path(__file__).resolve().parents[1] / "transform"


@pytest.fixture(scope="session")
def dbt_manifest() -> None:
    """The dbt assets are built from the manifest, so it must exist before the import."""
    subprocess.run(
        ["dbt", "parse", "--profiles-dir", "."],
        cwd=TRANSFORM_DIR,
        check=True,
        capture_output=True,
    )


@pytest.mark.usefixtures("dbt_manifest")
def test_lineage_runs_from_the_apis_to_the_dashboard() -> None:
    from antilles_pipeline.orchestration.definitions import defs

    graph = defs.resolve_asset_graph()

    def parents(key: AssetKey) -> set[AssetKey]:
        return set(graph.get(key).parent_keys)

    # Raw assets carry the keys dbt gives its sources, so the graph connects without glue.
    assert AssetKey(["raw", "weather_hourly"]) in parents(
        AssetKey(["staging", "stg_weather_hourly"])
    )
    assert AssetKey(["raw", "air_quality_hourly"]) in parents(
        AssetKey(["staging", "stg_air_quality_hourly"])
    )
    assert parents(AssetKey("marts_json")) == {
        AssetKey(["marts", "dim_location"]),
        AssetKey(["marts", "fct_daily_weather"]),
        AssetKey(["marts", "fct_daily_air_quality"]),
    }
    groups = {key.path[-1]: graph.get(key).group_name for key in graph.get_all_asset_keys()}
    assert groups["weather_hourly"] == "raw"
    assert groups["stg_weather_hourly"] == "staging"
    assert groups["fct_daily_weather"] == "marts"
    assert groups["marts_json"] == "serve"


@pytest.mark.usefixtures("dbt_manifest")
def test_daily_schedule_runs_at_six_local_time() -> None:
    from antilles_pipeline.orchestration.definitions import defs

    schedule = defs.resolve_schedule_def("daily_pipeline_schedule")

    assert schedule.cron_schedule == "0 6 * * *"
    assert schedule.execution_timezone == "America/Guadeloupe"


@pytest.mark.usefixtures("dbt_manifest")
@respx.mock
def test_daily_job_end_to_end(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    sample_payload: dict[str, Any],
    air_quality_payload: dict[str, Any],
) -> None:
    """The real job: mocked APIs, real DuckDB, real dbt build and tests, real export."""
    monkeypatch.setenv("ANTILLES_DB_PATH", str(tmp_path / "e2e.duckdb"))
    monkeypatch.setenv("ANTILLES_EXPORT_PATH", str(tmp_path / "marts.json"))
    monkeypatch.setenv("ANTILLES_WEATHER_API", API_URL)
    monkeypatch.setenv("ANTILLES_AIR_QUALITY_API", AIR_QUALITY_URL)
    respx.get(API_URL).mock(return_value=httpx.Response(200, json=sample_payload))
    respx.get(AIR_QUALITY_URL).mock(return_value=httpx.Response(200, json=air_quality_payload))
    from antilles_pipeline.orchestration.definitions import defs

    result = defs.resolve_job_def("daily_pipeline").execute_in_process(
        instance=DagsterInstance.ephemeral()
    )

    assert result.success
    checks = result.get_asset_check_evaluations()
    assert checks, "dbt tests should be reported as asset checks"
    assert all(check.passed for check in checks)
    document = json.loads((tmp_path / "marts.json").read_text(encoding="utf-8"))
    # 6 towns x 1 (partial) fixture day, for both sources.
    assert len(document["weather"]) == 6
    assert len(document["air_quality"]) == 6
