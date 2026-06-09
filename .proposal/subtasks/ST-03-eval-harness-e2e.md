# ST-03: Eval Harness E2E

## Objective

Implement a runnable eval harness that scores extraction quality on three dimensions — structural correctness, faithfulness, and coverage — with actionable `failures[]` output, exposed via API and wired to a frontend Eval page.

## Prerequisites

- ST-02 (ExtractionResult schema, pipeline runs persisted with transcript)

## Inputs / References

- Take-home eval requirements: faithfulness, coverage, structural correctness
- `app/eval/harness.py`, `app/eval/gold_checklist.yaml`
- Initially gold checklist targeted Eric Chu CTPO keywords; update when transcript pivots to product_delivery

## Deliverables

### Backend

| File | Purpose |
|------|---------|
| `app/eval/harness.py` | `run_eval(extraction, transcript) -> EvalResult` |
| `app/eval/gold_checklist.yaml` | 15 curated keyword-recall items (roles, steps, decisions, questions) |
| `app/models/schema.py` | `EvalResult`, `EvalMetric`, `EvalFailure` models |

### Metrics

| Metric | Implementation |
|--------|----------------|
| **structural_correctness** | Pydantic re-validation, monotonic step order, valid `actor_role_ids` references |
| **faithfulness** | Evidence quotes: substring match + ~60% keyword overlap against transcript |
| **coverage** | Keyword recall vs `gold_checklist.yaml` items |

### API

- `POST /api/eval/run/{run_id}` — initially synchronous; becomes async 202 in ST-10
- Persists `eval.json` via `RunStore.save_eval`
- `GET /api/pipeline/runs/{id}` includes saved eval

### Frontend

- `EvalPage` / `EvalHubPage` — score cards, failure list with evidence quotes
- `EvalResults.tsx` component

## Acceptance Criteria

- [ ] Mock-mode pipeline run achieves `overall_score >= 0.95` on sample transcript
- [ ] Each metric returns `score`, `passed`, `total`, `details`
- [ ] `failures[]` includes `field`, `item_id`, `message`, `evidence_quote` when checks fail
- [ ] Injecting a hallucinated evidence quote (manual test) produces faithfulness failure
- [ ] `gold_checklist.yaml` has ≥ 15 items covering roles, process, decisions, open questions
- [ ] Frontend displays three metric cards and expandable failure details
- [ ] `make eval RUN_ID=<id>` or curl recipe documented in README

## Implementation Notes

- Gold checklist uses **keyword proxies** — not hand-labeled spans; document this limitation in ST-06
- When transcript switched from Eric Chu → product_delivery, **update gold_checklist keywords** (sponsor, refund, promo code, handoff, etc.) or coverage will false-negative
- Faithfulness 60% word overlap causes false positives — note in analysis write-up
- Structural eval should fail fast on invalid JSON before LLM-specific checks
- Eval becomes async in ST-10 — design `EvalResult` persistence first so migration is trivial

## Verification Steps

```bash
RUN_ID=$(curl -s -X POST http://localhost:8788/api/pipeline/run -H 'Content-Type: application/json' -d '{}' | python3 -c "import sys,json; print(json.load(sys.stdin)['run_id'])")

# Sync eval (ST-03); after ST-10 use job polling instead
curl -s -X POST "http://localhost:8788/api/eval/run/$RUN_ID" | python3 -m json.tool

curl -s "http://localhost:8788/api/pipeline/runs/$RUN_ID" | python3 -c "
import sys,json; d=json.load(sys.stdin); e=d['eval']
print('overall', e['overall_score'])
for m in e['metrics']: print(m['name'], m['passed'], '/', m['total'])
"

# Frontend: http://localhost:5173/eval/<RUN_ID>
```

## Out of Scope

- Per-step eval (ST-04)
- LLM-as-judge for coverage
- NLI-based faithfulness
