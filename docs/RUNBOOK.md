# Runbook

## Prerequisites
- Azure CLI 2.60+
- Node.js 22
- PowerShell (recommended on Windows for Azure CLI)

## Initial Deployment

### 1.1 Login
```powershell
az login
az account set --subscription "<your-subscription-id>"
```

## Local Development

### 1.2 Backend (NestJS on Functions)

1. Fill in `apps/backend/local.settings.json` with real Azure values:
   - `COSMOS_ENDPOINT` — from `az cosmosdb show --query documentEndpoint`
   - `COSMOS_PRIMARY_KEY` — from `az cosmosdb keys list --query primaryMasterKey`
   - `STORAGE_CONNECTION_STRING` — from `az storage account show-connection-string`
   - Leave `KEY_VAULT_URI` empty (local dev uses env vars directly)

2. Build and start:
```powershell
cd apps/backend
npm run build
npm start
```

3. Test:
```powershell
curl http://localhost:7071/api/healthz
curl -X POST http://localhost:7071/api/media `
  -H "Content-Type: application/json" `
  -H "x-dev-owner-id: user-123" `
  -d '{"filename":"cat.png","contentType":"image/png"}'
```

### 1.3 Auth stub for local dev

Production auth uses the SWA `x-ms-client-principal` header.
Locally, pass `x-dev-owner-id: <any-string>` to set the owner identity without real auth.

### 2. Resource Group
```powershell
az group create --name rg-mediaops-dev --location eastus
```

### 3. Storage
```powershell
az storage account create `
  --name stmediaopsdev `
  --resource-group rg-mediaops-dev `
  --location eastus `
  --sku Standard_LRS `
  --kind StorageV2 `
  --allow-blob-public-access false

az storage container create --name raw --account-name stmediaopsdev --auth-mode login
az storage container create --name thumb --account-name stmediaopsdev --auth-mode login
az storage queue create --name process-queue --account-name stmediaopsdev --auth-mode login
az storage queue create --name process-queue-poison --account-name stmediaopsdev --auth-mode login
```

### 4. Cosmos DB
```powershell
az cosmosdb create `
  --name cosmos-mediaops-dev `
  --resource-group rg-mediaops-dev `
  --kind GlobalDocumentDB `
  --default-consistency-level Session `
  --enable-free-tier true `
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false

az cosmosdb sql database create `
  --account-name cosmos-mediaops-dev `
  --resource-group rg-mediaops-dev `
  --name mediaops

az cosmosdb sql container create `
  --account-name cosmos-mediaops-dev `
  --resource-group rg-mediaops-dev `
  --database-name mediaops `
  --name MediaItems `
  --partition-key-path /ownerId `
  --throughput 400
```

### 5. Key Vault
```powershell
az keyvault create `
  --name kv-mediaops-dev `
  --resource-group rg-mediaops-dev `
  --location eastus `
  --enable-rbac-authorization true

# Assign yourself Secrets Officer
az role assignment create `
  --role "Key Vault Secrets Officer" `
  --assignee "<your-object-id>" `
  --scope "/subscriptions/<sub-id>/resourcegroups/rg-mediaops-dev/providers/Microsoft.KeyVault/vaults/kv-mediaops-dev"
```

### 6. Managed Identities + RBAC
See SECURITY.md for full role assignment matrix.

### 7. Key Vault Secrets
```powershell
az keyvault secret set --vault-name kv-mediaops-dev --name cosmos-endpoint --value "<value>"
az keyvault secret set --vault-name kv-mediaops-dev --name cosmos-primary-key --value "<value>"
az keyvault secret set --vault-name kv-mediaops-dev --name storage-connection-string --value "<value>"
```

## Teardown
```powershell
./infra/scripts/teardown.ps1
```

## Rotating a Key Vault Secret
```powershell
az keyvault secret set --vault-name kv-mediaops-dev --name <secret-name> --value "<new-value>"
# Then restart the Function App or Container Apps Job to pick up the new value
```

## Reprocessing a Failed Item
(fill in M5)

## Troubleshooting

### Key Vault Forbidden on secret set
**Error:** `Caller is not authorized to perform action on resource... ForbiddenByRbac`

**Cause:** Creating a Key Vault with `--enable-rbac-authorization true` grants nobody access by default — including the creator. This is correct RBAC behaviour, not a bug.

**Fix:** Assign yourself `Key Vault Secrets Officer` on the vault, then wait 1-2 minutes for propagation before retrying.
```powershell
az role assignment create `
  --role "Key Vault Secrets Officer" `
  --assignee "<your-object-id>" `
  --scope "/subscriptions/<sub-id>/resourcegroups/rg-mediaops-dev/providers/Microsoft.KeyVault/vaults/kv-mediaops-dev"
```

### Cosmos role assignments appear empty after creation
**Error:** `az cosmosdb sql role assignment list` returns no rows despite assignments appearing to succeed.

**Cause:** Unknown — possibly a propagation delay or a silent failure on first attempt.

**Fix:** Rerun the role assignment commands. Verify with `az cosmosdb sql role assignment list` after each one. Note that Cosmos data plane RBAC is a separate system from Azure RBAC — use `az cosmosdb sql role assignment` commands, not `az role assignment`.

### Partition key path mangled on Windows Git Bash
**Error:** `The partition key component definition path 'C:/Program Files/Git/ownerId' could not be accepted`

**Cause:** Git Bash on Windows intercepts paths starting with `/` and expands them to absolute Windows paths before the Azure CLI sees them.

**Fix:** Use PowerShell instead of Git Bash for all Azure CLI commands on Windows. Alternatively prefix the path with `//` in Git Bash (e.g. `//ownerId`) to suppress path expansion — but PowerShell is the better long-term choice.

### Functions v4 runtime not finding functions
**Symptom:** `No job functions found` despite function code existing.

**Cause 1:** Missing `main` field in `package.json`. The v4 runtime uses `main` to find the entry point that registers functions via `app.http(...)`.
**Fix:** Add `"main": "functions/http/index.js"` to `package.json`.

**Cause 2:** `function.json` files (v3 model) are ignored by the v4 runtime.
**Fix:** Use code-based registration (`app.http(...)` from `@azure/functions`) instead.

### NestJS worker crashes on first request
**Symptom:** `Language Worker Process exited. Pid=XXXXX` with code 1.

**Cause:** Missing peer dependencies. NestJS `ValidationPipe` requires `class-validator` and `class-transformer`.
**Fix:** `npm install class-validator class-transformer`

### Storage Blob list permission denied for CLI user
**Error:** `You do not have the required permissions needed to perform this operation`

**Cause:** Only managed identities were assigned Storage Blob roles during initial setup. Your CLI user identity was not included.

**Fix:** Assign yourself `Storage Blob Data Reader` for read operations:
```powershell
$myId = az ad signed-in-user show --query id --output tsv
az role assignment create `
  --role "Storage Blob Data Reader" `
  --assignee $myId `
  --scope "/subscriptions/<sub-id>/resourcegroups/rg-mediaops-dev/providers/Microsoft.Storage/storageAccounts/stmediaopsdev"
```

### $id variable empty in PowerShell
**Cause:** PowerShell variables don't persist across sessions or windows.
**Fix:** Always create a new media record and capture `$id` in the same session before uploading.

### @nestjs/azure-func-http incompatible with NestJS v11
**Symptom:** `ERESOLVE unable to resolve dependency tree` — peer dep requires NestJS ^10.
**Fix:** Pin NestJS to v10. See ADR-007.
