# ST-04: Step-Level Eval

## Objective

Add per-pipeline-step evaluation with golden cases, persist step run artifacts, and expose step scores alongside the end-to-end eval harness.

## Prerequisites

- ST-03 (E2E eval harness)
- ST-10 (async jobs write `pipeline_step_runs` during guided extraction)

## Inputs / References

- `app/eval/step_eval.py`, `app/eval/gold_step_cases.yaml`
- `app/models/step.py` — `StepRunRecord`
- `app/store/step_store.py`
- `db/schema.sql` — `pipeline_step_runs`, `eval_golden_cases` tables
- Today's work: step keys `resolve_information_points`, `extract_information_point`

## Deliverables

### Step model (`app/models/step.py`)

- `StepRunRecord` — `id`, `run_id`, `step_key`, `step_order`, `case_id`, `input_json`, `output_json`, `confidence`, `status`

### Golden cases

`app/eval/gold_step_cases.yaml` — per `step_key`:

```yaml
- id: gold_resolve_points_count
  step_key: resolve_information_points
  expected_keywords: ["product_delivery"]
  min_confidence: 0.95
```

`db/seed_eval_golden_cases.sql` — SQL seed mirroring YAML

### Eval logic (`app/eval/step_eval.py`)

- `score_step_runs(run_id) -> StepEvalResult`
- Match step outputs by `step_key` and optional `case_id` / `information_point_id`
- Keyword recall on `output_json` text + confidence threshold

### Storage

- `StepStore` — file-based under `output/{run_id}/steps/` (local dev)
- SQL table `pipeline_step_runs` when `STORE_BACKEND=sql|hybrid`

### API

- `GET /api/pipeline/runs/{run_id}/steps` — list step runs
- E2E eval or separate endpoint includes aggregated `step_score` (extend `EvalResult` or document in step eval response)

### Worker integration (`app/workers/job_executor.py`)

Record step runs at:

1. `resolve_information_points` — after loading catalog points for position
2. `extract_information_point` — one record per information point extracted

## Acceptance Criteria

- [ ] Guided pipeline run produces ≥ 1 `resolve_information_points` step record
- [ ] Guided pipeline produces 1 step record per information point extracted
- [ ] `gold_step_cases.yaml` has cases for each active `step_key`
- [ ] Step eval returns per-step pass/fail with messages
- [ ] `GET /api/pipeline/runs/{id}/steps` returns ordered step list
- [ ] SQL migration creates `pipeline_step_runs` and `eval_golden_cases` tables
- [ ] `python db/migrate.py` seeds golden cases

## Implementation Notes

- Step eval was added **after** async guided pipeline — step records are written inside `job_executor.execute_job`
- `case_id` on step runs maps to `information_point_id` for per-point golden cases
- Product_delivery transcript drove golden case keywords — update when adding positions (ST-14)
- File `StepStore` vs SQL: use same JSON shape for portability
- Step eval is **additive** — E2E eval (ST-03) still runs on final `ExtractionResult`

## Verification Steps

```bash
# Run guided pipeline (ST-09/10)
JOB=$(curl -s -X POST http://localhost:8788/api/pipeline/run-guided \
  -H 'Content-Type: application/json' -H 'X-User-Id: admin' \
  -d '{"position":"product_delivery","interviewee":"Narrator","interviewer":"Ops"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")

# Poll until completed (see ST-10)
curl -s "http://localhost:8788/api/jobs/$JOB" | python3 -m json.tool

RUN_ID=$(curl -s "http://localhost:8788/api/jobs/$JOB" | python3 -c "import sys,json; print(json.load(sys.stdin)['run_id'])")
curl -s "http://localhost:8788/api/pipeline/runs/$RUN_ID/steps" | python3 -m json.tool
```

## Out of Scope

- UI page dedicated only to step eval (EvalPage may show summary)
- Automated regression CI for step scores
