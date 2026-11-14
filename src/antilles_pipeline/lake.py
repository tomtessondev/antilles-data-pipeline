"""Raw landing zone: every extraction kept as Parquet, partitioned by extraction date.

Layout: <lake_url>/<source>/extracted_date=YYYY-MM-DD/part_<uuid>.parquet

Files are only ever added. Each run re-sends the last days, so the same hour appears in
several extractions; loading keeps the latest one per (location, hour). The DuckDB raw
tables can therefore be rebuilt at any time from the lake, with the full history.
"""

from __future__ import annotations

import logging
import os
from collections.abc import Sequence
from dataclasses import astuple
from pathlib import Path
from urllib.parse import urlparse

import duckdb

from antilles_pipeline.config import Settings
from antilles_pipeline.extract import AirQualityRecord, WeatherRecord

logger = logging.getLogger(__name__)

SOURCES = ("weather_hourly", "air_quality_hourly")


def _literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _is_s3(settings: Settings) -> bool:
    return settings.lake_url.startswith("s3://")


def attach_lake(con: duckdb.DuckDBPyConnection, settings: Settings) -> None:
    """Give DuckDB the S3 credentials (a no-op for a local lake)."""
    if not _is_s3(settings):
        return
    options = {
        "key_id": os.environ["AWS_ACCESS_KEY_ID"],
        "secret": os.environ["AWS_SECRET_ACCESS_KEY"],
        "region": os.getenv("AWS_REGION", "eu-west-3"),
    }
    # Temporary credentials, e.g. from the GitHub OIDC role.
    if token := os.getenv("AWS_SESSION_TOKEN"):
        options["session_token"] = token
    sql_options = [f"{key} {_literal(value)}" for key, value in options.items()]
    if settings.s3_endpoint:
        endpoint = urlparse(settings.s3_endpoint)
        sql_options += [
            f"endpoint {_literal(endpoint.netloc)}",
            "url_style 'path'",
            f"use_ssl {'true' if endpoint.scheme == 'https' else 'false'}",
        ]
    con.execute(f"create or replace secret antilles_lake (type s3, {', '.join(sql_options)})")


def _source_url(settings: Settings, source: str) -> str:
    return f"{settings.lake_url.rstrip('/')}/{source}"


def write_to_lake(
    con: duckdb.DuckDBPyConnection,
    settings: Settings,
    source: str,
    records: Sequence[WeatherRecord] | Sequence[AirQualityRecord],
) -> int:
    """Append one extraction to the lake, typed like the matching raw table."""
    if not records:
        logger.warning("No %s records to write to the lake", source)
        return 0
    con.execute(f"create or replace temp table lake_batch as select * from raw.{source} limit 0")
    rows = [astuple(r) for r in records]
    con.executemany(f"insert into lake_batch values ({', '.join('?' * len(rows[0]))})", rows)
    if not _is_s3(settings):
        Path(settings.lake_url).mkdir(parents=True, exist_ok=True)
    con.execute(
        f"""
        copy (select *, cast(extracted_at as date) as extracted_date from lake_batch)
        to {_literal(_source_url(settings, source))}
        (format parquet, partition_by (extracted_date), append, filename_pattern 'part_{{uuid}}')
        """
    )
    logger.info("Wrote %d %s rows to %s", len(rows), source, _source_url(settings, source))
    return len(rows)


def load_from_lake(con: duckdb.DuckDBPyConnection, settings: Settings, source: str) -> int:
    """Rebuild raw.<source> from every extraction in the lake, latest extraction wins."""
    files = f"{_source_url(settings, source)}/*/*.parquet"
    row = con.execute(
        f"""
        insert or replace into raw.{source} by name
        select * exclude (extracted_date)
        from read_parquet({_literal(files)}, hive_partitioning = true)
        qualify row_number() over (
            partition by location_code, observed_at order by extracted_at desc
        ) = 1
        """
    ).fetchone()
    loaded = int(row[0]) if row else 0
    logger.info("Loaded %d %s rows from the lake", loaded, source)
    return loaded
