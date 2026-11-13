select
    location_code,
    town,
    territory,
    latitude,
    longitude
from {{ ref('stg_locations') }}
