# Roadmap

Each step adds one technology that freelance data missions ask for. Every step should
end with: green CI, updated README, and a short "what I learned" note in the PR.

## Phase 1: finish the core pipeline (this repo)

1. **Run it for real.** Trigger the "Daily pipeline" workflow once, check the DuckDB
   artifact, fix anything the real API returns that the fixture did not.
2. **Incremental dbt model.** Make `fct_daily_weather` incremental and add a
   `dim_location` model plus a source freshness check on `extracted_at`.
3. **Second source.** Add air quality (Open-Meteo air-quality API) or fuel prices
   (data.gouv.fr "prix des carburants") as a new extractor with its own tests.
4. **Data quality report.** Add dbt docs generation and publish it with GitHub Pages.

## Phase 2: dashboard

5. **Next.js dashboard** in `dashboard/`: read the marts (export to Parquet or JSON in
   CI), charts per town, deploy on Vercel. Tech: TypeScript, React, a chart library.

## Phase 3: orchestration and cloud

6. **Orchestration.** Replace the cron with Dagster (or Airflow): assets for extract,
   load and dbt, with schedules and retries. Run it locally with Docker Compose.
7. **Cloud storage.** Write raw data as partitioned Parquet to S3 (AWS free tier) or
   GCS, then query it from DuckDB. Tech: boto3, Parquet, IAM basics.
8. **Infrastructure as code.** Terraform for the bucket, IAM role and a scheduled job
   (AWS Lambda or ECS Fargate, or Cloud Run). Store state remotely.

## Phase 4: separate portfolio projects

Each one is a new repo, sized for one or two weekends.

| Project | What it shows | Tech |
| --- | --- | --- |
| **Lakehouse on Databricks** | Medallion architecture (bronze, silver, gold) on public INSEE or Météo-France data | Databricks Community Edition, PySpark, Delta Lake |
| **Cloud warehouse** | Same dbt models on a real warehouse, cost-aware | BigQuery sandbox or Snowflake trial, dbt Cloud |
| **Streaming** | Live feed processed in real time, e.g. earthquakes (USGS) or Caribbean shipping (AIS) | Kafka or Redpanda, Python consumer, Docker Compose |
| **IoT / embedded to cloud** | Bridges FPGA/embedded background with data: sensor (ESP32 or simulated) to MQTT to a time-series DB to Grafana | MQTT, TimescaleDB or InfluxDB, Grafana |
| **API service** | Serve the marts through a typed REST API with auth and tests | FastAPI, Pydantic, PostgreSQL, Docker |
| **ML on top of data** | Rain forecast or solar output per town, tracked experiments | scikit-learn, MLflow |

## Suggested order

Phase 1, then the dashboard (visible result for LinkedIn), then Dagster + S3 +
Terraform, then the IoT project (most distinctive given an embedded background),
then Databricks and streaming.
