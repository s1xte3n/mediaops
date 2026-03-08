# Architectural Decision Records

## ADR-001: NestJS on Azure Functions (not a dedicated App Service)

**Decision:** Run the NestJS API using `@nestjs/azure-func-http` adapter on Azure Functions consumption plan.

**Why:** Functions consumption plan has a generous free tier (1M executions/month). A dedicated App Service would incur constant cost even at zero traffic. NestJS gives us a proper DI framework, decorators, and testability — better than raw Functions for a real API.

**Tradeoff:** Cold starts (~500ms) on consumption plan. Acceptable for a dev/portfolio project; mitigated by keeping the Function warm during demos.

---

## ADR-002: Azure Container Apps Job (not AKS or App Service)

**Decision:** Run the worker as a Container Apps Job triggered by queue depth (KEDA).

**Why:** The worker is inherently event-driven and short-lived — it processes one message and exits. Container Apps Jobs model this perfectly. AKS is overkill and costly. App Service is always-on and not suited for batch/job workloads.

**Tradeoff:** Container Apps Jobs are relatively new; less documentation than AKS. KEDA scale-to-zero means no cost when idle.

---

## ADR-003: GHCR instead of Azure Container Registry

**Decision:** Use GitHub Container Registry (GHCR) to host the worker image.

**Why:** ACR has no always-free tier — Basic SKU costs ~$5/month. GHCR is free for public repos and free for private repos under GitHub Free plan limits. Since our CI already runs on GitHub Actions, GHCR is a natural fit.

**Tradeoff:** Slightly more complex auth setup for Container Apps to pull from GHCR (requires a registry secret vs. native ACR managed identity integration).

---

## ADR-004: Cosmos DB key in Key Vault (not RBAC data plane)

**Decision:** Store the Cosmos DB primary key in Key Vault and fetch it at startup rather than using Cosmos DB RBAC data plane roles.

**Why:** Cosmos DB RBAC data plane is powerful but adds setup complexity for an MVP. Key Vault + Managed Identity is already in the stack — reusing it for Cosmos auth keeps the pattern consistent and simple.

**Tradeoff:** Rotating the Cosmos key requires updating the Key Vault secret and restarting the app. Acceptable for MVP; can migrate to data plane RBAC later.

---

## ADR-005: Upload via API (not direct SAS to client)

**Decision:** Client uploads file content to `PUT /api/media/:id/content`, which streams to Blob server-side.

**Why:** Simpler auth model — the API validates ownership before touching storage. Direct SAS upload would require the API to generate and return a SAS token, which adds complexity and means the client bypasses the API for the actual upload.

**Tradeoff:** All file bytes flow through the Function, which has a request size limit (100MB default). Fine for our 10MB media limit.

---

## ADR-006: Azure RBAC mode for Key Vault (not Access Policies)

**Decision:** Create Key Vault with `enableRbacAuthorization: true`.

**Why:** Access Policies are a legacy model. RBAC mode lets you manage Key Vault permissions with the same `az role assignment` commands used everywhere else in Azure. Cleaner, auditable, consistent.

**Tradeoff:** Slightly more Bicep to assign the role, but worth it.

## ADR-007: NestJS v10 (not v11)

**Decision:** Pin NestJS to v10 across the backend.

**Why:** `@nestjs/azure-func-http` (the adapter between NestJS and Azure Functions HTTP trigger) declares peer dependency on NestJS `^6.0.0 || ^7.0.0 || ^8.0.0 || ^9.0.0 || ^10.0.0` — it does not support v11 yet. Rather than writing a custom adapter, we downgrade to v10 which is still actively maintained and is what most Azure documentation targets.

**Tradeoff:** We're one major version behind. Revisit when `@nestjs/azure-func-http` publishes v11 support.

## ADR-008: Custom Azure Functions v4 HTTP wrapper (no third-party adapter)

**Decision:** Write a minimal custom wrapper that bridges the Azure Functions v4 HTTP model to NestJS/Express, instead of using `@nestjs/azure-func-http`.

**Why:** `@nestjs/azure-func-http` was built for the Functions v3 programming model which used `function.json` for function registration. The Functions v4 runtime uses code-based registration (`app.http(...)`) and ignores `function.json` entirely. The adapter is incompatible with v4 and has no published v4 support.

**How it works:** The wrapper registers one catch-all `app.http()` function. On each invocation it boots NestJS (cached after first boot), converts the v4 `HttpRequest` into a Node.js `IncomingMessage`, pipes it through Express, captures the response via a mock `ServerResponse`, and returns it as a v4 `HttpResponseInit`.

**Tradeoff:** More code to own and maintain vs. a third-party adapter. The wrapper is ~50 lines and well-understood, which is acceptable.

## ADR-009: KEY_VAULT_URI empty for local development

**Decision:** When `KEY_VAULT_URI` is empty or unset, `ConfigService` falls back to environment variables directly. Key Vault is only used in production where Managed Identity is available.

**Why:** `DefaultAzureCredential` cannot authenticate via Managed Identity on a local dev machine. Attempting to hit Key Vault locally causes silent worker crashes that are hard to debug.

**Tradeoff:** Developers must maintain a `local.settings.json` with real values. This file is gitignored and never committed.
