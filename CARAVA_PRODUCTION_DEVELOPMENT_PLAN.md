# Carava — Production Development Plan

- **Prepared:** 2026-11-23
- **Current state:** Complete browser-local demo plus an additive zero-cost API foundation. Next.js 16.4.6 frontend, 116 route surfaces, 63 passing Playwright scenarios, 21 passing unit tests, client-side demo persistence, SQLite-backed booking API with session auth.
- **Target state:** Self-hostable marketplace with a server-authoritative TypeScript API, a free local database by default, real authentication, private file storage, audited admin actions, realtime messaging/notifications, and a reconciled mock payment ledger. Paid providers are optional adapters, never required to run the product.
- **Recommended stack (zero-cost baseline):** Next.js frontend + Next Route Handlers + SQLite (`node:sqlite`) by default, with optional self-hosted PostgreSQL + Redis + MinIO via Docker Compose + dev-console OTP bootstrap + local file storage + mock payment/payout ledger.

This plan is incremental. Do **not** rewrite the whole frontend at once. Keep `DEMO_MODE` working while migrating one vertical slice at a time.

---

## Cost-free operating model

No paid third-party service is required to build, run, or test this product. The scale-path phases below may mention managed services; the substitutions in this table take precedence wherever cost is a constraint.

| Capability | Zero-cost default | Optional scale path |
|---|---|---|
| Runtime/hosting | Local machine or any self-hosted Node server | Paid hosting only if uptime/scale requires it |
| Database | SQLite via built-in `node:sqlite`, file under `.data/` | Self-hosted PostgreSQL in Docker Compose |
| Cache/queue | In-process memory; no queue for the first slice | Self-hosted Redis + BullMQ |
| File storage | Local `.data/uploads` with filename metadata only | Self-hosted MinIO |
| OTP delivery | OTP printed to server console in dev/bootstrap; never sent to a phone | Self-hosted Mailpit for email codes, or an SMS adapter added later |
| Payments/payouts | Mock ledger transactions with explicit `demo`/`mock` labels | Licensed payment provider adapter, disabled by default |
| Email/SMS | No outbound messages in the zero-cost baseline | Self-hosted SMTP or paid provider later |
| Observability | Structured logs to stdout + local audit table | Self-hosted Grafana/Loki stack |

A truly public production deployment still needs a domain, a host, and some form of outbound identity verification. This plan keeps those costs out of the code path by using adapters and local defaults rather than hard dependencies.

## 0. Milestone 0 — Foundation + bookings slice

This milestone is implemented and verified. It is additive: demo mode remains the default UI behavior.

### Completed

1. **Local infrastructure**
   - `docker-compose.yml` provides optional PostgreSQL, Redis, MinIO, and Mailpit. Docker is not required for the default app.
   - `.env.example` and `.env.test` document all local variables.
   - `pnpm dev:api`, `pnpm test:api`, and `pnpm smoke:api` are available. The main `pnpm dev` remains the browser-local demo.

2. **Database and API foundation**
   - SQLite via built-in `node:sqlite` stores data under `.data/` with user, session, OTP, booking, event, audit, and notification tables.
   - Money is stored as integer cents; statuses are DB-checked enums.
   - Route Handlers under `app/api/v1` expose health, OTP request/verify, bookings, booking transitions, notifications, and audit logs.
   - Dev OTP is returned to the caller and printed to the server console only when explicitly enabled outside development.

3. **Frontend compatibility layer**
   - `NEXT_PUBLIC_DEMO_MODE` defaults to demo mode; `NEXT_PUBLIC_API_URL` defaults to `/api/v1`.
   - `lib/api-client.ts` contains typed health, auth, booking, notification, and audit helpers.
   - `useDemoStorageState` remains the only demo persistence adapter.

4. **Bookings vertical slice**
   - Customer creates a booking; worker accepts/starts/completes; customer confirms; cancel is allowed from open states by customer, worker, or admin.
   - Role and state rules are enforced server-side.
   - Each transition writes a booking event, audit row, and notifications in one SQLite transaction.
   - Booking lists are role-scoped; audit logs are admin-only.

### Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (21 tests), `pnpm build`, and `pnpm test:e2e` (63 scenarios) pass.
- `pnpm smoke:api` passed against `next start`: health, 401/403 checks, three role sessions, create → accept → start → complete → confirm, admin bookings, five audit logs, five worker notifications, public/dashboard/detail routes 200, unknown route 404.
- After adding or moving App Router route files, stop the dev server and remove `.next` before rebuilding. Stale Turbopack manifests can make `/api/v1/*` fall through to the root catch-all page and return a branded 404 even when the manifest lists the handlers.

**Exit criterion met:** a booking can be created by a customer, accepted by a worker, confirmed by the customer, and viewed by admin through the local API and database while the existing demo suite still passes.

### Running the zero-cost API locally

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_DEMO_MODE=false and CARAVA_EXPOSE_DEV_OTP=true
pnpm build
pnpm start
pnpm smoke:api
```

`pnpm dev:api` starts the same Next server in development mode, where the dev OTP is exposed automatically. The seeded phones are `+251911000001` (customer), `+251911000002` (worker), and `+251911000003` (admin). The default `pnpm dev` keeps demo mode on.

---

## 1. Target architecture

```text
Next.js frontend
  ├── typed API client (NEXT_PUBLIC_DEMO_MODE=false)
  └── useDemoStorageState adapter (default, browser-local)

REST API v1 (Next Route Handlers, TypeScript)
  ├── health, dev OTP sessions
  ├── bookings, notifications, audit logs
  └── shared validation, auth, and transaction helpers

SQLite via node:sqlite (default source of truth)
  ├── transactional tables
  ├── append-only audit_logs
  └── mock ledger/payment tables

Optional self-hosted scale path (Docker Compose)
  ├── PostgreSQL instead of SQLite
  ├── Redis / BullMQ for queues and rate limiting
  ├── MinIO for private object storage
  └── Mailpit for local outbound email
```

---

## 2. Current-code migration map

| Current file / system | Production destination |
|---|---|
| `lib/carava-data.ts` | Reference-data tables and seed script; SQLite now, optional PostgreSQL later |
| `lib/carava-api.ts` | Browser-local demo adapter; `lib/api-client.ts` is the API-mode client |
| `lib/use-demo-storage-state.ts` | Demo adapter; no API-mode writes |
| `lib/carava-demo-session.ts` | `lib/server/auth.ts` session cookies and role claims |
| `lib/carava-demo-activity.ts` | `lib/server/bookings.ts` notifications and audit writes |
| `lib/carava-workflows.ts` | Shared validation + server-authoritative state machines |
| `components/carava/carava-app.tsx` | Add API-mode data fetching behind `NEXT_PUBLIC_DEMO_MODE` |
| `components/carava/marketplace.tsx` | API-backed search/save/bookmark hooks |
| `components/carava/dashboard.tsx` | API-backed dashboard data and mutations |
| `components/carava/dashboard-workflows.tsx` | Server-authoritative workflow actions |
| `tests/e2e/carava.spec.ts` | Keep demo suite unchanged; add API-mode suite with disposable DB |
| `CARAVA_FINAL_FRONTEND_ACCEPTANCE_AUDIT.md` | Keep as baseline route/control evidence |
| `CARAVA_FINAL_FRONTEND_COMPLETION_REPORT.md` | Current demo + zero-cost foundation report |

---

## 3. Phase 1 — Database and domain model

### Scope

Implement the domain model in SQLite via `node:sqlite` first. Keep column names and constraints portable so the same schema can move to self-hosted PostgreSQL later; Prisma and migrations are optional scale-path work.

### Core tables

- `users`: UUID id, unique phone, status, timestamps.
- `user_roles`: user_id, role (`CUSTOMER`, `WORKER`, `BUSINESS`, `ADMIN`).
- `sessions` / `refresh_tokens`.
- `customer_profiles`, `worker_profiles`, `business_profiles`.
- `categories`, `subcategories`, `services`, `service_zones`.
- `jobs`: owner business, category, status, budget, schedule, moderation fields.
- `job_applications`: unique `(job_id, worker_id)`.
- `bookings`: customer, worker or service, scheduled_at, status, amount_minor, currency.
- `conversations`, `conversation_participants`, `messages`.
- `notifications`: recipient, type, payload, read_at.
- `reviews`: booking_id, author, target, rating, body.
- `disputes`, `complaints`.
- `verification_requests`, `verification_documents`.
- `ledger_accounts`, `ledger_entries`, `transactions`, `payouts`.
- `audit_logs`: append-only actor, action, entity, reason, before/after, created_at.

### Rules

- Use `uuid` primary keys and prefixed public IDs.
- Store `currency = "ETB"` and `amount_minor` as integers.
- Use enums for statuses, not free text.
- Add indexes on foreign keys, status, scheduled_at, created_at, and search fields.
- Add `version` columns for optimistic locking on mutable records.
- Add soft delete only where user-visible history matters.

### Acceptance criteria

- `getDatabase()` creates an empty SQLite file, schema, and seed users on first run.
- `CARAVA_SQLITE_PATH=:memory:` gives tests a disposable database.
- Schema tests verify unique constraints, status enums, and integer money precision.
- Optional PostgreSQL adapter can be added without changing service-layer signatures.

---

## 4. Phase 2 — API core, auth, and authorization

### Scope

Grow the Next Route Handler API and its cross-cutting concerns. A separate NestJS process remains an optional scale-path choice, not a zero-cost requirement.

### Modules

`Auth`, `Users`, `Profiles`, `Categories`, `Services`, `Bookings`, `Jobs`, `Applications`, `Messages`, `Notifications`, `Reviews`, `Disputes`, `Verification`, `Payments`, `Payouts`, `Admin`, `Audit`.

### Auth

- Phone OTP request and verify with a console-only dev adapter; no SMS is sent.
- `httpOnly`, `sameSite` session cookie plus bearer-token support for API clients.
- Session expiry and OTP attempt limits in SQLite.
- Optional self-hosted Redis rate limiting when exposed beyond localhost.
- Multiple roles per user; active role selected per session.

### Authorization

- Central policy layer, not UI role strings.
- Guards/decorators such as `OwnsBooking`, `AssignedWorker`, `BusinessOwner`, `IsAdmin`, `CanModerate`.
- Admin mutations require a reason and write an audit log.
- Use PostgreSQL RLS only as optional defense-in-depth; never as the only authorization layer.

### API conventions

- Versioned REST: `/api/v1/...`.
- DTO validation with Zod or `class-validator`.
- OpenAPI/Swagger generated from DTOs.
- Global request ID, structured logs, exception filter.
- Idempotency key support on all create/payment endpoints.

### Acceptance criteria

- Local health and route inventory are available through `pnpm smoke:api`.
- Unauthorized and forbidden requests return correct 401/403 responses.
- Session expiry, logout, and OTP attempt-limit integration tests pass.
- Every admin mutation writes an audit record.

---

## 5. Phase 3 — Booking, job, and application workflows

### Scope

Move the highest-value cross-role workflows to the API first.

### Booking state machine

```text
requested → accepted → in_progress → evidence_submitted
          → completed → paid → reviewed
          → cancelled / disputed
```

### Job state machine

```text
draft → pending_review → approved → closed
                      ↘ rejected
```

### Application state machine

```text
applied → shortlisted → interview → hired
        ↘ rejected / withdrawn
```

### Implementation rules

- All transitions happen in service-layer methods.
- Transitions are validated server-side.
- Related status change + notification + audit log happen in one transaction.
- Use idempotency keys and optimistic locking.
- Worker cannot confirm their own completion; customer cannot mark payout as paid.
- Admin moderation requires a reason.

### Acceptance criteria

- API integration tests cover valid and invalid transitions.
- Existing E2E booking/recruitment flows pass in API mode.
- Concurrent duplicate actions produce one record only.

---

## 6. Phase 4 — Messaging, notifications, and realtime

### Scope

Replace demo inbox/activity helpers with real server-side services.

### Work

- Conversations tied to bookings, jobs, or support tickets.
- `conversation_participants` controls visibility.
- Unread counts per participant.
- In-process notification fan-out first; self-hosted Redis/BullMQ only when scaling out.
- SSE delivery with REST backfill on reconnect; no hosted realtime service is required.
- Admin support/messages inbox as a real dashboard route.

### Acceptance criteria

- A public customer message appears in the worker inbox through the API.
- A public report appears in the admin notification/inbox surface.
- Mark one / mark all read persists.
- Cross-user message leakage tests pass.
- Realtime reconnects without duplicating messages.

---

## 7. Phase 5 — Files and verification

### Scope

Make portfolio, certificates, and verification documents production-safe.

### Work

- Local `.data/uploads` storage with authenticated download route in the zero-cost baseline.
- Optional MinIO bucket with signed upload/read URLs on the scale path.
- File size, MIME type, and extension validation.
- Store only object keys and metadata in the database, never file bytes.
- Verification document access restricted to owner and authorized admin.
- Optional self-hosted malware scanning before marking documents active.

### Acceptance criteria

- No file bytes are stored in the database.
- Direct unauthenticated file and MinIO object access fails.
- Optional signed URLs expire.
- Admin verification decision requires a reason and writes an audit log.

---

## 8. Phase 6 — Payments, ledger, and payouts

### Scope

Model money movement and reconciliation without storing sensitive payment data. The zero-cost baseline uses mock transactions only; a licensed provider adapter is optional and disabled by default.

### Work

- Mock payment intents, webhook-shaped events, and idempotency keys.
- Double-entry ledger: platform, escrow, worker payable, fees, refunds.
- Payout requests with admin approval queue and explicit `mock` labels.
- Manual settlement records for real-world payments made outside the app.
- Reconciliation report over local ledger data.
- Optional provider adapter added behind the same service interface later.

### Rules

- Never store card numbers or full provider secrets in app tables.
- All amounts are integer ETB minor units.
- Every money movement creates balanced ledger entries.
- Client never marks a payment as paid; only the service or mock webhook handler does.

### Acceptance criteria

- Mock event replay does not duplicate ledger entries.
- Ledger debits equal credits for every transaction.
- Payout approval requires reason and audit log.
- The zero-cost path never moves real money.

---

## 9. Phase 7 — Admin, audit, and analytics

### Scope

Make admin operations real and auditable.

### Work

- Real role and permission management.
- Reason-required moderation, refunds, cancellations, disputes, verification, and role changes.
- Append-only audit log viewer with filters.
- Analytics derived from SQL queries over production data.
- Remove remaining hardcoded demo metrics.

### Acceptance criteria

- Every admin mutation has an audit entry.
- Analytics values match DB queries.
- Admin cannot act outside assigned permissions.
- Sensitive fields are redacted in audit history.

---

## 10. Phase 8 — Frontend migration

### Scope

Migrate the UI incrementally while preserving demo mode.

### Work

- Add `lib/api-client.ts` with typed methods and error handling.
- Add SWR hooks per domain: `useBookings`, `useJobs`, `useMessages`, etc.
- Replace `useDemoStorageState` calls domain by domain.
- Share Zod schemas between API DTOs and forms.
- Add consistent loading, empty, error, and retry states.
- Add feature flags for unpublished workflows.
- Keep `DEMO_MODE` as a supported adapter for demos and tests.

### Acceptance criteria

- Demo suite still passes unchanged.
- API-mode suite passes with a seeded test DB.
- No production code path writes to localStorage.
- All API errors have user-facing messages.

---

## 11. Phase 9 — Security, privacy, and compliance

### Work

- OWASP Top 10 review.
- Helmet/security headers, CORS allowlist, CSRF strategy for cookie auth.
- Rate limiting on auth, OTP, search, message, and payment endpoints; in-process locally, optional self-hosted Redis when scaling.
- Input validation and output encoding.
- Secrets supplied by environment variables; key rotation documented for self-hosted deployments.
- PII retention and deletion policy.
- Consent records for phone number and document storage.
- Encrypted backups and restricted audit-log access.

### Acceptance criteria

- Dependency audit has no high/critical vulnerabilities.
- Authorization matrix tests pass for all roles and resources.
- Privacy deletion/export flow tested.
- Security checklist signed off before launch.

---

## 12. Phase 10 — Performance, reliability, and observability

### Work

- Query plan review and index tuning.
- Pagination and cursor-based lists for messages/notifications/audit logs.
- Cache reference data, not user-sensitive state.
- Structured logs with request IDs.
- Structured stdout logs plus optional self-hosted metrics/traces; no paid observability SaaS.
- Health/readiness/liveness endpoints.
- SQLite file snapshots locally, or PostgreSQL PITR on the self-hosted scale path.
- Restore drill and runbooks.
- Alerting for webhook failures, payout failures, and DB saturation.

### Acceptance criteria

- p95 API latency targets met for critical routes.
- Restore drill succeeds.
- Alerts fire correctly in staging.
- No N+1 query regressions.

---

## 13. Phase 11 — Testing and quality gates

### Test layers

- **Unit:** state machines, validators, money math, policy helpers.
- **Integration:** API + in-memory SQLite; optional self-hosted PostgreSQL/MinIO/Redis containers on the scale path.
- **Contract:** OpenAPI schema validation.
- **E2E demo:** current 63 Playwright scenarios.
- **E2E API:** same critical journeys against API mode.
- **Accessibility:** keyboard traversal, focus, labels, contrast.
- **Visual/responsive:** key routes at required viewports.
- **Load:** search, booking create, message send, admin analytics.
- **Security:** authz matrix, OTP abuse, webhook replay, file access.

### CI gates

Every PR must pass:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e --grep @demo
pnpm test:api
pnpm build
dependency audit
```

Release additionally requires:

```text
pnpm test:e2e --grep @api
a11y smoke
load smoke
staging UAT sign-off
```

---

## 14. Phase 12 — Deployment and release

### Environment strategy

- **Local:** single Node process with SQLite and local uploads; no Docker required.
- **Optional local services:** Docker Compose with PostgreSQL, Redis, MinIO, and Mailpit when testing the scale path.
- **CI:** in-memory SQLite per test worker.
- **Staging/production:** any self-hosted Node server with a persistent SQLite file or self-hosted PostgreSQL, local snapshots, and environment-variable secrets. Paid managed services are optional only.

### Release process

1. Migration reviewed and reversible where possible.
2. Backups taken before deploy.
3. Feature flags default off for new workflows.
4. Canary or staged rollout.
5. Monitor errors, latency, webhook failures.
6. Rollback plan documented and rehearsed.

---

## 15. Definition of “production level finished”

The system is production-finished only when all of these are true:

- No production path writes to browser storage.
- All mutations are server-authoritative.
- Auth uses real phone OTP/session handling.
- Multiple roles per user are enforced server-side.
- Every cross-role workflow is transactional.
- Every admin action requires a reason and writes an immutable audit log.
- Money is integer-based, mock-provider-backed in the zero-cost baseline, and reconciled through a balanced ledger.
- Uploaded files are private and accessed only through authenticated local routes or expiring self-hosted MinIO URLs.
- Messaging and notifications are realtime through SSE with REST backfill.
- Analytics derive from database data.
- Observability, backups, restore drill, alerts, and runbooks exist.
- CI gates, staging UAT, security review, and load smoke all pass.
- No P0/P1 defects remain.

---

## 16. Timeline estimate

| Team size | Estimate |
|---|---:|
| 1 full-stack developer | 14–18 weeks |
| 2 developers | 9–12 weeks |
| 3 developers with QA support | 7–9 weeks |

Suggested order: **DB → Auth → Bookings → Jobs/Applications → Messaging/Notifications → Files/Verification → Payments/Payouts → Admin/Audit/Analytics → Security/Ops → Release**.

---

## 17. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Payment provider unavailable or costly | Zero-cost mock ledger and manual settlement first; optional provider adapter behind one interface |
| Identity verification without paid SMS | Console/bootstrap OTP for development and self-hosted email via Mailpit; add an SMS adapter only if required |
| Big-bang frontend rewrite | Feature flags and vertical-slice migration with `DEMO_MODE` fallback |
| Authorization bugs | Central policy layer, authz matrix tests, audit logs |
| Data residency requirements | Choose self-hosted Postgres/MinIO in approved region |
| Scope creep from many admin screens | Prioritize reason-required mutations and transactional workflows first |
| Duplicate/concurrent actions | Idempotency keys, unique constraints, optimistic locking |

---

## 18. Immediate backlog

Completed in Milestone 0:

1. `INFRA-001` — Optional Docker Compose plus `.env` templates and health endpoint.
2. `DB-001` — SQLite schema, seed users, and disposable test databases.
3. `API-001` — Route Handlers, validation/error helpers, and request auth.
4. `AUTH-001` — Console-only dev OTP request/verify.
5. `AUTH-002` — Session cookies, bearer tokens, expiry, and role claims.
6. `FE-001` — Demo-mode flag and typed API client.
7. `BOOK-001` / `BOOK-002` — Booking create/list and full accept/start/complete/confirm/cancel state machine.
8. `TEST-001` — API service and route-handler integration tests.
9. `AUDIT-001` — Booking events, audit log, and notification tables with admin-only audit endpoint.

Recommended next tickets:

1. `FE-002` — Wire booking dashboard reads/mutations to the API behind `NEXT_PUBLIC_DEMO_MODE=false`.
2. `TEST-002` — Tag demo/API Playwright suites and run a seeded API-mode journey.
3. `AUTH-003` — Logout, session listing, and OTP abuse limits.
4. `BOOK-003` — Reschedule and explicit reason capture for cancellation.
5. `LEDGER-001` — Mock payment intents, double-entry ledger, and payout approval queue.
6. `MSG-001` — Server-side conversations and unread counts with SSE backfill.
7. `FILE-001` — Authenticated local upload/download routes with metadata-only storage.
8. `DB-002` — Optional PostgreSQL adapter and parity tests.

The first visible user-facing result should be **bookings working end-to-end through the real backend**, because it touches customers, workers, admin, notifications, money fields, and audit requirements.
