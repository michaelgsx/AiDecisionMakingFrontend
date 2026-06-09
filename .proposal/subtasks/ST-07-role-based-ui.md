# ST-07: Role-Based UI

## Objective

Implement role-based access in the operator console: admin vs interviewer personas, `X-User-Id` header on API calls, and UI restrictions so only admin can mutate information points.

## Prerequisites

- ST-01 (frontend shell, API client)

## Inputs / References

- `app/api/deps.py` — `get_current_user`, `require_admin`
- `data/catalog/users.json` — seed users
- `src/context/UserContext.tsx`, `src/App.tsx` user selector
- Today's fix: interviewer gets read-only QuestionEditPage view

## Deliverables

### Backend seeds (`data/catalog/users.json`)

```json
[
  { "user_id": "admin", "user_name": "Admin User", "user_role": "admin" },
  { "user_id": "interviewer", "user_name": "Interviewer", "user_role": "interviewer" }
]
```

### Backend auth (`app/api/deps.py`)

- `get_current_user` — requires `X-User-Id` header; validates against catalog; roles `admin` | `interviewer`
- `require_admin` — 403 if not admin
- Catalog read endpoints require `get_current_user`
- Information point mutations require `require_admin`

### API

| Endpoint | Auth |
|----------|------|
| `GET /api/users` | ops token only |
| `GET /api/users/{id}/role` | ops token only |
| `GET /api/information-points` | `X-User-Id` (any valid role) |
| `POST/PUT/DELETE /api/information-points` | admin only |

### Frontend

- `UserContext.tsx` — load users, `currentUser`, `isAdmin`, `setUserId`
- `App.tsx` — header `<select>` for user switching
- `api/client.ts` — `setApiUserId()`, attach `X-User-Id` on catalog calls
- Nav label: admin sees "Question edit", interviewer sees "Information points"
- `QuestionEditPage.tsx` — hide create/delete/edit forms when `!isAdmin`; show read-only table

## Acceptance Criteria

- [ ] Switching user in header changes `X-User-Id` on subsequent API calls
- [ ] Interviewer `POST /api/information-points` returns 403
- [ ] Admin CRUD on information points succeeds
- [ ] Interviewer can `GET /api/information-points` and view list
- [ ] Missing `X-User-Id` on catalog endpoints returns 401
- [ ] Frontend disables/hides mutation UI for interviewer
- [ ] Unknown `X-User-Id` returns 403

## Implementation Notes

- Role model is **demo-grade** — header-based impersonation, not real auth
- `verify_ops_token` (Bearer) is separate from user role — production uses both
- Admin write protection was backend-first; frontend read-only view added after user feedback
- Pipeline/eval/report endpoints may not require `X-User-Id` — only catalog mutations

## Verification Steps

```bash
# Interviewer read OK
curl -s -H 'X-User-Id: interviewer' http://localhost:8788/api/information-points | head -c 200

# Interviewer write blocked
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8788/api/information-points \
  -H 'X-User-Id: interviewer' -H 'Content-Type: application/json' \
  -d '{"name":"test","position":"hr","content":"c","description":"d"}'
# Expect 403

# Admin write OK
curl -s -X POST http://localhost:8788/api/information-points \
  -H 'X-User-Id: admin' -H 'Content-Type: application/json' \
  -d '{"name":"test","position":"hr","content":"c","description":"d"}' | python3 -m json.tool

# Frontend: switch to interviewer — no "Add" button on /questions
```

## Out of Scope

- OAuth / Azure AD
- Per-run ownership ACLs
- Server-side session cookies
