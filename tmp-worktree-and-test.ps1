$ErrorActionPreference = 'Stop'
$logRoot = 'D:\Projects\GitHub\accounting'
$setupLog = Join-Path $logRoot 'tmp-worktree-setup.txt'
$report = Join-Path $logRoot 'tmp-test-report.txt'

function Log($msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $setupLog -Value $line -Encoding UTF8
  Write-Output $line
}

Set-Content -Path $setupLog -Value '=== worktree setup start ===' -Encoding UTF8

# --- Create worktree ---
$Name = 'test-suite-' + -join ((1..8) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
Set-Location $logRoot
$RepoRoot = (git rev-parse --show-toplevel).Trim()
$WorktreeDir = Join-Path $env:USERPROFILE ".cursor\worktrees\$Name"
if (Test-Path $WorktreeDir) {
  Log "ERROR: worktree directory already exists: $WorktreeDir"
  exit 1
}
$WorktreeStartRef = if ($env:WORKTREE_START_REF) { $env:WORKTREE_START_REF } else { 'HEAD' }
Log "Creating worktree: $WorktreeDir from $WorktreeStartRef"
git worktree add --detach $WorktreeDir $WorktreeStartRef
$HeadCommit = (git -C $WorktreeDir rev-parse HEAD).Trim()
Log "WORKTREE_ID=$Name"
Log "WORKTREE_PATH=$WorktreeDir"
Log "REPO_ROOT=$RepoRoot"
Log "HEAD_COMMIT=$HeadCommit"
Log "WORKTREE_START_REF=$WorktreeStartRef"

# Persist mapping
@"
WORKTREE_ID=$Name
WORKTREE_PATH=$WorktreeDir
REPO_ROOT=$RepoRoot
HEAD_COMMIT=$HeadCommit
WORKTREE_START_REF=$WorktreeStartRef
"@ | Set-Content -Path (Join-Path $logRoot 'tmp-worktree-meta.txt') -Encoding UTF8

# --- Setup discovery ---
$setupRan = 'skipped'
$configCandidates = @(
  (Join-Path $WorktreeDir '.cursor\worktrees.json'),
  (Join-Path $RepoRoot '.cursor\worktrees.json')
)
$configPath = $null
foreach ($c in $configCandidates) {
  if (Test-Path $c) {
    Log "Found config: $c"
    if (-not $configPath) { $configPath = $c }
  } else {
    Log "No config at: $c"
  }
}
# Prefer WORKTREE_PATH copy if it has setup keys
$wtConfig = Join-Path $WorktreeDir '.cursor\worktrees.json'
$rootConfig = Join-Path $RepoRoot '.cursor\worktrees.json'
if (Test-Path $wtConfig) {
  $raw = Get-Content $wtConfig -Raw
  if ($raw -match 'setup-worktree') { $configPath = $wtConfig }
}
if (-not $configPath -and (Test-Path $rootConfig)) { $configPath = $rootConfig }

if ($configPath) {
  $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
  $cmds = $null
  if ($cfg.'setup-worktree-windows') { $cmds = $cfg.'setup-worktree-windows' }
  elseif ($cfg.'setup-worktree') { $cmds = $cfg.'setup-worktree' }
  if ($null -ne $cmds) {
    $setupRan = 'ran'
    $env:ROOT_WORKTREE_PATH = $RepoRoot
    Set-Location $WorktreeDir
    if ($cmds -is [string]) {
      Log "Running setup: $cmds"
      Invoke-Expression $cmds
    } else {
      foreach ($cmd in $cmds) {
        Log "Running setup: $cmd"
        Invoke-Expression $cmd
      }
    }
  } else {
    Log 'Config exists but no applicable Windows setup keys'
  }
} else {
  Log 'No worktrees.json found in either location'
}

# --- Run tests in worktree ---
Set-Location $WorktreeDir
$nodeV = (node -v 2>&1 | Out-String).Trim()
$pnpmV = (pnpm -v 2>&1 | Out-String).Trim()
Log "node=$nodeV pnpm=$pnpmV"

$lines = @(
  '=== HesabYar Test Report ==='
  "WORKTREE_ID=$Name"
  "WORKTREE_PATH=$WorktreeDir"
  "REPO_ROOT=$RepoRoot"
  "HEAD_COMMIT=$HeadCommit"
  "WORKTREE_START_REF=$WorktreeStartRef"
  "SETUP=$setupRan"
  "node: $nodeV"
  "pnpm: $pnpmV"
  "started: $(Get-Date -Format o)"
  ''
  '--- pnpm test ---'
)
$lines | Set-Content -Path $report -Encoding UTF8

$so = Join-Path $logRoot 'tmp-pnpm-test-stdout.txt'
$se = Join-Path $logRoot 'tmp-pnpm-test-stderr.txt'
$p = Start-Process -FilePath 'pnpm.cmd' -ArgumentList 'test' -WorkingDirectory $WorktreeDir -NoNewWindow -Wait -PassThru -RedirectStandardOutput $so -RedirectStandardError $se
"pnpm test exit: $($p.ExitCode)" | Add-Content -Path $report -Encoding UTF8
if (Test-Path $so) { Get-Content $so -Raw | Add-Content -Path $report -Encoding UTF8 }
if (Test-Path $se) {
  '--- stderr ---' | Add-Content -Path $report -Encoding UTF8
  Get-Content $se -Raw | Add-Content -Path $report -Encoding UTF8
}

$mainExit = $p.ExitCode
if ($mainExit -ne 0) {
  foreach ($pkg in @('@hesabyar/shared', '@hesabyar/desktop', '@hesabyar/server')) {
    "---`n$pkg" | Add-Content -Path $report -Encoding UTF8
    $safe = $pkg -replace '@hesabyar/', ''
    $pso = Join-Path $logRoot "tmp-$safe-out.txt"
    $pse = Join-Path $logRoot "tmp-$safe-err.txt"
    $c = Start-Process -FilePath 'pnpm.cmd' -ArgumentList '--filter', $pkg, 'test' -WorkingDirectory $WorktreeDir -NoNewWindow -Wait -PassThru -RedirectStandardOutput $pso -RedirectStandardError $pse
    "$pkg exit: $($c.ExitCode)" | Add-Content -Path $report -Encoding UTF8
    if (Test-Path $pso) { Get-Content $pso -Raw | Add-Content -Path $report -Encoding UTF8 }
    if (Test-Path $pse) { Get-Content $pse -Raw | Add-Content -Path $report -Encoding UTF8 }
  }
}

"REPORT_COMPLETE exit=$mainExit setup=$setupRan" | Add-Content -Path $report -Encoding UTF8
# Also copy report into worktree root as requested ("repo root" = worktree path for this session)
Copy-Item $report (Join-Path $WorktreeDir 'tmp-test-report.txt') -Force
Log "REPORT_COMPLETE exit=$mainExit"
exit $mainExit
