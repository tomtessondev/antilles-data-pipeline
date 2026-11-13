"""Entry point for `dagster dev`, the Docker Compose stack and the daily GitHub workflow."""

from __future__ import annotations

from dagster import (
    AssetSelection,
    DefaultScheduleStatus,
    Definitions,
    ScheduleDefinition,
    define_asset_job,
    in_process_executor,
)
from dagster_dbt import DbtCliResource

from antilles_pipeline.orchestration.assets import (
    air_quality_hourly,
    antilles_dbt,
    dbt_project,
    locations,
    marts_json,
    weather_hourly,
)

# Every step writes the same DuckDB file, which allows a single writer: run the steps one
# after the other in one process instead of Dagster's default process-per-step executor.
daily_pipeline = define_asset_job(
    "daily_pipeline",
    selection=AssetSelection.all(),
    executor_def=in_process_executor,
    description="Extract, load, dbt build (models + tests) and JSON export.",
)

daily_schedule = ScheduleDefinition(
    job=daily_pipeline,
    cron_schedule="0 6 * * *",
    execution_timezone="America/Guadeloupe",
    default_status=DefaultScheduleStatus.RUNNING,
)

defs = Definitions(
    assets=[locations, weather_hourly, air_quality_hourly, antilles_dbt, marts_json],
    jobs=[daily_pipeline],
    schedules=[daily_schedule],
    resources={"dbt": DbtCliResource(project_dir=dbt_project)},
)
