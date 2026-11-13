select
    location_code,
    observed_at,
    cast(observed_at as date) as observed_date,
    pm10                      as pm10_ugm3,
    pm2_5                     as pm2_5_ugm3,
    dust                      as dust_ugm3,
    ozone                     as ozone_ugm3,
    nitrogen_dioxide          as no2_ugm3,
    european_aqi,
    extracted_at
from {{ source('raw', 'air_quality_hourly') }}
