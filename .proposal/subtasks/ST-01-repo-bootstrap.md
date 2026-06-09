# ST-01: Repo Bootstrap

## Objective

Initialize `sugarworkbackend` and `sugarworkfrontend` on branch `v1` with runnable scaffolds: FastAPI health endpoint, CORS for local dev, React SPA shell, and mock-mode configuration so the stack starts without API keys.

## Prerequisites

- Empty GitHub repos `sugarworkbackend` and `sugarworkfrontend` with `v1` branches (may contain only LICENSE + placeholder README + SWA workflow stubs)
- Python 3.11+, Node 20+

## Inputs / References

- Take-home discussion: separate Python backend repo + React frontend (not AiDecisionMakingFrontend)
- Existing SWA workflow stub: `azure-static-web-apps-victorious-river-036ce571e.yml`
- Today's session: initial scaffold was built, reverted once, then rebuilt on existing repos

## Deliverables

### Backend (`sugarworkbackend`)

| File / artifact | Purpose |
|-----------------|---------|
| `requirements.txt` | fastapi, uvicorn, pydantic, pydantic-settings, openai, httpx, PyYAML |
| `app/main.py` | FastAPI app + CORS middleware |
| `app/config.py` | Settings: PORT, CORS_ORIGINS, PIPELINE_MODE, OPS_TOKEN |
| `app/api/routes.py` | `GET /health` |
| `app/api/deps.py` | `verify_ops_token` (optional Bearer gate) |
| `.env.example` | Document all env vars |
| `Makefile` | `dev`, `pipeline` targets |
| `output/.gitkeep` | Run artifact directory |

### Frontend (`sugarworkfrontend`)

| File / artifact | Purpose |
|-----------------|---------|
| `package.json` | Vite + React 19 + react-router-dom |
| `src/main.tsx`, `src/App.tsx` | Router shell with nav links |
| `src/api/client.ts` | `fetchHealth()`, base URL from env |
| `src/vite-env.d.ts` | `VITE_API_BASE_URL`, `VITE_OPS_TOKEN`, `VITE_USE_MOCK` |
| `.env.example` | Local defaults |

## Acceptance Criteria

- [ ] `python -m app.main` starts on port 8788 (or `PORT` env)
- [ ] `GET /health` returns JSON with `ok: true` and `mode` field
- [ ] CORS allows `http://localhost:5173`
- [ ] `npm run dev` serves frontend at port 5173
- [ ] Frontend displays backend health status (mode) on home page
- [ ] `PIPELINE_MODE=mock` is default in `.env.example`
- [ ] `VITE_USE_MOCK=true` allows frontend to load without backend (offline demo path)
- [ ] Both repos on branch `v1`

## Implementation Notes

- Port **8788** chosen to avoid collision with other local services (8787, 8790 used during today's debugging)
- `verify_ops_token` should be a no-op when `OPS_TOKEN` is empty — critical for local dev and Azure health probes (see ST-15)
- Frontend styling: dark theme with DM Sans / JetBrains Mono (established early, keep consistent)
- Do **not** put application code in `AiDecisionMakingFrontend` — that repo is a separate project

## Verification Steps

```bash
# Backend
cd sugarworkbackend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.main &
curl -s http://localhost:8788/health | python3 -m json.tool

# Frontend
cd sugarworkfrontend
npm ci && cp .env.example .env
npm run dev &
# Open http://localhost:5173 — health line should show backend mode
```

## Out of Scope

- Pipeline extraction logic (ST-02)
- Azure deployment (ST-11, ST-12)
- SQL persistence
