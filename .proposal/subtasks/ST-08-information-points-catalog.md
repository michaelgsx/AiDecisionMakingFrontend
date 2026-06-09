# ST-08: Information Points Catalog

## Objective

Build the information-points catalog: position-tagged question definitions, CRUD API (admin-only), file-based store with seeds, and frontend QuestionEditPage for management.

## Prerequisites

- ST-07 (role-based UI, `X-User-Id` header)
- ST-01 (backend scaffold)

## Inputs / References

- `app/models/catalog.py` — `InformationPoint`, `InformationPointCreate`, `InformationPointUpdate`
- `app/store/catalog_file.py`, `data/catalog/information_points.json`
- `app/api/catalog_routes.py`
- Initially seeded `software_engineer` + `hr` (2 points each); later replaced with `product_delivery` (14 points) when transcript pivoted

## Deliverables

### Models (`app/models/catalog.py`)

- `InformationPoint` — `id`, `name`, `position`, `content`, `description`
- `InformationPointCreate`, `InformationPointUpdate`
- `AppUser`, `UserRoleResponse`

### File store (`app/store/catalog_file.py`)

- Persists to `data/catalog/information_points.json` (via `output` catalog dir with seed copy)
- `list_positions()` — distinct sorted positions from points
- CRUD: `create_information_point`, `update_information_point`, `delete_information_point`
- Auto-seed from `data/catalog/` on first run

### API (`app/api/catalog_routes.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/positions` | Distinct position strings |
| GET | `/api/information-points?position=` | Filter by position |
| POST | `/api/information-points` | Create (admin) |
| PUT | `/api/information-points/{id}` | Update (admin) |
| DELETE | `/api/information-points/{id}` | Delete (admin) |

### Seed data

`data/catalog/information_points.json` — at minimum one position with ≥ 2 points

Example structure per point:

```json
{
  "id": "ip_pd_roles",
  "name": "Stakeholder roles in the room",
  "position": "product_delivery",
  "content": "Who participates in the project...",
  "description": "Extract each role's responsibilities..."
}
```

### Frontend

- `QuestionEditPage.tsx` at `/questions`
- `types/catalog.ts` — TypeScript interfaces
- `api/client.ts` — `listPositions`, `listInformationPoints`, CRUD helpers

## Acceptance Criteria

- [ ] `GET /api/positions` returns non-empty array
- [ ] `GET /api/information-points?position=product_delivery` returns ≥ 10 seeded points
- [ ] Admin can create point; it appears in subsequent list
- [ ] Admin can delete point; 404 on subsequent get
- [ ] Interviewer receives 403 on create/update/delete
- [ ] `list_positions()` derives from data (no hardcoded position list in API)
- [ ] Frontend QuestionEditPage lists all points with position column
- [ ] IDs auto-generated as `ip_{uuid fragment}`

## Implementation Notes

- **Catalog stays file-based** even when Azure SQL is enabled (hybrid architecture decision today)
- SQL table `information_points` exists in schema for future migration but runtime uses `FileCatalogStore` via `catalog_factory`
- When switching demo transcript to product_delivery, information points were **regenerated from transcript themes** (handoff, refund, promo code, etc.)
- `software_engineer` / `hr` points were removed during pivot — restored in ST-14
- `content` = what to extract; `description` = guidance for extractor prompt

## Verification Steps

```bash
curl -s http://localhost:8788/api/positions | python3 -m json.tool
curl -s -H 'X-User-Id: admin' 'http://localhost:8788/api/information-points?position=product_delivery' | python3 -c "import sys,json; print(len(json.load(sys.stdin)),'points')"

# Frontend: http://localhost:5173/questions (as admin)
```

## Out of Scope

- SQL-backed catalog runtime (schema only in ST-13)
- LLM auto-generation of information points (ST-14)
- Versioning / audit trail for point edits
