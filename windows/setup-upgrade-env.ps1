# Configure ONLY the isolated development worktree and verification database.
# Does not start services, copy certificates, or modify the original environment.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$private = Join-Path $root 'private'
$envFile = Join-Path $private 'api.env'
$mysql = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
$node = 'C:\Program Files\nodejs\node.exe'
$sqlFile = $null
$probeFile = $null
$rng = $null
$bytes = $null
$dbPassword = $null
$envText = $null
$sql = $null
$exitCode = 0

try {
    if ([IO.Path]::GetFileName($root) -ine 'DB-upgrade') {
        throw 'Run this script only from the DB-upgrade worktree.'
    }
    $branch = @(& git -C $root branch --show-current)
    if (($LASTEXITCODE -ne 0) -or ($branch.Count -ne 1) -or
        ($branch[0] -ne 'feature/org-workflow-audit')) {
        throw 'Unexpected Git branch. No account or configuration was created.'
    }
    & git -C $root check-ignore --quiet private/api.env
    if ($LASTEXITCODE -ne 0) {
        throw 'private/api.env is not ignored by Git.'
    }
    foreach ($path in @($mysql, $node, (Join-Path $root 'backend\node_modules\mysql2\promise.js'))) {
        if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Required program or dependency is missing: $path"
        }
    }
    if (!(Test-Path -LiteralPath $private -PathType Container)) {
        throw 'The protected private directory must be created first.'
    }
    $directory = Get-Item -LiteralPath $private
    if (($directory.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'The private directory must not be a link or reparse point.'
    }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $allowedSids = @($identity.User.Value, 'S-1-5-18')
    $acl = Get-Acl -LiteralPath $private
    if (!$acl.AreAccessRulesProtected) {
        throw 'Private directory inheritance is not disabled.'
    }
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if (($rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow) -and
            ($rule.IdentityReference.Value -notin $allowedSids)) {
            throw 'The private directory grants access to an unexpected account.'
        }
    }
    if (Test-Path -LiteralPath $envFile) {
        throw 'private/api.env already exists. Do not overwrite it or repeat setup blindly.'
    }
    & npm.cmd --prefix (Join-Path $root 'backend') test
    if ($LASTEXITCODE -ne 0) {
        throw 'Development tests failed. No account or configuration was created.'
    }

    $dbUser = 'bm_upgrade_' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $dbPassword = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    $envText = @"
APP_ORIGIN=https://localhost:8444
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=behmasir_upgrade_verify
DB_USER=$dbUser
DB_PASSWORD=$dbPassword
DB_POOL=5
SESSION_COOKIE_NAME=__Host-behmasir-upgrade
"@

    # Save generated credentials securely BEFORE creating the account, so partial
    # failure cannot lose its password. Never print the credentials.
    $stream = [IO.File]::Open($envFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try {
        $payload = [Text.UTF8Encoding]::new($false).GetBytes($envText + "`r`n")
        try { $stream.Write($payload, 0, $payload.Length) }
        finally { [Array]::Clear($payload, 0, $payload.Length) }
    }
    finally { $stream.Dispose() }

    $sqlFile = Join-Path $private ('setup-account-' + [Guid]::NewGuid().ToString('N') + '.sql')
    $sql = @"
CREATE USER '$dbUser'@'127.0.0.1' IDENTIFIED BY '$dbPassword';
GRANT SELECT,INSERT,UPDATE,DELETE ON behmasir_upgrade_verify.* TO '$dbUser'@'127.0.0.1';
"@
    [IO.File]::WriteAllText($sqlFile, $sql, [Text.UTF8Encoding]::new($false))
    $sourcePath = $sqlFile.Replace('\', '/')
    Write-Host 'Enter the existing MySQL root password when prompted. Do not share it.'
    & $mysql --host=127.0.0.1 --user=root --password --default-character-set=utf8mb4 "--execute=source $sourcePath"
    if ($LASTEXITCODE -ne 0) {
        throw 'Account setup reported an error. Keep private/api.env; do not rerun setup.'
    }

    # Probe using the NEW restricted account, not root. Only sanitized status is printed.
    $probe = @'
import mysql from "../backend/node_modules/mysql2/promise.js";
let connection;
let failed = false;
try {
  if (process.env.DB_NAME !== "behmasir_upgrade_verify" ||
      process.env.APP_ORIGIN !== "https://localhost:8444" ||
      process.env.PORT !== "3002" ||
      process.env.SESSION_COOKIE_NAME !== "__Host-behmasir-upgrade")
    throw Object.assign(new Error(), { code: "WRONG_TEST_CONFIG" });
  connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, charset: "utf8mb4", dateStrings: true
  });
  const [[row]] = await connection.execute(
    "SELECT DATABASE() AS db,(SELECT MAX(version) FROM schema_migrations) AS version," +
    "(SELECT COUNT(*) FROM vehicle_types) AS types,(SELECT COUNT(*) FROM vehicles) AS vehicles"
  );
  if (row.db !== "behmasir_upgrade_verify" || Number(row.version) < 2)
    throw Object.assign(new Error(), { code: "WRONG_TEST_SCHEMA" });
  console.log("Test DB connection OK: " + row.db +
    "; schema=" + row.version + "; types=" + row.types + "; vehicles=" + row.vehicles);
} catch (e) {
  failed = true;
  console.error("Test DB probe failed: " + (e.code || "CHECK_FAILED"));
} finally {
  if (connection) await connection.end();
}
process.exitCode = failed ? 1 : 0;
'@
    $probeFile = Join-Path $private ('probe-' + [Guid]::NewGuid().ToString('N') + '.mjs')
    [IO.File]::WriteAllText($probeFile, $probe, [Text.UTF8Encoding]::new($false))
    & $node "--env-file=$envFile" $probeFile
    if ($LASTEXITCODE -ne 0) {
        throw 'Restricted-account verification failed. Keep private/api.env and report only the error code.'
    }
    Write-Host 'Test configuration is ready. No services were started.'
}
catch {
    Write-Host ('Setup stopped: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'Do not send private/api.env, the temporary SQL, or any password in chat.'
    if (Test-Path -LiteralPath $envFile) {
        Write-Host 'The private environment file was retained for controlled troubleshooting. Do not rerun setup.'
    }
    $exitCode = 1
}
finally {
    if (($null -ne $sqlFile) -and (Test-Path -LiteralPath $sqlFile)) {
        Remove-Item -LiteralPath $sqlFile -ErrorAction SilentlyContinue
    }
    if (($null -ne $probeFile) -and (Test-Path -LiteralPath $probeFile)) {
        Remove-Item -LiteralPath $probeFile -ErrorAction SilentlyContinue
    }
    if ($null -ne $rng) { $rng.Dispose() }
    if ($null -ne $bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
    $dbPassword = $null
    $envText = $null
    $sql = $null
}
exit $exitCode