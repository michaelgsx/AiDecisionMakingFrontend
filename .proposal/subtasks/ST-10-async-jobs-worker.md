# ST-10: Async Jobs & Worker

## Objective

Implement async job infrastructure: 202 enqueue pattern, file/SQL job store, in-process worker with revival thread, job polling API, and frontend `useJobPolling` + `JobStatusPanel`.

## Prerequisites

- ST-09 (guided pipeline enqueues jobs)
- ST-03 (eval endpoint converted to async 202)

## Inputs / References

- `app/store/job_store.py`, `app/models/job.py`
- `app/workers/job_runner.py`, `app/workers/job_executor.py`
- `app/api/job_routes.py`
- `app/main.py` lifespan — `start_job_workers()` / `stop_job_workers()`
- `src/hooks/useJobPolling.ts`, `src/components/JobStatusPanel.tsx`
- `db/schema.sql` — `pipeline_jobs` table

## Deliverables

### Job model (`app/models/job.py`)

- `JobRecord` — `job_id`, `run_id`, `job_type`, `status`, `step`, `progress`, `request_json`, `error`, `attempt_count`, timestamps
- `JobEnqueueResponse`, `JobStatusResponse`
- Job types: `guided_extraction`, `eval`

### Job store (`app/store/job_store.py`)

File-based under `output/jobs/` (or configured `jobs_dir`):

- `create_job(job_type, run_id, request_json)`
- `get_job(job_id)`, `claim_next_pending(worker_id)`, `update_job(...)`
- Status flow: `pending` → `running` → `completed` | `failed`
- Heartbeat / stale job revival support

### Worker (`app/workers/job_runner.py`)

- Background thread started in FastAPI lifespan
- Poll interval ~2s; `claim_next_pending`
- **Revival thread** — reclaim stale `running` jobs after timeout
- `worker_id` = hostname + random suffix

### Executor (`app/workers/job_executor.py`)

- `execute_job(settings, job, job_store, store, catalog)` dispatch:
  - `guided_extraction` → guided pipeline steps
  - `eval` → `run_eval()` + `store.save_eval()`

### API

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| POST | `/api/pipeline/run-guided` | 202 | Enqueue guided extraction |
| POST | `/api/eval/run/{run_id}` | 202 | Enqueue eval |
| GET | `/api/jobs/{job_id}` | 200 | Poll status |

### Frontend

- `useJobPolling.ts` — interval poll until `completed` | `failed`
- `JobStatusPanel.tsx` — step name, progress bar, error display
- `PipelinePage.tsx` + `EvalPage.tsx` — integrate polling after enqueue

### SQL (optional, ST-13)

`pipeline_jobs` table mirrors file store for hybrid deployments

## Acceptance Criteria

- [ ] Guided pipeline returns 202; does not block until extraction finishes
- [ ] `GET /api/jobs/{id}` shows progressing `step` and `progress` (0–100)
- [ ] Completed job has `status: completed`, `progress: 100`
- [ ] Failed job has `status: failed` and `error` message
- [ ] Eval via 202 completes and persists eval JSON on run
- [ ] Worker starts automatically with `python -m app.main` (lifespan)
- [ ] Revival thread recovers job stuck in `running` after worker crash (simulated by stale timestamp)
- [ ] Frontend JobStatusPanel updates without manual refresh
- [ ] Multiple concurrent job enqueues process sequentially (single worker OK)

## Implementation Notes

- Async pattern chosen today to handle **long LLM extraction** without HTTP timeout
- Single gunicorn worker (`-w 1`) on App Service — in-process threading is sufficient for take-home
- Gunicorn timeout 300s in `startup.sh` — jobs should complete within worker thread, not request thread
- `claim_next_pending` must be atomic (file lock or SQL `UPDLOCK`) to prevent double execution
- Eval was changed from sync POST to 202 during this work — update frontend EvalPage accordingly
- Job store path: `output/jobs/{job_id}.json`

## Verification Steps

```bash
# Guided job
RESP=$(curl -s -X POST http://localhost:8788/api/pipeline/run-guided \
  -H 'Content-Type: application/json' -H 'X-User-Id: admin' \
  -d '{"position":"product_delivery","interviewee":"A","interviewer":"B"}')
JOB_ID=$(echo $RESP | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")

for i in $(seq 1 20); do
  STATUS=$(curl -s "http://localhost:8788/api/jobs/$JOB_ID" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "attempt $i: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done

# Eval job
RUN_ID=$(curl -s "http://localhost:8788/api/jobs/$JOB_ID" | python3 -c "import sys,json; print(json.load(sys.stdin)['run_id'])")
curl -s -X POST "http://localhost:8788/api/eval/run/$RUN_ID" -w "\nHTTP %{http_code}\n"
# Expect 202
```

## Out of Scope

- Celery / Azure Service Bus / Redis queue
- Horizontal worker scaling
- WebSocket progress push
