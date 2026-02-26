# Project Context

## Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React (Vite) | Azure Static Web Apps (Free) |
| API | NestJS | Azure Functions (Node.js 22) |
| Worker | Node.js 22 | Azure Container Apps Job |
| Storage | Azure Blob Storage | Storage Account |
| Queue | Azure Storage Queue | Storage Account |
| Metadata | Azure Cosmos DB NoSQL | Free Tier |
| Eventing | Azure Event Grid | System Topic |
| Secrets | Azure Key Vault | RBAC mode |
| Identity | Managed Identity | User-assigned |
| CI/CD | GitHub Actions | GHCR for images |
| IaC | Bicep | |

## Constraints

- Stay within Azure free tier / free grants where possible
- No ACR (use GHCR to avoid cost)
- One Cosmos DB Free Tier account per subscription — this project claims it
- Teardown must be possible with a single script (delete resource group)
- No secrets in code or repo — Key Vault + Managed Identity only

## Azure Naming Conventions

Pattern: `{type}-{project}-{env}`

| Resource | Name |
|---|---|
| Resource Group | `rg-mediaops-dev` |
| Storage Account | `stmediaopsdev` (no hyphens, max 24 chars, lowercase) |
| Cosmos DB Account | `cosmos-mediaops-dev` |
| Key Vault | `kv-mediaops-dev` |
| Container Apps Environment | `cae-mediaops-dev` |
| Container Apps Job | `caj-mediaops-worker-dev` |
| Function App | `func-mediaops-api-dev` |
| Static Web App | `swa-mediaops-dev` |
| App Service Plan | `asp-mediaops-dev` |
| Event Grid System Topic | `evgt-mediaops-dev` |
| Managed Identity (backend) | `mi-mediaops-backend-dev` |
| Managed Identity (worker) | `mi-mediaops-worker-dev` |

## Azure Resource Configuration

### Storage Account
- Blobs: `raw`, `thumb`
- Queue: `process-queue`
- Poison queue: `process-queue-poison`

### Cosmos DB
- Database: `mediaops`
- Container: `MediaItems`
- Partition key: `/ownerId`
- Free Tier: enabled

### Key Vault
- Auth mode: Azure RBAC (not access policies)
- Secrets:
  - `cosmos-endpoint`
  - `cosmos-primary-key`
  - `storage-connection-string`

### Blob Layout
- `raw/{ownerId}/{mediaId}/{originalFilename}`
- `thumb/{ownerId}/{mediaId}/256_{originalFilename}`

### Queue Message Schema
```json
{
  "v": 1,
  "correlationId": "<uuid>",
  "mediaId": "<uuid>",
  "ownerId": "<entra-object-id>",
  "rawBlobPath": "raw/<ownerId>/<mediaId>/filename.png",
  "contentType": "image/png",
  "enqueuedAt": "<ISO8601>",
  "attempt": 1
}
```

## Environment Variables

See `.env.example` in repo root for all required variables.
Local dev uses `.env` (never committed).
Production values live in Key Vault — fetched at runtime via Managed Identity.

## Location

Primary region: `eastus` (good free tier availability)
