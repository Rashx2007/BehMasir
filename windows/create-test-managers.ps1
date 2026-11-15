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
if (-not (Test-Path -LiteralPath $EnvFile)) { throw 'Private test configuration is missing.' }
$Listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $_.LocalPort -in @(3002, 8444) })
if ($Listeners.Count -gt 0) { throw 'Stop the upgrade API and HTTPS first. Leave MySQL running.' }
$Backups = @(Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'private') `
    -Filter 'before-scoped-test-accounts-*.sql' -File |
    Where-Object { $_.Length -gt 1024 -and $_.LastWriteTime -gt (Get-Date).AddDays(-1) })
if ($Backups.Count -eq 0) { throw 'A recent before-scoped-test-accounts SQL backup is required.' }
Write-Host 'TEST ONLY: create two APPLICATION users in behmasir_upgrade_verify.'
Write-Host 'test_mgr_support: units 11,1,3,9. test_mgr_office: unit 1.'
Write-Host 'Read-only requests and reports. No approval, create, edit, dispatch or account-management permission.'
Write-Host 'Existing accounts will not be replaced. This does NOT create MySQL users or change database grants.'
Write-Host 'Choose TWO DIFFERENT passwords (12-128 characters). These are NOT MySQL root or certificate passwords.'
$Confirmation = Read-Host 'Type TEST-MANAGERS to create and SAVE these two test accounts'
if ($Confirmation -cne 'TEST-MANAGERS') { throw 'Cancelled without changes.' }
function Read-PrivateText([string]$Label) {
    $Secure = Read-Host $Label -AsSecureString
    $Pointer = [IntPtr]::Zero
    try {
        $Pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Pointer)
    } finally {
        if ($Pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Pointer) }
        if ($Secure) { $Secure.Dispose() }
    }
}
$Support = $null
$Office = $null
$Again = $null
$InputJson = $null
$OldEncoding = $OutputEncoding
$ExitCode = 1
try {
    $Support = Read-PrivateText 'Password for test_mgr_support'
    $Again = Read-PrivateText 'Repeat password for test_mgr_support'
    if ($Support -cne $Again) { throw 'Passwords do not match. No accounts were created.' }
    $Again = $null
    $Office = Read-PrivateText 'Password for test_mgr_office'
    $Again = Read-PrivateText 'Repeat password for test_mgr_office'
    if ($Office -cne $Again) { throw 'Passwords do not match. No accounts were created.' }
    if ($Support.Length -lt 12 -or $Support.Length -gt 128 -or $Office.Length -lt 12 -or $Office.Length -gt 128) {
        throw 'Each password must be 12-128 characters. No accounts were created.'
    }
    if ($Support -ceq $Office) { throw 'Use different passwords for these two accounts.' }
    $OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $InputJson = @{ confirmation = $Confirmation; passwords = @{ support = $Support; office = $Office } } | ConvertTo-Json -Compress
    $InputJson | & node "--env-file=$EnvFile" (Join-Path $ProjectRoot 'backend\create-test-managers.mjs')
    $ExitCode = $LASTEXITCODE
} finally {
    $Support = $null
    $Office = $null
    $Again = $null
    $InputJson = $null
    $OutputEncoding = $OldEncoding
}
if ($ExitCode -ne 0) { throw 'Test account setup did not complete. Do not rerun blindly; send only the sanitized output.' }
Write-Host 'Finished. Keep the upgrade API/HTTPS stopped until instructed. Do not commit or push yet.'
