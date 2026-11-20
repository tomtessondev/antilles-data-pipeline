# Live Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live demos on real data: the AIS stack and the sensor stack (fed by Météo-France's automatic stations) running on the owner's VPS, with public Grafana dashboards and live maps on the portfolio site.

**Architecture:** Phase 1 builds and tests everything locally: a Météo-France bridge and a station registry in the sensor repository, a read-only JSON endpoint in each of the two repositories, and live map components on the site with an offline state. Phase 2 deploys the two stacks on the VPS (Coolify, Traefik), command by command with the owner.

**Tech Stack:** Python 3.12 (httpx, paho-mqtt, pydantic, FastAPI), TimescaleDB / PostgreSQL, Mosquitto TLS, Kafka/Flink (existing), Grafana; Next.js 16 + MapLibre GL (OpenFreeMap tiles); Docker Compose, Coolify, Traefik.

**Spec:** `docs/superpowers/specs/2026-11-20-live-demos-design.md` (read its two amended sections).

## Global Constraints

- Real data only in public demos; the simulator stays for tests and local runs.
- Météo-France: DPObs v2 / Package Observations, OAuth2 client credentials from `secrets/meteofrance_application_id` (sensor repo, ignored by Git); token cached until 60 s before expiry; departments 971 and 972 every 6 minutes; never print the id or the token; tests never call Météo-France (respx fixtures recorded from the real shapes).
- Telemetry contract v1 unchanged: `temperature_c` = t − 273.15, `humidity_pct` = u, `pressure_hpa` = pres / 100, others null; `seq` = number of 360-second intervals since the epoch of `validity_time`.
- Station ids `^[a-z]{2}-[a-z]{3}-\d{2}$` (gp, mq, bl, mf); one MQTT session per station with its own credentials and last will; ACL unchanged.
- New column `stations.expected_interval_s` (default 60 for the simulator, 360 for Météo-France); offline = no reading for 3 intervals.
- Endpoints: read-only DB roles, CORS limited to `https://antilles-data-pipeline.vercel.app` and `http://localhost:3000`, `Cache-Control: public, max-age=5` (ships) / `max-age=60` (stations), no secret in responses.
- Site: the map is the only client component; MapLibre GL + OpenFreeMap tiles (justified new dependency); if an endpoint does not answer in 5 s, the page says "Démo momentanément indisponible" with the last successful time, never a blank map.
- VPS (phase 2): no host port published, Traefik + Let's Encrypt only, pinned images, memory limits on every container (about 4 GB in all), every modifying command approved by the owner, new databases added to the nightly backup with a restore test.
- Per repository: its CLAUDE.md checks before every commit, one PR per repository and feature, merge only on the owner's go.

## Review Focus

1. Météo-France returns a station with all measures null, or a reading older than the last one sent → nothing is published for it (no duplicate, no empty reading).
2. Token expiry mid-run (401) → the bridge fetches a new token once and retries, without crashing.
3. A station from the package that is not in the registry → logged and skipped, not published with invented credentials.
4. The site when the VPS is down or slow → the offline message within 5 s, the rest of the page intact.
5. A ship with null lat/lon in `ship_positions` → excluded from the endpoint, not drawn at (0, 0).

Tests: 1, 2, 3 → Task 2; 4 → Task 5; 5 → Task 4.

---

## Phase 1 — code and tests (no VPS)

### Task 1: Station registry and cadence (sensor repo)

**Files:** `src/sensor_pipeline/sql/00N_station_cadence.sql` (next free number), `src/sensor_pipeline/registry.py`, `stations/meteofrance_antilles.csv`, `scripts/build_registry.py` (one-off, reads the real station list), `src/sensor_pipeline/provision.py`, `src/sensor_pipeline/cli.py`, dashboards/alerts in `grafana/`, tests.

**Interfaces — produces:** `@dataclass RegistryStation(station_id, mf_id, name, territory, latitude, longitude, expected_interval_s)`; `def load_registry(path: Path) -> list[RegistryStation]`; env `STATION_SOURCE=simulated|meteofrance` selects what `migrate` seeds and what `provision` creates credentials for.

- [ ] Failing tests: `test_registry_ids_follow_the_contract` (every id matches the pattern, unique, every mf_id unique); `test_migrate_seeds_the_registry` (integration: `STATION_SOURCE=meteofrance` → the registry stations, none of the simulated ones); `test_offline_waits_three_intervals` (a 360 s station silent 15 min is online, 19 min offline); `test_quality_rules_respect_cadence` (pm10_stuck / neighbours windows scale with the interval).
- [ ] Implement; build the CSV once from the real list (stations with at least temperature in their pack), commit it; update `station_health`, the offline alert and `flag_readings` to use `expected_interval_s`; `tests/test_grafana.py` still runs every query.
- [ ] `make check` + `make integration`; commit "Register real stations and their cadence".

### Task 2: Météo-France bridge (sensor repo)

**Files:** `src/sensor_pipeline/meteofrance.py`, `src/sensor_pipeline/bridge.py`, `cli.py` (`sensor-pipeline bridge`), `tests/fixtures/meteofrance/*.json` (package responses recorded once from the real API; they hold no secret), tests.

**Interfaces — produces:** `class MeteoFranceClient(http: httpx.Client, application_id: str, clock)` with `def package(self, department: str) -> list[Observation]` (token cached, one retry on 401); `def to_telemetry(obs: Observation, station: RegistryStation) -> Telemetry | None` (None when every measure is null); `class Bridge(client, registry, publisher_factory, clock)` with `def tick(self) -> int` (readings published).

- [ ] Failing tests: `test_conversion_units_and_seq`; `test_all_null_reading_is_not_published` and `test_older_or_same_reading_is_not_republished` (Review Focus 1); `test_expired_token_is_renewed_once` (Review Focus 2); `test_unknown_station_is_skipped_and_logged` (Review Focus 3); `test_each_station_publishes_with_its_own_session` (fake publisher records station → client id); integration `test_bridge_readings_reach_timescale` (fixture package → real broker + db via testcontainers → rows in `telemetry`).
- [ ] Implement; the loop polls every 120 s, publishes only new `validity_time` per station; one real probe run by hand (not in tests) prints counts only.
- [ ] Checks; commit "Bridge Météo-France's automatic stations into MQTT".

### Task 3: Stations endpoint (sensor repo)

**Files:** `src/sensor_pipeline/api.py` (FastAPI), `sql/00N_site_reader.sql` (role `site_reader`, select on the latest-reading view), compose service `api`, tests.

**Interfaces — produces:** `GET /v1/stations` → `{"generated_at", "stations": [{station_id, name, territory, lat, lon, ts, temperature_c, humidity_pct, pressure_hpa, pm10_ugm3, status}]}` (latest clean reading per station within 24 h); `GET /health`.

- [ ] Failing integration tests: latest reading per station; offline status after 3 intervals; CORS allows only the two site origins; no column outside the list leaks. Implement; checks; commit "Serve the latest reading of each station".

### Task 4: Ships endpoint (AIS repo)

**Files:** `src/ais_stream/api.py` (FastAPI), `postgres/init.sql` (role `site_reader`, idempotent like `grafana_reader`), compose service `api` in the `live` profile, tests.

**Interfaces — produces:** `GET /v1/ships?since_minutes=30` → `{"generated_at", "ships": [{mmsi, name, lat, lon, sog_kn, cog_deg, heading_deg, ts, port}]}` from `ship_positions`; `GET /v1/anomalies?hours=6` (dark periods, position jumps); `GET /health`.

- [ ] Failing integration tests: only ships seen within the window; `test_ship_without_position_is_left_out` (Review Focus 5); CORS as above; `since_minutes` bounded 1..180. Implement; checks (`make check`, `make integration`); commit "Serve live ship positions to the site".

### Task 5: Live maps on the site (pipeline repo, dashboard)

**Files:** `dashboard/src/components/live/{live-map,ships-map,stations-map,offline}.tsx`, `dashboard/src/lib/live.ts` (fetch with a 5 s timeout, typed with zod), the AIS and sensor project pages ("Démo en direct" section at the top of the text), `package.json` (`maplibre-gl`).

**Interfaces — produces:** `fetchLive<T>(url: string, schema: ZodType<T>, timeoutMs = 5000): Promise<{ ok: true; data: T } | { ok: false; reason: string }>`; env `NEXT_PUBLIC_AIS_LIVE_URL`, `NEXT_PUBLIC_SENSORS_LIVE_URL`.

- [ ] Failing vitest tests for `fetchLive` (timeout → `ok:false`, schema mismatch → `ok:false`, success → data) and for the marker mapping (ships → heading-rotated markers; stations → value colour from the PM10 / temperature scale). Implement; the map polls every 5 s (ships) / 60 s (stations), shows "Dernière donnée : il y a N min" and the offline state (Review Focus 4).
- [ ] Dashboard checks + `make check` + `make transform`; local check against the two stacks running with Docker (ships from the real aisstream feed, stations from the bridge); PR after the owner's go.

## Phase 2 — deployment on the VPS (owner approves every modifying command)

### Task 6: Prepare

- [ ] Read-only survey (memory, disk, ports, Coolify projects); copy the owner's VPS document into `docs/vps.md` of the sensor and AIS repositories.
- [ ] Owner: DNS A records `ais` and `capteurs` → the VPS; secrets in Infisical (aisstream key, Météo-France application id, broker CA / passwords generated by `provision`, DB passwords).

### Task 7: Deploy the sensor stack, then the AIS stack

- [ ] Per stack: a `docker-compose.vps.yml` (no host ports, memory limits, pinned images, Traefik labels for Grafana and the endpoint on the stack's subdomain) as a Coolify resource in project `portfolio`; first start; `ss -tlnp` shows nothing new on `0.0.0.0`; Grafana public read-only; endpoints answer over HTTPS.
- [ ] Backups: the new databases in `/root/ops-backup/daily.sh`, a restore test.
- [ ] Site: set the two env vars on Vercel (owner), redeploy, check both maps live in production.
- [ ] Update the VPS document in `horizon-kit` (KVM 4, Padeloupe not in production, the new resources) via a PR after the owner's go.
