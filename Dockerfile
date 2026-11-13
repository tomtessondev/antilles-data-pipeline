FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ANTILLES_DB_PATH=/data/antilles.duckdb

COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir .

VOLUME ["/data"]
ENTRYPOINT ["antilles-pipeline"]
CMD ["run"]
