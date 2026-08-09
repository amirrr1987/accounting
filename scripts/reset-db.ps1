# Reset HesabYar DB and seed default admin (must change password on first login)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$envFile = "apps\server\.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_.Split('=', 2)
    if ($pair.Length -eq 2) {
      $name = $pair[0].Trim()
      $value = $pair[1].Trim().Trim('"')
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

Write-Host "==> Build shared"
pnpm --filter @hesabyar/shared build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Prisma migrate reset (drop + migrate + seed)"
pnpm --filter @hesabyar/server exec prisma migrate reset --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK: DB empty + seeded. Login admin/admin then change password."
