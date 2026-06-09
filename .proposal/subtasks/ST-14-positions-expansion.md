# ST-14: Positions Expansion

## Objective

Expand the positions catalog beyond `product_delivery`: add `software_engineer`, `hr`, and other roles to the frontend dropdown, with seeded information points per position generated from transcript themes (or sensible defaults).

## Prerequisites

- ST-08 (information points catalog API)
- ST-09 (guided pipeline uses position)
- ST-02 (sample transcript — may use Eric Chu themes for SWE/HR, product_delivery for handoff transcript)

## Inputs / References

- User request (today): "前端下拉菜单没有position，你自己加几个进去。比如software engineer，hr"
- Earlier seeds had `software_engineer` + `hr` (2 points each: `ip_se_onboarding`, etc.) before product_delivery pivot
- Current `information_points.json` has only `product_delivery` (14 points) — this subtask restores multi-position
- `QuestionEditPage.tsx` default form position: `software_engineer`
- `db/seed_information_points.sql`, `seed_schema_descriptions.sql` allowed_values

## Deliverables

### Information points (`data/catalog/information_points.json`)

Minimum positions and point counts:

| Position | Points | Theme |
|----------|--------|-------|
| `product_delivery` | ≥ 10 | Handoff/refund transcript (existing) |
| `software_engineer` | ≥ 4 | Onboarding, code review, incident response, tech debt |
| `hr` | ≥ 4 | Hiring funnel, onboarding checklist, performance review, policy FAQ |

Use snake_case position IDs: `software_engineer`, `hr`, `product_delivery`

### SQL seed sync

- Update `db/seed_information_points.sql` with all positions
- Update `seed_schema_descriptions.sql` `allowed_values` to list all positions

### Optional: transcript-derived generation

If insufficient domain content in main transcript for SWE/HR:

- Add `extract_positions` pipeline step (document in implementation notes) OR
- Generate points from Eric Chu CTPO transcript themes (product/engineering org) as secondary source
- Do **not** block delivery — static seeds are acceptable

### Frontend

- `PipelinePage.tsx` — position dropdown shows all positions from `GET /api/positions`
- `QuestionEditPage.tsx` — position field accepts all position values
- Empty state message if position has no points

### Mock guided extractor

- Per-position keyword sets in `guided_extractor.py` / `mock_extractor.py` so demo outputs are non-empty for SWE/HR

## Acceptance Criteria

- [ ] `GET /api/positions` returns `["hr", "product_delivery", "software_engineer"]` (sorted)
- [ ] Each position has ≥ 4 information points in catalog
- [ ] Frontend dropdown lists all three positions
- [ ] Guided pipeline run for `software_engineer` completes with ≥ 4 extraction outputs
- [ ] Guided pipeline run for `hr` completes with ≥ 4 extraction outputs
- [ ] `product_delivery` guided run still works (regression)
- [ ] SQL seed matches file catalog positions
- [ ] Admin can create new point for any position via QuestionEditPage

## Implementation Notes

- This was today's **latest ask** — background agent task to add positions
- Position list is **derived from catalog data** (`list_positions()`), not hardcoded in frontend
- When only product_delivery existed, dropdown appeared empty/broken — root cause was overwrites during transcript pivot
- SWE/HR points can reference Eric Chu interview themes (CTPO, engineering, hiring) even if main demo transcript is product_delivery
- Consider keeping **two sample transcripts** internally: `sample_transcript.txt` (product_delivery) + optional `eric_chu_transcript.txt` for SWE/HR mock keywords
- Update `gold_checklist.yaml` only for primary demo transcript — step eval golden cases per position optional

## Verification Steps

```bash
curl -s http://localhost:8788/api/positions | python3 -m json.tool

for POS in software_engineer hr product_delivery; do
  COUNT=$(curl -s -H 'X-User-Id: admin' "http://localhost:8788/api/information-points?position=$POS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
  echo "$POS: $COUNT points"
done

# Guided run per position (poll job)
# Frontend: verify dropdown has 3+ options
```

## Out of Scope

- Dynamic LLM generation of information points on every deploy
- Position extractor as mandatory pipeline step (optional fallback only)
- Non-English position labels in API (use snake_case keys; display names in UI OK)
