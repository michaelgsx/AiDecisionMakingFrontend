# ST-12: Azure Deploy Frontend

## Objective

Deploy `sugarworkfrontend` to Azure Static Web Apps (`victorious-river-036ce571e`) via GitHub Actions, reading the SWA deployment token from Key Vault at runtime and baking `VITE_API_BASE_URL` into the production build.

## Prerequisites

- ST-01 (frontend builds with `npm run build`)
- ST-11 (backend deployed — need production API URL)
- Azure SWA resource connected to GitHub repo
- GitHub secret `AZURE_CREDENTIALS` with Key Vault Secrets User on `ai-rag-key`

## Inputs / References

- `.github/workflows/azure-static-web-apps-victorious-river-036ce571e.yml`
- Key Vault secret `sugarworkfrontend` — SWA deployment token
- Production URL: `https://victorious-river-036ce571e.7.azurestaticapps.net`
- Today's fix: token not stored in GitHub; fetched via `az keyvault secret show` in workflow

## Deliverables

### Workflow (`.github/workflows/azure-static-web-apps-victorious-river-036ce571e.yml`)

Steps:

1. `npm ci && npm run build` with env:
   - `VITE_API_BASE_URL` from GitHub secret
   - `VITE_OPS_TOKEN` from GitHub secret (if production API gated)
   - `VITE_USE_MOCK` — unset or `false` for production
2. Azure CLI login with `AZURE_CREDENTIALS`
3. Fetch SWA token from Key Vault (`ai-rag-key` / `sugarworkfrontend`)
4. `Azure/static-web-apps-deploy@v1` with:
   - `app_location: dist`
   - `skip_app_build: true`
   - `output_location: ""`

### `public/staticwebapp.config.json`

- SPA fallback `navigationFallback` to `index.html`
- Route rules if needed for client-side routing

### GitHub secrets (document)

| Secret | Purpose |
|--------|---------|
| `AZURE_CREDENTIALS` | SP JSON for Key Vault access |
| `VITE_API_BASE_URL` | Production backend root URL |
| `VITE_OPS_TOKEN` | Optional Bearer for API |

### README updates

- Production site URL
- Key Vault secret table
- Local vs production env comparison

## Acceptance Criteria

- [ ] `npm run build` succeeds locally with `VITE_API_BASE_URL` set
- [ ] GHA workflow succeeds on push to `v1`
- [ ] SWA deployment token is **not** committed to repo
- [ ] Production site loads at victorious-river URL (HTTP 200)
- [ ] Browser network tab shows API calls to production backend (not localhost)
- [ ] Pipeline page shows backend health/mode from production API
- [ ] PR close job tears down preview environments

## Implementation Notes

- Pre-existing SWA workflow stubs had wrong `app_location: "/"` — fixed to `dist` + `skip_app_build: true`
- Build **before** deploy step — SWA action only uploads artifacts
- `VITE_*` vars are compile-time — changing API URL requires rebuild + redeploy
- CORS on backend must include SWA origin (ST-11 / ST-15)
- If `VITE_OPS_TOKEN` set, frontend `api/client.ts` must send `Authorization: Bearer`
- Mock mode (`VITE_USE_MOCK=true`) only for local offline demo

## Verification Steps

```bash
cd sugarworkfrontend
VITE_API_BASE_URL=https://sugarworkbackend-hqbubbd7fgakgddr.westus2-01.azurewebsites.net npm run build
ls dist/index.html

# Production
curl -s -o /dev/null -w "%{http_code}" https://victorious-river-036ce571e.7.azurestaticapps.net
# Expect 200

# GHA
gh run list --repo michaelgsx/sugarworkfrontend --branch v1 --limit 3
```

## Out of Scope

- Custom domain / TLS cert management
- SWA linked API (Azure Functions)
- A/B deployments
