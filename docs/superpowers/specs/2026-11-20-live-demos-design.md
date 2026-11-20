# Live demos — design

## Intent

The owner wants one demo per portfolio project, on real data fetched from public APIs (not
generated), and — where the project is a live system — data that visibly **moves in real
time** in the browser. A recruiter or a client should see each project working, not only
read about it. Everything runs on the owner's single VPS (Hostinger, Coolify, Traefik), to be
upgraded from KVM 2 to KVM 4 (16 GB, 4 vCPU) before deployment; Padeloupe there is not in
production. Deployment waits for that upgrade: the code is built and tested first.

## Goals

- **AIS (caribbean-ais-stream), live**: the full stack runs continuously on the VPS in
  `live` mode (aisstream.io feed, Kafka, Schema Registry, Flink, PostgreSQL, Grafana,
  Prometheus). A new read-only HTTP endpoint serves the latest position of each ship seen in
  the last 30 minutes, and recent anomalies, as JSON. The site gets a map of the Lesser
  Antilles where ships move (refreshed every 5 s). The project's Grafana dashboards are
  public (anonymous viewer).
- **IoT (caribbean-sensor-pipeline), real stations**: a new `bridge` component replaces the
  simulator in the deployed stack. It reads the official hourly measurements of the
  Gwad'Air (Guadeloupe) and Madininair (Martinique) stations from the national Géod'Air API
  (data.gouv.fr "API mesure des concentrations de polluants atmosphériques réglementés",
  ODbL, source credited), maps each real station to a station id of the MQTT contract, and
  publishes each new measurement as `Telemetry` v1 over the TLS broker with its own
  credentials. Nothing downstream changes (ingestor, TimescaleDB, quality rules, Grafana).
  The simulator stays for tests and local runs. The site gets a map of the real stations
  with their latest PM10 / PM2.5 and the age of each reading, refreshed every minute; the
  Grafana dashboards are public.
- **Batch, API**: already live (`/demo`, `/docs`). The API page gets an "Essayer" block that
  calls the live API from the browser with the demo key.
- **Lakehouse, warehouse**: phase 3 (below): interactive explorers on the site from small
  JSON exports of their gold tables / marts, refreshed by their scheduled jobs.
- Each project page on the site gets a "Démo en direct" section linking to its demo, with a
  status line (last data received) and a clear offline message if the VPS is down.

## Non-goals

- Simulated or replayed data in any public demo.
- Exposing the MQTT broker, Kafka, PostgreSQL or TimescaleDB to the internet.
- Real ESP32 hardware in the field.

## Anti-goals

- A demo that slows the owner's other tools on the shared VPS: every container gets a
  memory limit; total budget about 4 GB for both live stacks.
- Secrets (aisstream key, Géod'Air key, broker passwords) in Git, images or logs.
- A site page that breaks or spins forever when the VPS is down.

## Constraints

- VPS rules (`docs/vps.md` of the owner, see `horizon-kit`): no host port published, all
  HTTP through Traefik with Let's Encrypt, pinned images, every modifying command approved
  by the owner one by one, a new database added to the nightly backup script.
- Coolify project `portfolio`, one resource per stack, memory limits set in Coolify.
- Subdomains on `horizon-studio.dev` (OVH DNS, A record to the VPS):
  `ais.horizon-studio.dev` (Grafana + positions endpoint) and
  `capteurs.horizon-studio.dev` (Grafana + stations endpoint).
- Repository rules unchanged: tests never call aisstream, Géod'Air or the VPS; `make check`
  and integration tests before every commit; one PR per feature.

## Approaches

1. **The real stacks on the VPS, a live map on the site, public Grafana** (chosen): the
   demo shows the project itself running; about 4 GB on the KVM 4.
2. Same stacks, Grafana links only: less work, a weaker experience than a map on the site.
3. A light relay pushing the AIS feed straight to the browser: nearly free, but Kafka and
   Flink do not run, so it demos data, not the project (rejected).

Hosting: the owner's VPS, upgraded to KVM 4, over a second server — the owner wants all
tools and demos on one machine.

## Decided

- Approach 1, single VPS upgraded to KVM 4 (owner).
- Real data only; live movement for AIS and IoT (owner).
- IoT source: Géod'Air official hourly concentrations; aqicn.org (AQI indices, not µg/m³)
  only as a fallback if Géod'Air access fails.

## My calls (the owner can correct them)

- Phasing: **1** code and tests (IoT bridge, AIS positions endpoint, site live pages with an
  offline state), no VPS needed; **2** deployment on the VPS after the upgrade, command by
  command with the owner; **3** lakehouse and warehouse explorers.
- Map on the site: MapLibre GL with free OpenFreeMap tiles (no key), a client component
  only for the map; positions fetched from the stack's endpoint (CORS limited to the site's
  origins).
- The AIS endpoint is a small read-only FastAPI service in the AIS repository, reading the
  PostgreSQL results with a read-only role; the IoT endpoint a small read-only service in
  the sensor repository over TimescaleDB, same pattern.
- The bridge polls Géod'Air every 10 minutes and publishes only measurements newer than the
  last one sent per station (the ingestor's `on conflict do nothing` makes resends harmless).
- Station ids for real stations: `gp-<3 letters>-NN` / `mq-<3 letters>-NN` from the station
  name, listed in a versioned mapping file with the Géod'Air station code.

## Left to the builder

- The exact Géod'Air endpoints, parameters and key procedure (to confirm against its
  documentation), and the list of stations active in Guadeloupe and Martinique.
- The JSON shape of the two endpoints; the map styling within the site's tokens.
- Memory limits per container within the 4 GB budget.

## Amended (2026-11-20): the IoT source and the reviewer's questions

**IoT source, decided by the owner** (no ESP32, more movement than hourly air-quality
stations): the **automatic weather stations of Météo-France** in Guadeloupe, Martinique,
Saint-Barthélemy and Saint-Martin (96 stations listed by the DPObs v2 API), measured every
**6 minutes** and published about 8 minutes later. The bridge reads them with the "Package
Observations" API (all stations of a department in one call; 971 and 972 every 6 minutes,
well inside 100 requests a minute), authenticated with the owner's application id (OAuth2
client credentials, a token per hour). Each reading becomes `Telemetry` v1: temperature
(K → °C), humidity (%), pressure (Pa → hPa); stations without a sensor send nulls.
Official hourly PM10 / PM2.5 (Gwad'Air, Madininair via LCSQA or Géod'Air) come later, as a
second source of the same bridge. The real air-quality stations above are no longer the
first source.

**Reviewer's questions, settled (my calls):**

- The sensor stack may change downstream: a station registry (a versioned CSV of real
  stations: station id, Météo-France id, name, territory, coordinates, expected interval)
  seeds `stations` in the deployed database instead of the six simulated ones; a new column
  `expected_interval_s` drives the offline alert (no reading for 3 intervals), the
  `station_health` view and the quality rules' windows, so 6-minute stations raise no false
  alarm. Station ids keep the contract's pattern (`gp-abm-01`, `mq-fdf-01`, `bl-stb-01`,
  `mf-mar-01`).
- The bridge opens one MQTT session per station with that station's own credentials and
  last will, as a physical station would: the ACL stays `antilles/%u/...`.
- `seq` is the number of 6-minute intervals since the epoch for that reading, so a gap still
  counts missed readings.
- The owner's VPS document (`horizon-kit`, `infra/`) is the deployment reference; new
  databases join `/root/ops-backup/daily.sh` with a restore test; the document is updated
  after deployment (KVM 4, Padeloupe not in production, the new resources).
- Phase 3 (lakehouse and warehouse explorers) gets its own design later.
- Subdomains confirmed by the owner: `ais.horizon-studio.dev`, `capteurs.horizon-studio.dev`.
- Secrets: the Météo-France application id lives in the sensor repository's ignored
  `secrets/` locally and in Infisical / Coolify environment on the VPS; never printed.
