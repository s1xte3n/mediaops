#!/usr/bin/env pwsh
# teardown.ps1 — deletes all project resources
# Usage: ./infra/scripts/teardown.ps1
# WARNING: This is irreversible. All data will be lost.

$resourceGroup = "rg-mediaops-dev"

Write-Host "WARNING: This will delete resource group '$resourceGroup' and everything in it." -ForegroundColor Red
Write-Host "This includes: Storage, Cosmos DB, Key Vault, Managed Identities, Container Apps, Functions." -ForegroundColor Yellow
$confirm = Read-Host "Type 'yes' to confirm"

if ($confirm -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Green
    exit 0
}

Write-Host "Deleting resource group $resourceGroup..." -ForegroundColor Yellow

az group delete `
  --name $resourceGroup `
  --yes `
  --no-wait

Write-Host "Deletion initiated (running in background)." -ForegroundColor Green
Write-Host "Run 'az group show --name $resourceGroup' to check status." -ForegroundColor Cyan