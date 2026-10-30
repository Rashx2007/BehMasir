param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if ((Split-Path -Leaf $ProjectRoot) -ne 'DB-upgrade') {
    throw 'Only the DB-upgrade worktree is permitted.'
}
$Branch = & git -C $ProjectRoot branch --show-current
if ($LASTEXITCODE -ne 0 -or $Branch -ne 'feature/org-workflow-audit') {
    throw 'Expected branch feature/org-workflow-audit.'
}
$EnvFile = Join-Path $ProjectRoot 'private\api.env'
if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw 'The private test configuration is missing.'
}
$Config = Get-Content -LiteralPath $EnvFile
foreach ($Expected in @('DB_NAME=behmasir_upgrade_verify', 'PORT=3002', 'APP_ORIGIN=https://localhost:8444')) {
    if ($Config -notcontains $Expected) {
        throw 'The configuration does not match the isolated test environment.'
    }
}
$Listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $_.LocalPort -in @(3002, 8444) })
if ($Listeners.Count -gt 0) {
    throw 'Stop the UPGRADE test API and HTTPS before migration.'
}
$Backups = @(Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'private') `
    -Filter 'before-scoped-permissions-*.sql' -File | Where-Object { $_.Length -gt 1024 -and $_.LastWriteTime -gt (Get-Date).AddDays(-1) })
if ($Backups.Count -eq 0) {
    throw 'A recent before-scoped-permissions SQL backup is required.'
}
Write-Host 'TEST ONLY: behmasir_upgrade_verify. DDL is not atomic.'
Write-Host 'This script does not start services, modify the live database or change account grants.'
Write-Host 'Dormant foundation only; no user accounts or active scope assignments will be created.'
$Confirmation = Read-Host 'Type TEST-ACCESS to continue'
if ($Confirmation -cne 'TEST-ACCESS') {
    throw 'Cancelled without changes.'
}
$Secure = Read-Host 'MySQL root password (not the application password)' -AsSecureString
$Pointer = [IntPtr]::Zero
$OldEncoding = $OutputEncoding
$ExitCode = 1
try {
    $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    $Plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $InputJson = @{ password = $Plain } | ConvertTo-Json -Compress
    $NodeArgs = @((Join-Path $ProjectRoot 'backend\install-access.mjs'))
    $InputJson | & node @NodeArgs
    $ExitCode = $LASTEXITCODE
} finally {
    $Plain = $null
    $InputJson = $null
    if ($Pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer)
    }
    if ($Secure) { $Secure.Dispose() }
    $OutputEncoding = $OldEncoding
}
if ($ExitCode -ne 0) {
    throw 'Access installation did not complete. Stop here; do not rerun blindly.'
}
Write-Host 'Installed on the test database only. Do not start the API until instructed.'
