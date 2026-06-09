# ST-11: Azure Deploy Backend

## Objective

Deploy `sugarworkbackend` to Azure App Service (`sugarworkbackend` in resource group `sugarwork`) via GitHub Actions, using portable `.python_packages` install and `startup.sh` — avoiding the `antenv` exit 127 failure observed today.

## Prerequisites

- ST-02 (working FastAPI app)
- Azure resources: App Service `sugarworkbackend`, resource group `sugarwork`
- GitHub secret `AZURE_CREDENTIALS` (service principal with Website Contributor)
- Key Vault `ai-rag-key` references for production secrets (optional for initial deploy)

## Inputs / References

- `.github/workflows/deploy-backend.yml`
- `startup.sh` — gunicorn + uvicorn worker
- Today's failures: `antenv` shebang exit 127, ContainerTimeout on warmup, zipped venv from GHA

## Deliverables

### `startup.sh`

```bash
#!/bin/bash
export PYTHONPATH="/home/site/wwwroot/.python_packages/lib/site-packages:..."
exec python3 -m gunicorn -w 1 -k uvicorn.workers.UvicornWorker app.main:app \
  --bind "0.0.0.0:${PORT:-8000}" --timeout 300
```

### `requirements.txt` addition

- `gunicorn>=23.0`

### `.github/workflows/deploy-backend.yml`

- Trigger: push to `v1`, `workflow_dispatch`
- `pip install -r requirements.txt --target .python_packages/lib/site-packages`
- **Exclude** `.venv`, `antenv`, `oryx-manifest.toml` from zip
- `azure/webapps-deploy@v3` with `deploy.zip`
- Post-deploy health check loop (30 attempts, 20s interval) — `continue-on-error: true`

### App Service configuration (document in README)

| Setting | Value |
|---------|-------|
| `PIPELINE_MODE` | `mock` or `azure_openai` |
| `STORE_BACKEND` | `file` (until SQL connectivity fixed) |
| `CORS_ORIGINS` | include SWA URL |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |
| Startup Command | `startup.sh` or `bash startup.sh` |

### Key Vault references (production)

- `@Microsoft.KeyVault(SecretUri=...)` for `AZURE_OPENAI_API_KEY`, `AZURE_SQL_CONNECTION_STRING`

## Acceptance Criteria

- [ ] GHA workflow succeeds on push to `v1`
- [ ] Deploy zip contains `.python_packages/lib/site-packages/fastapi/` — no `antenv/`
- [ ] `startup.sh` is executable in deployment package
- [ ] `GET https://<app>.azurewebsites.net/health` returns 200 JSON (see ST-15 if OPS_TOKEN blocks)
- [ ] App logs show gunicorn master + worker boot (not exit 127)
- [ ] `PIPELINE_MODE=mock` works without OpenAI key on App Service
- [ ] README documents deploy workflow and required secrets

## Implementation Notes

- **Never** let Oryx create `antenv` from GHA runner venv — paths point to `/home/runner/` and crash on App Service
- Use `--target .python_packages` pattern from today's fixed workflow
- `gunicorn -w 1` — single worker matches in-process job threads
- ContainerTimeout 230s occurred when app failed to bind — usually exit 127 or import error
- Health check in workflow may fail during warmup — `continue-on-error: true` prevents false-red deploy
- Backend URL example: `https://sugarworkbackend-hqbubbd7fgakgddr.westus2-01.azurewebsites.net`
- SQL public access disabled on `sugarworkdbserver` — use `STORE_BACKEND=file` until VNet integration

## Verification Steps

```bash
# Local package build smoke
cd sugarworkbackend
mkdir -p .python_packages/lib/site-packages
pip install -r requirements.txt --target .python_packages/lib/site-packages
PYTHONPATH=.python_packages/lib/site-packages python -c "import fastapi; import app.main; print('OK')"

# After deploy
curl -s "https://sugarworkbackend-hqbubbd7fgakgddr.westus2-01.azurewebsites.net/health" | python3 -m json.tool

# GHA
gh run list --repo michaelgsx/sugarworkbackend --branch v1 --limit 3
```

## Out of Scope

- Slot swaps / blue-green
- Autoscaling rules
- Private endpoint SQL connectivity (document as follow-up)
