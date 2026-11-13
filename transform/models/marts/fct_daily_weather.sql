select
    location_code,
    town,
    territory,
    observed_date,
    round(min(temperature_c), 1)    as temp_min_c,
    round(max(temperature_c), 1)    as temp_max_c,
    round(avg(temperature_c), 1)    as temp_avg_c,
    round(sum(precipitation_mm), 1) as rain_total_mm,
    round(max(wind_speed_kmh), 1)   as wind_max_kmh,
    count(*)                        as hours_observed
from {{ ref('stg_weather_hourly') }}
group by all
