# Tasks

Status: `[ ]` todo · `[x]` done · `[-]` skipped

---

## M1 — Repo + Docs

- [x] Scaffold repo structure
- [x] Write CONTEXT.md
- [x] Write DECISIONS.md
- [x] Write TASKS.md
- [ ] Write ARCHITECTURE.md
- [ ] Write RUNBOOK.md (stub, fill as we build)

---

## M2 — Azure Baseline

- [x] Create resource group `rg-mediaops-dev`
- [x] Create Storage Account + containers (`raw`, `thumb`) + queue (`process-queue`)
- [x] Create Cosmos DB account (Free Tier) + database + container
- [x] Create Key Vault (RBAC mode)
- [x] Create two user-assigned Managed Identities (`mi-backend`, `mi-worker`)
- [x] Assign RBAC roles (Storage, Cosmos, Key Vault)
- [x] Store secrets in Key Vault (`cosmos-endpoint`, `cosmos-primary-key`, `storage-connection-string`)
- [x] Write teardown script
- [ ] Write Bicep for all of the above (P1 — do after manual provisioning works)

---

## M3 — API (NestJS on Functions)

- [x] Scaffold NestJS app in `apps/backend`
- [x] Add Azure Functions HTTP adapter
- [x] Implement `GET /api/healthz`
- [x] Implement `POST /api/media` (create record, Cosmos write)
- [ ] Implement `PUT /api/media/:id/content` (stream to Blob, update Cosmos)
- [x] Implement `GET /api/media` (list, paged)
- [x] Implement `GET /api/media/:id` (single item)
- [ ] Auth: parse SWA `x-ms-client-principal` header → derive ownerId
- [ ] Key Vault integration: fetch secrets at startup via Managed Identity
- [ ] Unit tests for service layer
- [x] Local dev: `.env`-based config

---

## M4 — Eventing

- [ ] Create Event Grid system topic on Storage Account
- [ ] Create subscription: BlobCreated (filter `raw/`) → Function endpoint
- [ ] Implement Event Grid-triggered Function (subscription handshake + enqueue)
- [ ] Verify queue message appears after blob upload

---

## M5 — Worker

- [ ] Scaffold worker in `apps/worker`
- [ ] Dequeue message, load Cosmos record
- [ ] Download raw blob, generate 256px thumbnail (`sharp`)
- [ ] Upload thumb to `thumb/` container
- [ ] Update Cosmos: `Processed`, set `thumbBlobPath`, `processedAt`
- [ ] Handle failure: update Cosmos `Failed`, increment `attempt`
- [ ] Idempotency check (skip if already Processed + thumb exists)
- [ ] Dockerfile
- [ ] Create Container Apps environment
- [ ] Create Container Apps Job with KEDA queue scaler
- [ ] Push image to GHCR, verify job executes

---

## M6 — Frontend

- [ ] Scaffold React (Vite) app in `apps/frontend`
- [ ] SWA auth config (`staticwebapp.config.json`)
- [ ] Sign-in / sign-out flow
- [ ] Upload page: POST /media → PUT /media/:id/content
- [ ] Gallery page: GET /media, display items + thumbnails
- [ ] Status indicator per item (Uploaded / Processing / Processed / Failed)
- [ ] Deploy to Azure Static Web Apps

---

## M7 — DevOps Polish

- [ ] GitHub Actions: `web.yml` (build + deploy SWA)
- [ ] GitHub Actions: `api.yml` (build + deploy Functions)
- [ ] GitHub Actions: `worker.yml` (build + push GHCR + update Container Apps Job)
- [ ] Add lint + unit test steps to all workflows
- [ ] GitHub Environments: `dev` with required reviewers (optional)
- [ ] Structured logs + correlation ID across API and worker
- [ ] Application Insights (P1)
- [ ] Finalize RUNBOOK.md
- [ ] Add evidence screenshots
- [ ] Final teardown test: delete RG, redeploy from scratch

---

## Backlog (P1/P2)

- [ ] Bicep IaC for full environment
- [ ] `POST /api/media/:id/reprocess` endpoint
- [ ] Poison queue handling (after 5 attempts → move to `process-queue-poison`)
- [ ] Blue/green deployment for API
- [ ] Search by tag UI + pagination
- [ ] Notifications on processing completion (email/webhook)
- [ ] Application Insights dashboard
