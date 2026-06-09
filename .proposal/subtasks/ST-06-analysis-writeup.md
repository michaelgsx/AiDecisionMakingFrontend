# ST-06: Analysis Write-Up

## Objective

Add take-home deliverable #4 — a written analysis of failure modes, proposed experiments, and fine-tuning vs prompt engineering tradeoffs — as a dedicated README section in `sugarworkbackend`.

## Prerequisites

- ST-03 (eval harness operational — analysis references real metric behavior)
- ST-02 (pipeline modes documented)

## Inputs / References

- Take-home §4: "Analysis write-up" in README
- Today's README section: `## Analysis write-up` in sugarworkbackend README
- Observed failures during build: hallucinated roles, chunk dedup, faithfulness false positives, Azure deploy issues

## Deliverables

### `sugarworkbackend/README.md` section: `## Analysis write-up`

Subsections:

1. **Failure modes observed** — table with Failure | Cause | Mitigation in this repo
2. **What to do next** — numbered experiment list (chunk size, merge pass, NLI faithfulness, expand gold set, human review loop)
3. **Fine-tuning vs prompt engineering vs eval data** — comparison table with recommendation

### Minimum failure modes to document

| Failure | Cause | Mitigation |
|---------|-------|------------|
| Hallucinated roles | LLM infers unspoken titles | Evidence-required schema; faithfulness eval; mock baseline |
| Wrong step order | Non-linear interview | `order` field + structural check |
| Duplicate entities across chunks | Chunk boundaries | Per-chunk extract + merge (OpenAI path) |
| Coverage false negatives | Keyword-based gold checklist | Tune keywords; LLM-as-judge future work |
| Faithfulness false positives | Fuzzy 60% word overlap | Tighten matching; NLI model |
| Handoff knowledge loss | product_delivery transcript theme | Guided per-point extraction |

### `## AI tools used` section

Document Cursor, OpenAI API, Pydantic — no fine-tuned models.

## Acceptance Criteria

- [ ] README contains `## Analysis write-up` with all three subsections
- [ ] ≥ 5 failure modes listed with concrete mitigations tied to repo features
- [ ] ≥ 4 proposed experiments with measurable outcomes
- [ ] Fine-tune vs prompt table recommends prompt engineering first, eval data second, fine-tuning later
- [ ] References actual files: `gold_checklist.yaml`, `mock_extractor.py`, `harness.py`
- [ ] Mentions transcript pivot (Eric Chu → product_delivery) if it affects eval/coverage strategy

## Implementation Notes

- This was added **late in today's session** after core pipeline was working — content should reflect **actual** observed behavior, not generic LLM blog post
- Chinese context OK in adjacent sections (e.g. SQL schema comments) but analysis write-up should be **English** per take-home expectations
- Link analysis to rubric: shows reviewer you understand failure modes beyond happy-path demo
- Include honest note that gold checklist is keyword-proxy, not human-labeled

## Verification Steps

```bash
cd sugarworkbackend
grep -n "## Analysis write-up" README.md
grep -n "Failure modes" README.md
grep -n "Fine-tuning" README.md

# Manual review: each failure mode maps to a real code path
```

## Out of Scope

- Separate PDF or Notion doc
- Running the proposed experiments (document only)
- Academic literature review
