# Sugarwork Take-Home — Proposal Index

Executable subtask documents for auto-building the Sugarwork knowledge extraction pipeline from today's implementation sequence.

**Master spec:** [PROJECT_REQUEST.md](./PROJECT_REQUEST.md)

---

## Subtask catalog

| ID | Title | One-line description |
|----|-------|----------------------|
| [ST-01](./subtasks/ST-01-repo-bootstrap.md) | Repo Bootstrap | Scaffold backend + frontend, health, CORS, mock mode |
| [ST-02](./subtasks/ST-02-schema-structured-extraction.md) | Schema & Structured Extraction | ExtractionResult JSON, mock extractor, pipeline run API |
| [ST-03](./subtasks/ST-03-eval-harness-e2e.md) | Eval Harness E2E | Faithfulness, coverage, structural correctness, gold_checklist |
| [ST-04](./subtasks/ST-04-step-level-eval.md) | Step-Level Eval | pipeline_step_runs, gold_step_cases, per-step step_score |
| [ST-05](./subtasks/ST-05-synthesis-report.md) | Synthesis Report | generator.py, 3 Mermaid diagrams, RACI, gaps, ReportPage |
| [ST-06](./subtasks/ST-06-analysis-writeup.md) | Analysis Write-Up | README §4: failure modes, experiments, fine-tune vs prompt |
| [ST-07](./subtasks/ST-07-role-based-ui.md) | Role-Based UI | UserContext, admin vs interviewer, CRUD restrictions |
| [ST-08](./subtasks/ST-08-information-points-catalog.md) | Information Points Catalog | Positions, CRUD API, QuestionEditPage, seeds |
| [ST-09](./subtasks/ST-09-guided-extraction-pipeline.md) | Guided Extraction Pipeline | Position-based async job, extraction_outputs, polling |
| [ST-10](./subtasks/ST-10-async-jobs-worker.md) | Async Jobs & Worker | job_store, job_executor, revival worker, JobStatusPanel |
| [ST-11](./subtasks/ST-11-azure-deploy-backend.md) | Azure Deploy Backend | App Service, .python_packages, startup.sh, CI fixes |
| [ST-12](./subtasks/ST-12-azure-deploy-frontend.md) | Azure Deploy Frontend | SWA, Key Vault token, VITE_API_BASE_URL |
| [ST-13](./subtasks/ST-13-azure-sql.md) | Azure SQL | schema.sql, migrate.py, seeds |
| [ST-14](./subtasks/ST-14-positions-expansion.md) | Positions Expansion | software_engineer, hr, product_delivery info points |
| [ST-15](./subtasks/ST-15-production-hardening.md) | Production Hardening | Health probe fix, ops token, deploy verification |

---

## Suggested execution order

### Sequential critical path

```
ST-01 → ST-02 → ST-03 → ST-10 → ST-05 → ST-06 → ST-11/ST-12 → ST-15
```

### Full ordered list (respecting dependencies)

1. **ST-01** — Bootstrap both repos on `v1`
2. **ST-02** — Core extraction schema + mock pipeline
3. **ST-07** — User context + role header (can start after ST-01 frontend scaffold)
4. **ST-08** — Information points catalog + QuestionEditPage
5. **ST-03** — End-to-end eval harness
6. **ST-09** — Guided extraction (position + info points)
7. **ST-10** — Async job infrastructure (worker, polling UI)
8. **ST-04** — Step-level eval (after jobs write step runs)
9. **ST-05** — Enhanced synthesis report + ReportPage
10. **ST-06** — Analysis write-up in README
11. **ST-13** — Azure SQL schema + seeds
12. **ST-14** — Expand positions (software_engineer, hr, product_delivery)
13. **ST-11** — Deploy backend to App Service
14. **ST-12** — Deploy frontend to SWA
15. **ST-15** — Production hardening + E2E verification

### Parallelization hints

| Can run in parallel | After completing |
|---------------------|------------------|
| ST-07 + ST-02 | ST-01 |
| ST-03 + ST-05 + ST-08 | ST-02 |
| ST-11 + ST-12 + ST-13 | ST-02 (API stable) |
| ST-14 | ST-08 + ST-09 |

---

## How to execute (agent or engineer)

### Per subtask

1. Read [PROJECT_REQUEST.md](./PROJECT_REQUEST.md) for context
2. Open the subtask file (e.g. `subtasks/ST-02-*.md`)
3. Verify **Prerequisites** are satisfied
4. Implement **Deliverables** exactly as listed
5. Run **Verification Steps** — all acceptance criteria must pass
6. Do not implement **Out of Scope** items

### Workspace paths

| Repo | Path | Branch |
|------|------|--------|
| Backend | `/Users/songxianggu/Project/sugarworkbackend` | `v1` |
| Frontend | `/Users/songxianggu/Project/sugarworkfrontend` | `v1` |
| Proposal (this dir) | `/Users/songxianggu/Project/AiDecisionMakingFrontend/.proposal` | — |

### Local smoke test (after ST-10)

```bash
# Terminal 1 — backend
cd sugarworkbackend && source .venv/bin/activate && python -m app.main

# Terminal 2 — frontend
cd sugarworkfrontend && npm run dev

# Terminal 3 — API smoke
curl -s http://localhost:8788/health | python3 -m json.tool
curl -s -X POST http://localhost:8788/api/pipeline/run -H 'Content-Type: application/json' -d '{}' | python3 -m json.tool
```

### Agent handoff notes

- Default pipeline mode is **`mock`** — no API keys required for CI/demo
- Catalog is **file-based** (`data/catalog/`) even when SQL store is enabled
- Guided pipeline is the **primary UI flow** on PipelinePage (not legacy sync `/api/pipeline/run`)
- Sample transcript was **replaced** with product_delivery handoff/refund narrative (not Eric Chu CTPO)
- Azure health checks must work **without** Bearer token when `OPS_TOKEN` is set — see ST-15
