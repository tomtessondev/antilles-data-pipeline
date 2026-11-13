FROM python:3.12-slim AS base

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    ANTILLES_DB_PATH=/data/antilles.duckdb \
    ANTILLES_LAKE_URL=/data/lake

COPY pyproject.toml README.md ./
COPY src ./src


# Dagster webserver and daemon (docker compose up): the package, dbt and the dbt project.
FROM base AS dagster

RUN pip install --no-cache-dir ".[orchestration]"
# DuckDB downloads its S3 extension on first use; bake it in so runs need no download.
RUN python -c "import duckdb; duckdb.sql('install httpfs')"
COPY transform ./transform
ENV ANTILLES_DBT_PROJECT_DIR=/app/transform \
    ANTILLES_EXPORT_PATH=/data/marts.json \
    DAGSTER_HOME=/opt/dagster/home
# The dbt assets are built from the manifest, so parse the project at build time.
RUN cd transform && dbt parse --profiles-dir . && mkdir -p "$DAGSTER_HOME"
COPY docker/dagster.yaml /opt/dagster/home/dagster.yaml
EXPOSE 3000


# Default target: the plain CLI (docker build .).
FROM base AS cli

RUN pip install --no-cache-dir . && python -c "import duckdb; duckdb.sql('install httpfs')"
VOLUME ["/data"]
ENTRYPOINT ["antilles-pipeline"]
CMD ["run"]
