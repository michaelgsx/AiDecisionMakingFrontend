# ST-09: Guided Extraction Pipeline

## Objective

Implement position-based guided extraction: select information points for a job role, run per-point extraction against a transcript, persist rows to `extraction_outputs`, and aggregate into `ExtractionResult` on the run.

## Prerequisites

- ST-02 (ExtractionPipeline, RunStore, ExtractionResult)
- ST-08 (information points catalog, positions API)
- ST-10 (async job execution — endpoint returns 202; worker runs extraction)

## Inputs / References

- `app/pipeline/guided_extractor.py`
- `app/workers/job_executor.py` — guided_extraction job type
- `POST /api/pipeline/run-guided` in `catalog_routes.py`
- `PipelinePage.tsx` — primary UI flow (position dropdown, point checkboxes, interviewee/interviewer fields)
- Sample transcript: product_delivery handoff/refund narrative

## Deliverables

### Models

- `GuidedPipelineRunRequest` — `position`, `transcript?`, `source_name?`, `interviewee`, `interviewer`, `information_point_ids?`
- `GuidedPipelineRunResponse` — `job_id`, `run_id`, `status`, `step`, `progress`, `error?`
- `ExtractionOutputRow` — `id`, `run_id`, `interviewee`, `interviewer`, `position`, `information_point_id`, `information_point_name`, `extracted_content`, `confidence`, `meta_json?`

### Pipeline (`app/pipeline/guided_extractor.py`)

- `extract_for_point(transcript, point, mode) -> (content, confidence)`
- Mock mode: keyword/heuristic extraction per point `content` field
- LLM mode: prompt with point `description` + transcript chunk

### Catalog store methods

- `save_output(row)`, `list_outputs(run_id)`, `clear_outputs(run_id)` in `catalog_file.py`

### API

`POST /api/pipeline/run-guided` (202):

1. Resolve transcript (body or sample)
2. Load information points for `position` (filter by `information_point_ids` if provided)
3. Allocate `run_id`, create `guided_extraction` job
4. Return `job_id` + `run_id` immediately

`GET /api/extraction-outputs/{run_id}` — table data for OutputsPage

### Worker steps (in `job_executor`)

1. `loading_information_points` (10%)
2. `resolve_information_points` — validate point list
3. Per point: `extract_information_point` — save `ExtractionOutputRow`
4. Aggregate outputs → `ExtractionResult` via `store.save_extraction`
5. `completed` (100%)

### Frontend

- `PipelinePage.tsx` — position select, point checkboxes, guided run button
- `OutputsPage.tsx` — extraction outputs table
- `RunActions.tsx` — links to extraction/eval/report for run

## Acceptance Criteria

- [ ] `POST /api/pipeline/run-guided` returns 202 with `job_id` and `run_id`
- [ ] Empty point list for position returns error before job creation
- [ ] After job completes, `GET /api/extraction-outputs/{run_id}` returns 1 row per selected point
- [ ] Each output has `confidence` in [0, 1] and non-empty `extracted_content`
- [ ] `GET /api/pipeline/runs/{run_id}` returns aggregated `ExtractionResult`
- [ ] Mock mode completes without API keys
- [ ] Frontend PipelinePage shows position dropdown populated from `GET /api/positions`
- [ ] Default selects all points for chosen position

## Implementation Notes

- Guided pipeline became the **primary demo path** — sync `POST /api/pipeline/run` retained for take-home baseline
- Transcript pivot: Eric Chu CTPO → **product_delivery** refund/handoff story; mock extractor keywords must align
- `interviewee` / `interviewer` stored on each output row for table display
- If `information_point_ids` empty, use **all** points for position
- Per-point confidence in mock: higher when keywords from `point.content` appear in transcript
- Job execution details in ST-10

## Verification Steps

```bash
curl -s -X POST http://localhost:8788/api/pipeline/run-guided \
  -H 'Content-Type: application/json' -H 'X-User-Id: admin' \
  -d '{
    "position": "product_delivery",
    "interviewee": "Delivery Lead",
    "interviewer": "Analyst",
    "information_point_ids": ["ip_pd_refund_sponsor_req", "ip_pd_refund_ticket_gap"]
  }' | python3 -m json.tool

# Poll job (ST-10), then:
curl -s "http://localhost:8788/api/extraction-outputs/$RUN_ID" | python3 -m json.tool

# Frontend: run from Pipeline page, view Outputs
```

## Out of Scope

- Real-time SSE progress stream (polling only)
- Multi-transcript batch runs
- Auto-generate information points from transcript (ST-14 fallback)
