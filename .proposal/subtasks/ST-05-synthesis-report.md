# ST-05: Synthesis Report

## Objective

Generate a stakeholder-ready synthesis report from structured extraction JSON (not free-form LLM prose), including Markdown sections, RACI table, and three Mermaid diagrams; render in frontend ReportPage.

## Prerequisites

- ST-02 (ExtractionResult available per run)
- ST-09 (guided `extraction_outputs` — report integrates these when present)
- ST-03 (eval results — report shows gaps section when eval exists)

## Inputs / References

- Take-home deliverable #3: synthesis report + process diagram
- `app/report/generator.py` — evolved from partial RACI-only to full dynamic report today
- `ReportPage.tsx`, `ReportHubPage.tsx`

## Deliverables

### Backend (`app/report/generator.py`)

Functions:

| Function | Output |
|----------|--------|
| `build_process_mermaid(extraction)` | `flowchart TD` — ordered process steps |
| `build_concept_map_mermaid(extraction)` | `flowchart LR` — roles + relationships |
| `build_responsibility_mermaid(extraction)` | RACI-style responsibility diagram |
| `generate_report_markdown(extraction, outputs?, eval_result?)` | Full Markdown string |

### Markdown sections

1. Executive summary (dynamic — role count, step count, decision/question counts)
2. Roles & responsibilities
3. RACI table (roles × process steps)
4. Process overview (narrative from steps)
5. Decisions (decided vs deferred)
6. Open questions
7. **Guided extraction outputs** table (when `outputs[]` provided) — name, content snippet, confidence
8. **Eval gaps** — low-confidence outputs + eval failures summary
9. Knowledge gaps / recommended follow-ups

### API

`GET /api/report/{run_id}` returns:

```json
{
  "run_id": "...",
  "markdown": "...",
  "mermaid_diagram": "<process>",
  "concept_map_diagram": "<concept>",
  "responsibility_diagram": "<raci>"
}
```

### Frontend

- `ReportPage.tsx` — react-markdown for body, mermaid.js for three diagrams
- Tab or section toggles for each diagram type

## Acceptance Criteria

- [ ] Report generates without LLM call — pure deterministic template from JSON
- [ ] Process Mermaid has nodes for every `process_step` linked in `order` sequence
- [ ] Concept map includes all roles and ≥ 1 relationship edge (or collaboration fallback)
- [ ] RACI table has header row and ≥ 1 data row when roles and steps exist
- [ ] Guided outputs section appears when `extraction_outputs` exist for run
- [ ] Eval gaps section lists failures when eval was run
- [ ] Frontend renders Markdown + all three diagrams without console errors
- [ ] Diagrams update when re-running extraction on same run_id pattern (new run)

## Implementation Notes

- **Critical decision:** report is template-driven, not LLM-generated — keeps diagrams in sync with extraction
- Report was **partial early in the day** (RACI + single diagram only); today's enhancement added dynamic summary, concept map, responsibility diagram, guided outputs, eval gaps
- `_sanitize_id()` for Mermaid node IDs — alphanumeric only
- Low-confidence guided outputs (< 70%) should appear in gaps section
- `GET /api/report/{id}` loads outputs via `catalog.list_outputs(run_id)`

## Verification Steps

```bash
RUN_ID=<completed run>
curl -s "http://localhost:8788/api/report/$RUN_ID" | python3 -c "
import sys,json; r=json.load(sys.stdin)
assert 'markdown' in r and 'mermaid_diagram' in r
assert 'concept_map_diagram' in r and 'responsibility_diagram' in r
assert '##' in r['markdown']
print('sections OK', len(r['markdown']))
"

# Frontend: http://localhost:5173/report/<RUN_ID>
```

## Out of Scope

- PDF export
- Wardley maps or non-Mermaid diagram types
- LLM-written executive narrative
