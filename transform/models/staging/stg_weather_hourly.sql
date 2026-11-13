with weather as (
    select * from {{ source('raw', 'weather_hourly') }}
),

locations as (
    select * from {{ source('raw', 'locations') }}
)

select
    weather.location_code,
    locations.name                         as town,
    locations.territory,
    weather.observed_at,
    cast(weather.observed_at as date)      as observed_date,
    weather.temperature_2m                 as temperature_c,
    weather.relative_humidity_2m           as humidity_pct,
    coalesce(weather.precipitation, 0)     as precipitation_mm,
    weather.wind_speed_10m                 as wind_speed_kmh,
    weather.extracted_at
from weather
inner join locations using (location_code)
