{{
    config(
        materialized='incremental',
        unique_key=['location_code', 'observed_date'],
        incremental_strategy='delete+insert',
        on_schema_change='fail',
    )
}}

-- Same incremental pattern as fct_daily_weather: rebuild every (town, day) that received
-- rows since the previous run, from all of that day's hours.
with hourly as (
    select * from {{ ref('stg_air_quality_hourly') }} as stg
    {% if is_incremental() %}
    where exists (
        select 1
        from {{ ref('stg_air_quality_hourly') }} as changed
        where changed.location_code = stg.location_code
          and changed.observed_date = stg.observed_date
          and changed.extracted_at > (select max(last_extracted_at) from {{ this }})
    )
    {% endif %}
)

select
    location_code,
    observed_date,
    round(avg(pm10_ugm3), 1)        as pm10_avg_ugm3,
    round(max(pm10_ugm3), 1)        as pm10_max_ugm3,
    round(avg(pm2_5_ugm3), 1)       as pm2_5_avg_ugm3,
    round(max(dust_ugm3), 1)        as dust_max_ugm3,
    round(max(ozone_ugm3), 1)       as ozone_max_ugm3,
    max(european_aqi)               as european_aqi_max,
    -- EU daily limit for PM10 (Directive 2008/50/EC): 50 µg/m³ as a daily mean.
    coalesce(avg(pm10_ugm3) > 50, false) as exceeds_pm10_daily_limit,
    count(*)                        as hours_observed,
    max(extracted_at)               as last_extracted_at
from hourly
group by location_code, observed_date
