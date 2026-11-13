-- Fails if a town has more than one row for the same day.
select
    location_code,
    observed_date,
    count(*) as n_rows
from {{ ref('fct_daily_weather') }}
group by location_code, observed_date
having count(*) > 1
