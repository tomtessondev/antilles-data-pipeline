{{
    config(
        materialized='incremental',
        unique_key=['location_code', 'observed_date'],
        incremental_strategy='delete+insert',
        on_schema_change='fail',
    )
}}

-- Each extraction re-sends the last N days, so a new load can complete or correct a day
-- already in the table. Incremental runs rebuild every (town, day) that received rows
-- since the previous run, from all of that day's hours, not only the new ones.
with hourly as (
    select * from {{ ref('stg_weather_hourly') }} as stg
    {% if is_incremental() %}
    where exists (
        select 1
        from {{ ref('stg_weather_hourly') }} as changed
        where changed.location_code = stg.location_code
          and changed.observed_date = stg.observed_date
          and changed.extracted_at > (select max(last_extracted_at) from {{ this }})
    )
    {% endif %}
)

select
    location_code,
    observed_date,
    round(min(temperature_c), 1)    as temp_min_c,
    round(max(temperature_c), 1)    as temp_max_c,
    round(avg(temperature_c), 1)    as temp_avg_c,
    round(sum(precipitation_mm), 1) as rain_total_mm,
    round(max(wind_speed_kmh), 1)   as wind_max_kmh,
    count(*)                        as hours_observed,
    max(extracted_at)               as last_extracted_at
from hourly
group by location_code, observed_date
