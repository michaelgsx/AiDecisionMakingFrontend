# ST-02: Schema & Structured Extraction

## Objective

Define the `ExtractionResult` JSON schema with evidence-linked entities, implement a deterministic mock extractor grounded in the sample transcript, and expose `POST /api/pipeline/run` for synchronous full-transcript extraction.

## Prerequisites

- ST-01 (repo bootstrap, health, CORS)

## Inputs / References

- Take-home required entities: roles, process steps, decisions, open questions
- `data/sample_transcript.txt` — initially Eric Chu CTPO placeholder; later replaced with product_delivery narrative (ST-14 context)
- `app/models/schema.py`, `app/pipeline/mock_extractor.py` in sugarworkbackend

## Deliverables

### Schema (`app/models/schema.py`)

Pydantic models:

- `Evidence` — `quote`, optional `timestamp`
- `Role` — `id`, `name`, `responsibilities[]`, `evidence[]`
- `ProcessStep` — `id`, `order`, `name`, `actor_role_ids[]`, `inputs[]`, `outputs[]`, `evidence[]`
- `Decision` — `id`, `statement`, `status`, `alternatives[]`, `evidence[]`
- `OpenQuestion` — `id`, `question`, `related_role_ids[]`, `evidence[]`
- `Relationship` — `type`, `from_role_id`, `to_role_id`
- `ExtractionResult` — `metadata`, all entity arrays
- `PipelineRunRequest/Response`, `HealthResponse`, `SampleTranscriptResponse`

### Pipeline (`app/pipeline/`)

| Module | Role |
|--------|------|
| `mock_extractor.py` | Deterministic extraction from transcript keywords |
| `extractor.py` | `ExtractionPipeline` — mode switch mock / openai / azure_openai |
| `chunker.py` | Text chunking for LLM path (stub OK for mock-only milestone) |
| `normalize.py` | JSON cleanup for LLM output |

### Store (`app/store/runs.py`)

- `RunStore` — file-based `output/{run_id}/extraction.json`, `transcript.txt`, `eval.json`
- `new_run_id()` — 12-char hex

### API (`app/api/routes.py`)

| Endpoint | Behavior |
|----------|----------|
| `GET /api/transcript/sample` | Return `data/sample_transcript.txt` |
| `POST /api/pipeline/run` | Run extraction, persist, return `run_id` + `extraction` |
| `GET /api/pipeline/runs` | List run IDs |
| `GET /api/pipeline/runs/{id}` | Extraction + saved eval |

### Data

- `data/sample_transcript.txt` — interview text (≥ 2000 chars for realistic demo)

### Frontend pages (initial)

- `PipelinePage` — trigger sync run (evolves to guided in ST-09)
- `ExtractionPage` — browse roles, steps, decisions, questions by `runId`

## Acceptance Criteria

- [ ] `POST /api/pipeline/run` with `{}` uses sample transcript and returns `status: completed`
- [ ] Response `extraction` validates as `ExtractionResult` (≥ 3 roles, ≥ 5 process steps, ≥ 2 decisions, ≥ 2 open questions in mock mode)
- [ ] Every entity has at least one `evidence[]` entry with non-empty `quote`
- [ ] `process_steps[].order` is monotonically increasing starting at 1
- [ ] `GET /api/pipeline/runs/{id}` returns persisted extraction
- [ ] Frontend ExtractionPage renders all four entity types for a completed run
- [ ] `PIPELINE_MODE=mock` requires no API keys

## Implementation Notes

- **Stable IDs** (`role_ctpo`, `step_1`) — required for diagram generation and eval reference checks
- **Evidence on every claim** — powers faithfulness eval (ST-03); do not skip for mock
- Mock extractor should keyword-match the **current** sample transcript content — update when transcript changes
- `azure_openai` mode: fall back to mock if credentials missing (today's fix to avoid silent failures on App Service)
- `source_name` defaults to `"interview"`; stored in `metadata.source`

## Verification Steps

```bash
cd sugarworkbackend && source .venv/bin/activate
make dev  # or python -m app.main

curl -s -X POST http://localhost:8788/api/pipeline/run \
  -H 'Content-Type: application/json' -d '{}' | python3 -m json.tool

RUN_ID=<from response>
curl -s "http://localhost:8788/api/pipeline/runs/$RUN_ID" | python3 -c "
import sys,json; d=json.load(sys.stdin); e=d['extraction']
assert len(e['roles'])>=3; assert len(e['process_steps'])>=5
print('OK', d['run_id'])
"

# Frontend: http://localhost:5173/extraction/<RUN_ID>
```

## Out of Scope

- Guided per-information-point extraction (ST-09)
- Eval harness (ST-03)
- Azure OpenAI wiring details (optional enhancement within `extractor.py` — document in README)
