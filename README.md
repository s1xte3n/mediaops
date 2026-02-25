# Contoso MediaOps

A real-world media ingestion and processing platform built to demonstrate Azure Developer (AZ-204) and DevOps skills.

## What it does
Upload an image or JSON → event triggers processing → thumbnail generated → metadata catalogued → searchable gallery.

## Stack
- **Frontend:** React (Vite) → Azure Static Web Apps
- **API:** NestJS → Azure Functions
- **Worker:** Node.js container → Azure Container Apps Job
- **Storage:** Azure Blob Storage + Azure Storage Queue
- **Metadata:** Azure Cosmos DB (NoSQL, Free Tier)
- **Eventing:** Azure Event Grid
- **Secrets:** Azure Key Vault + Managed Identity
- **CI/CD:** GitHub Actions
- **IaC:** Bicep

## Docs
- [Architecture](docs/ARCHITECTURE.md)
- [Runbook](docs/RUNBOOK.md)
- [Tasks](docs/TASKS.md)
- [Decisions](docs/DECISIONS.md)
- [Cost](docs/COST.md)
- [Security](docs/SECURITY.md)

## Quick start
See [RUNBOOK.md](docs/RUNBOOK.md) for setup and deployment instructions.
