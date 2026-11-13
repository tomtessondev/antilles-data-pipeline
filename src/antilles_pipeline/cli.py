"""Command-line entry point: `antilles-pipeline run`."""

from __future__ import annotations

import logging
from pathlib import Path

import typer

from antilles_pipeline.config import Settings
from antilles_pipeline.extract import extract_air_quality, extract_weather
from antilles_pipeline.load import connect, load_air_quality, load_locations, load_weather

app = typer.Typer(help="Antilles open-data pipeline", no_args_is_help=True)


@app.callback()
def main(verbose: bool = typer.Option(False, "--verbose", "-v", help="Debug logging")) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )


@app.command()
def run(
    past_days: int = typer.Option(7, min=1, max=92, help="Days of history to fetch"),
    db_path: Path | None = typer.Option(None, help="DuckDB file (default: $ANTILLES_DB_PATH)"),
) -> None:
    """Extract weather and air quality for all locations and load them into DuckDB."""
    settings = Settings() if db_path is None else Settings(db_path=db_path)
    weather = extract_weather(settings, past_days=past_days)
    air_quality = extract_air_quality(settings, past_days=past_days)
    con = connect(settings.db_path)
    try:
        load_locations(con, settings.locations)
        n_weather = load_weather(con, weather)
        n_air = load_air_quality(con, air_quality)
    finally:
        con.close()
    typer.echo(f"Loaded {n_weather} weather and {n_air} air-quality rows into {settings.db_path}")


if __name__ == "__main__":
    app()
