.PHONY: install lint typecheck test check run fixture transform freshness docs clean

install:
	pip install -e ".[dev,transform]"

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

clean:
	rm -rf data transform/target transform/logs .pytest_cache .mypy_cache .ruff_cache .coverage
