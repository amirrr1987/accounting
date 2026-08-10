# Rebuild shared + seed fiscal year for current Jalali year
# Run from repo root: powershell -File scripts/apply-date-fix.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "==> Building @hesabyar/shared..." -ForegroundColor Cyan
pnpm --dir packages/shared build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Testing @hesabyar/shared..." -ForegroundColor Cyan
pnpm --dir packages/shared test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Seeding DB (activates current Jalali fiscal year)..." -ForegroundColor Cyan
pnpm --dir apps/server prisma:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Done. Restart server (pnpm dev:server) if it was already running." -ForegroundColor Green
