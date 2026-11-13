.PHONY: install lint typecheck test check run fixture transform freshness docs dagster up down clean

install:
	pip install -e ".[dev,orchestration]"

lint:
	ruff check .
	ruff format --check .

typecheck:
	mypy

test:
	pytest

check: lint typecheck test

run:
	antilles-pipeline run

fixture:
	python scripts/load_fixture.py data/antilles.duckdb

transform:
	cd transform && dbt build --profiles-dir .

freshness:
	cd transform && dbt source freshness --profiles-dir .

docs:
	cd transform && dbt docs generate --profiles-dir . --static
	@echo "Open transform/target/static_index.html in a browser"

dagster:
	dagster dev -m antilles_pipeline.orchestration.definitions

up:
	docker compose up --build -d
	@echo "Dagster UI on http://localhost:3070"

down:
	docker compose down

clean:
	rm -rf data transform/target transform/logs .pytest_cache .mypy_cache .ruff_cache .coverage
