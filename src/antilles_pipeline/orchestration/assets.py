"""Assets: lake files, raw tables, dbt models, and the JSON export for the dashboard.

Extraction appends Parquet files to the lake (`lake/<source>`); the raw DuckDB tables are
rebuilt from the whole lake. Raw assets use the keys dbt gives its sources (`raw/<table>`),
so Dagster draws one lineage graph from the APIs to the dashboard file.
"""

# No `from __future__ import annotations` here: Dagster reads the config and context
# annotations at runtime, which string annotations would break.
import os
from collections.abc import Iterator, Mapping
from pathlib import Path
from typing import Any

from dagster import (
    AssetExecutionContext,
    AssetKey,
    Backoff,
    Config,
    MaterializeResult,
    RetryPolicy,
    asset,
)
from dagster_dbt import (
    DagsterDbtTranslator,
    DbtCliResource,
    DbtProject,
    dbt_assets,
    get_asset_key_for_model,
)

from antilles_pipeline.config import Settings
from antilles_pipeline.export import write_export
from antilles_pipeline.extract import (
    AirQualityRecord,
    WeatherRecord,
    extract_air_quality,
    extract_weather,
)
from antilles_pipeline.lake import attach_lake, load_from_lake, write_to_lake
from antilles_pipeline.load import connect, load_locations

# The package is installed editable in development; the Docker image sets the variable.
DBT_PROJECT_DIR = Path(
    os.getenv("ANTILLES_DBT_PROJECT_DIR", Path(__file__).resolve().parents[3] / "transform")
)

dbt_project = DbtProject(project_dir=DBT_PROJECT_DIR, profiles_dir=DBT_PROJECT_DIR)
# Under `dagster dev`, parse the dbt project on load; elsewhere the manifest must exist
# (`dbt parse` in CI and in the image build).
dbt_project.prepare_if_dev()

# tenacity already retries individual HTTP calls; this retries the whole asset when the
# API stays down for longer, e.g. a maintenance window.
API_RETRY = RetryPolicy(max_retries=3, delay=300, backoff=Backoff.EXPONENTIAL)


class ExtractConfig(Config):
    past_days: int = 31


@asset(key_prefix="raw", group_name="raw", kinds={"python", "duckdb"})
def locations() -> MaterializeResult[None]:
    """Towns tracked by the pipeline, from the package configuration."""
    settings = Settings()
    con = connect(settings.db_path)
    try:
        load_locations(con, settings.locations)
    finally:
        con.close()
    return MaterializeResult(metadata={"rows": len(settings.locations)})


def _land(
    source: str, records: list[WeatherRecord] | list[AirQualityRecord], past_days: int
) -> MaterializeResult[None]:
    settings = Settings()
    con = connect(settings.db_path)
    try:
        attach_lake(con, settings)
        rows = write_to_lake(con, settings, source, records)
    finally:
        con.close()
    return MaterializeResult(
        metadata={"rows": rows, "past_days": past_days, "lake_url": settings.lake_url}
    )


def _rebuild(source: str) -> MaterializeResult[None]:
    settings = Settings()
    con = connect(settings.db_path)
    try:
        attach_lake(con, settings)
        rows = load_from_lake(con, settings, source)
    finally:
        con.close()
    return MaterializeResult(metadata={"rows": rows})


@asset(
    key=AssetKey(["lake", "weather_hourly"]),
    group_name="lake",
    retry_policy=API_RETRY,
    kinds={"python", "parquet", "s3"},
)
def lake_weather_hourly(config: ExtractConfig) -> MaterializeResult[None]:
    """Hourly weather from the Open-Meteo forecast API (past hours), appended to the lake."""
    settings = Settings()
    records = extract_weather(settings, past_days=config.past_days)
    return _land("weather_hourly", records, config.past_days)


@asset(
    key=AssetKey(["lake", "air_quality_hourly"]),
    group_name="lake",
    retry_policy=API_RETRY,
    kinds={"python", "parquet", "s3"},
)
def lake_air_quality_hourly(config: ExtractConfig) -> MaterializeResult[None]:
    """Hourly air quality (CAMS) from the Open-Meteo air-quality API, appended to the lake."""
    settings = Settings()
    records = extract_air_quality(settings, past_days=config.past_days)
    return _land("air_quality_hourly", records, config.past_days)


@asset(
    key=AssetKey(["raw", "weather_hourly"]),
    group_name="raw",
    deps=[locations, lake_weather_hourly],
    kinds={"duckdb"},
)
def raw_weather_hourly() -> MaterializeResult[None]:
    """raw.weather_hourly rebuilt from every extraction in the lake, latest wins."""
    return _rebuild("weather_hourly")


@asset(
    key=AssetKey(["raw", "air_quality_hourly"]),
    group_name="raw",
    deps=[locations, lake_air_quality_hourly],
    kinds={"duckdb"},
)
def raw_air_quality_hourly() -> MaterializeResult[None]:
    """raw.air_quality_hourly rebuilt from every extraction in the lake, latest wins."""
    return _rebuild("air_quality_hourly")


class FolderGroups(DagsterDbtTranslator):
    """Group dbt models by their folder (staging, marts) instead of a single default group."""

    def get_group_name(self, dbt_resource_props: Mapping[str, Any]) -> str | None:
        fqn: list[str] = dbt_resource_props["fqn"]
        return fqn[1] if len(fqn) > 2 else super().get_group_name(dbt_resource_props)


@dbt_assets(
    manifest=dbt_project.manifest_path,
    project=dbt_project,
    dagster_dbt_translator=FolderGroups(),
)
def antilles_dbt(context: AssetExecutionContext, dbt: DbtCliResource) -> Iterator[Any]:
    """Staging views, daily facts and their tests (reported as Dagster asset checks)."""
    yield from dbt.cli(["build"], context=context).stream()


MARTS = ["dim_location", "fct_daily_weather", "fct_daily_air_quality"]


@asset(
    deps=[get_asset_key_for_model([antilles_dbt], name) for name in MARTS],
    group_name="serve",
    kinds={"json"},
)
def marts_json() -> MaterializeResult[None]:
    """The marts as one JSON document, read by the dashboard."""
    settings = Settings()
    out = Path(os.getenv("ANTILLES_EXPORT_PATH", "data/marts.json"))
    document = write_export(settings.db_path, out)
    return MaterializeResult(
        metadata={
            "path": str(out),
            "weather_days": len(document["weather"]),
            "air_quality_days": len(document["air_quality"]),
        }
    )
