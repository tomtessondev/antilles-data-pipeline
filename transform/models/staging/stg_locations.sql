select
    location_code,
    name      as town,
    territory,
    latitude,
    longitude
from {{ source('raw', 'locations') }}
