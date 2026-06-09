# ST-13: Azure SQL

## Objective

Define Azure SQL schema for pipeline runs, jobs, step runs, eval golden cases, and metadata tables; provide migration script and SQL seeds for information points, schema descriptions, and eval cases.

## Prerequisites

- ST-02 (pipeline_runs logical model)
- ST-10 (pipeline_jobs)
- ST-04 (pipeline_step_runs, eval_golden_cases)
- ST-08 (information_points seed data)

## Inputs / References

- Server: `sugarworkdbserver.database.windows.net`
- Database: `sugarworkdb`
- Key Vault secret: `sugarworkdb` (ADO.NET connection string)
- `db/schema.sql`, `db/migrate.py`, `db/seed_*.sql`
- `app/store/sql_store.py`, `app/store/hybrid_store.py`, `app/store/factory.py`

## Deliverables

### Tables (`db/schema.sql`)

| Table | Purpose |
|-------|---------|
| `pipeline_runs` | Run artifacts — JSON document columns |
| `app_users` | User roles (seed; runtime catalog still file-based) |
| `information_points` | Catalog mirror for SQL queries |
| `extraction_outputs` | Guided extraction rows |
| `pipeline_jobs` | Async job queue state |
| `schema_descriptions` | LLM SQL assistant metadata |
| `pipeline_step_runs` | Per-step execution records |
| `eval_golden_cases` | Step eval golden cases |

### Migration (`db/migrate.py`)

- Apply `schema.sql`
- Run seeds in order:
  - `seed_information_points.sql`
  - `seed_schema_descriptions.sql`
  - `seed_eval_golden_cases.sql`
- `make migrate` target

### Store backends (`app/store/`)

| Backend | Env | Behavior |
|---------|-----|----------|
| `file` | `STORE_BACKEND=file` | Default local |
| `sql` | `STORE_BACKEND=sql` + `AZURE_SQL_*` | SQL only |
| `hybrid` | both | Dual-write; read SQL first |

### Config (`app/config.py`)

- `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE`, `AZURE_SQL_USER`, `AZURE_SQL_PASSWORD`
- Or `AZURE_SQL_CONNECTION_STRING` (Key Vault on App Service)
- `sql_configured` property on settings

### README section

- ER diagram for `pipeline_runs`
- Document single-table + JSON column design rationale (中文 OK in column comments)
- Note: public network access may be disabled — App Service needs VNet integration

## Acceptance Criteria

- [ ] `python db/migrate.py` creates all tables without error (against accessible SQL instance)
- [ ] `seed_information_points.sql` inserts product_delivery points (≥ 10 rows)
- [ ] `seed_eval_golden_cases.sql` mirrors `gold_step_cases.yaml`
- [ ] `seed_schema_descriptions.sql` documents all tables and columns
- [ ] `STORE_BACKEND=sql` persists pipeline run; `GET /api/pipeline/runs/{id}` retrieves it
- [ ] `STORE_BACKEND=hybrid` writes both file and SQL
- [ ] `GET /health` reports `store_backend` and `azure_sql: true` when configured
- [ ] Catalog API still uses **file store** when `CATALOG_BACKEND=file` (default)

## Implementation Notes

- **Hybrid architecture:** runs/jobs in SQL; catalog remains `data/catalog/*.json` (today's decision)
- `pipeline_runs.extraction_json` stores full `ExtractionResult` — avoid premature normalization
- `schema_descriptions` added for future LLM SQL tool — seed is verbose by design
- SQL server has **public access disabled** in today's Azure — migrate from dev machine with firewall rule or use file backend in production until VNet fixed
- `migrate.py` uses `pyodbc` or `pymssql` — document in requirements.txt

## Verification Steps

```bash
export AZURE_SQL_SERVER=sugarworkdbserver.database.windows.net
export AZURE_SQL_DATABASE=sugarworkdb
export AZURE_SQL_USER=<admin>
export AZURE_SQL_PASSWORD=<password>

cd sugarworkbackend && source .venv/bin/activate
python db/migrate.py

# Run with SQL backend
STORE_BACKEND=hybrid python -m app.main &
curl -s -X POST http://localhost:8788/api/pipeline/run -H 'Content-Type: application/json' -d '{}'
curl -s http://localhost:8788/health | python3 -m json.tool
```

## Out of Scope

- Normalized entity tables (roles, steps as separate SQL tables)
- Flyway/Liquibase migration framework
- Automatic catalog sync from file to SQL
