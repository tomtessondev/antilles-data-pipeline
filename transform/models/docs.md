{% docs __overview__ %}
# Antilles Data Pipeline

Daily weather and air quality for six towns in **Guadeloupe** and **Martinique**, from the
[Open-Meteo](https://open-meteo.com/) weather and air-quality (CAMS) APIs.

A Python package extracts the last days of hourly data and upserts them into DuckDB
(schema `raw`). This dbt project then builds:

- **staging** views: one per source table, renamed and typed, units in column names;
- **marts** tables: `dim_location` and two incremental daily facts,
  `fct_daily_weather` and `fct_daily_air_quality`, one row per town and day.

Every model is tested (keys, not-null, accepted values, relationships, one row per town
and day) and the raw tables have a freshness check on `extracted_at`.

Source code and CI: [github.com/tomtessondev/antilles-data-pipeline](https://github.com/tomtessondev/antilles-data-pipeline).
This site is rebuilt from fixture data on every merge to `main`, so row counts and
statistics in the catalog describe the test dataset, not production.
{% enddocs %}

{% docs location_code %}
Three-letter code of the town (for example `PAP` for Pointe-à-Pitre), key of `dim_location`.
{% enddocs %}

{% docs observed_at %}
Start of the hour, in local Antilles time (America/Guadeloupe, UTC−4, no daylight saving).
{% enddocs %}

{% docs observed_date %}
Local calendar day of the observation (America/Guadeloupe).
{% enddocs %}

{% docs extracted_at %}
When the row was last written by the pipeline (naive UTC). Used for source freshness
and to find the days an incremental run must rebuild.
{% enddocs %}

{% docs hours_observed %}
Hours aggregated for the day; below 24 for the current, partial day.
{% enddocs %}

{% docs last_extracted_at %}
Latest extraction (UTC) that contributed to the row; drives incremental runs.
{% enddocs %}

{% docs territory %}
French overseas region of the town: `Guadeloupe` or `Martinique`.
{% enddocs %}
