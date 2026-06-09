# ST-15: Production Hardening

## Objective

Fix production deployment issues discovered today: health probe reachable without ops token, App Service warmup reliability, CORS for SWA, and end-to-end verification of deployed stack.

## Prerequisites

- ST-11 (backend deployed)
- ST-12 (frontend deployed)
- ST-10 (async jobs work locally)

## Inputs / References

- Today's incidents:
  - `antenv` exit 127 (fixed in ST-11)
  - **ContainerTimeout** — container warmup probe failed after 230s
  - **`/health` behind OPS_TOKEN** — Azure health probe cannot send Bearer token → app marked unhealthy
- `verify_ops_token` applied globally via `APIRouter(dependencies=[...])` in `routes.py`, `catalog_routes.py`, `job_routes.py`
- App settings check: `OPS_TOKEN`, `WEBSITE_HEALTHCHECK_PATH`

## Deliverables

### Health endpoint exemption

`/health` must **not** require `OPS_TOKEN`:

- Option A: separate router without `verify_ops_token` dependency
- Option B: `verify_ops_token` skips when path is `/health`
- Option C: register health on `app` directly, not on gated router

All other routes may remain gated when `OPS_TOKEN` is set.

### App Service settings

| Setting | Recommended |
|---------|-------------|
| `WEBSITE_HEALTHCHECK_PATH` | `/health` |
| `OPS_TOKEN` | set in App Service config (not in repo) |
| `CORS_ORIGINS` | `https://victorious-river-036ce571e.7.azurestaticapps.net,...` |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |
| Startup Command | `bash startup.sh` |

### Frontend production config

- `VITE_API_BASE_URL` → production App Service URL
- `VITE_OPS_TOKEN` → matches App Service `OPS_TOKEN`
- `api/client.ts` sends Bearer on all requests when token configured

### Deploy verification checklist (document in README)

1. `curl /health` → 200 without auth
2. `curl /api/pipeline/runs` with Bearer → 200
3. SWA loads Pipeline page
4. Guided pipeline job completes in production
5. Report page renders diagrams

### Optional: `GET /health` enrichment

Return `version`, `store_backend`, `azure_openai`, `azure_sql`, `worker_alive` for ops debugging

## Acceptance Criteria

- [ ] `curl https://<backend>/health` returns 200 **without** Authorization header
- [ ] `curl https://<backend>/api/users` without token returns 401 when `OPS_TOKEN` set
- [ ] `curl` with `Authorization: Bearer <token>` succeeds on gated endpoints
- [ ] Azure App Service health check status **Healthy** (not ContainerTimeout)
- [ ] SWA frontend completes guided pipeline against production API
- [ ] CORS preflight from SWA origin succeeds
- [ ] GHA backend deploy health step passes within 30 attempts
- [ ] No exit 127 in App Service log stream after deploy

## Implementation Notes

- **Root cause today:** `router = APIRouter(dependencies=[Depends(verify_ops_token)])` included `/health` — probe got 401, container never marked ready
- ContainerTimeout can also be import errors — verify `PYTHONPATH` includes `.python_packages`
- Keep `continue-on-error: true` on GHA health step but aim for green after fix
- `sugarworkdbserver` public access disabled — production may use `STORE_BACKEND=file`; document in health response
- Test with `az webapp log tail --name sugarworkbackend --resource-group sugarwork`
- Frontend must use HTTPS API URL; mixed content blocked by browser

## Verification Steps

```bash
BACKEND=https://sugarworkbackend-hqbubbd7fgakgddr.westus2-01.azurewebsites.net
SWA=https://victorious-river-036ce571e.7.azurestaticapps.net

# Health without token
curl -sf "$BACKEND/health" | python3 -m json.tool

# Gated endpoint without token — expect 401
curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/pipeline/runs"

# With token
curl -sf -H "Authorization: Bearer $OPS_TOKEN" "$BACKEND/api/pipeline/runs" | python3 -m json.tool

# Frontend
curl -sf -o /dev/null -w "%{http_code}" "$SWA"

# Azure health
az webapp show -g sugarwork -n sugarworkbackend --query state -o tsv

# Logs
az webapp log tail -g sugarwork -n sugarworkbackend --timeout 30
```

## Out of Scope

- Azure Front Door / WAF
- Managed identity for all secrets (Key Vault refs partially done)
- Private SQL VNet integration (separate infra task)
- SLA monitoring / Application Insights dashboards
