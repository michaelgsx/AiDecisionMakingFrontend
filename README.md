# AI Decision Making — Frontend

Vite + React + TypeScript SPA for **ingesting** labeled risk cases and **assessing** new ones against the backend RAG API. Part of a three-repo platform; see [Related repositories](#related-repositories).

> **Synthetic data & schema disclaimer**  
> The **risk feature schema** (`src/risk/featureSchema.ts`), **random fill helpers** (`randomFill.ts`), and **sample form values** are **AI-generated** for local demos. They are fictional fields and values—not real user transactions or production fraud features. Always treat UI-filled data as synthetic when testing.

## Related repositories

| Repository | Role |
|------------|------|
| [AiDecisionMakingBackend](https://github.com/michaelgsx/AiDecisionMakingBackend) | Spring API, SQL, Search, offline `db/` jobs |
| [AiDecisionMakingML](https://github.com/michaelgsx/AiDecisionMakingML) | Logistic cascade training → Blob |
| **This repo** | Operator UI (Ingest + Assess) |

**Backend design specs:** [AiDecisionMakingBackend/.ai/](https://github.com/michaelgsx/AiDecisionMakingBackend/tree/v1/.ai) (subsystem `07-frontend-spa.md`).

**Branch:** `v1` (deployed to Azure Static Web Apps).

## Features

| Route | Page | API |
|-------|------|-----|
| `/` | **Ingest** — structured risk features + review outcome | `POST /rag/ingest` |
| `/assess` | **Assess** — search summary, similar cases, AI reasoning & evidence | `POST /rag/assess` |

- **RiskFeaturesPanel** — edits core/extended fields aligned with backend `risk_feature_taxonomy`.
- **Random fill** — one-click plausible **random** values for dev (AI-shaped demo data only).
- **Mock mode** — `VITE_USE_MOCK=true` runs without a live API.

## Project structure

```
src/
  pages/
    IngestPage.tsx
    AssessPage.tsx
  components/
    RiskFeaturesPanel.tsx
  risk/
    featureSchema.ts    # Feature keys (keep in sync with backend taxonomy)
    randomFill.ts       # AI-style random demo values
  api/
    client.ts           # ingestRecord(), assessRecord()
  types/
    api.ts              # Mirrors backend AssessResponse / LLM fields
.github/workflows/
  deploy-frontend-swa.yml
staticwebapp.config.json
```

## Quick start

```bash
npm ci
cp .env.example .env   # if present; else create from below
npm run dev
```

Open the dev server (default Vite port, often `5173`).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes (prod) | Backend root, e.g. `https://ai-rag-webapp.azurewebsites.net` |
| `VITE_OPS_TOKEN` | If API enforces token | Same as backend `OPS_TOKEN` |
| `VITE_USE_MOCK` | No | `true` → skip network calls |

Example local `.env`:

```env
VITE_API_BASE_URL=http://localhost:8787
VITE_OPS_TOKEN=
```

## Build & deploy

```bash
npm run build    # tsc + vite → dist/
```

**CI/CD:** `.github/workflows/deploy-frontend-swa.yml` on push to `v1`.

GitHub secrets (typical): `AZURE_CREDENTIALS`, `VITE_API_BASE_URL`, `VITE_OPS_TOKEN`, Key Vault references per workflow.

SPA routing: `staticwebapp.config.json` fallback to `index.html`.

## API types

`src/types/api.ts` tracks backend DTOs, including assess fields:

- `aiLabel`, `aiReasoning`, `aiEvidence`, `aiConfidence`, `aiKeyRiskFactors`
- `similarRecords`, search `reason` / `risk`

When backend contracts change, update types and pages together; see backend [`.ai/02-assess-rag-api.md`](https://github.com/michaelgsx/AiDecisionMakingBackend/blob/v1/.ai/02-assess-rag-api.md).

## Keeping schema in sync

Feature keys must match:

- Backend: `db/risk_feature_taxonomy.py`
- Frontend: `src/risk/featureSchema.ts`

Both were defined with AI assistance; change them together when adding fields.

## License & use

UI for demonstrating AI-assisted risk review. Do not submit real customer PII through demo forms unless your deployment is properly governed.
