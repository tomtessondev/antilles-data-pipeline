.PHONY: install lint typecheck test check run fixture transform docs clean

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

docs:
	cd transform && dbt docs generate --profiles-dir .

clean:
	rm -rf data transform/target transform/logs .pytest_cache .mypy_cache .ruff_cache .coverage
