param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Start', 'Stop')]
    [string]$Mode
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$node = 'C:\Program Files\nodejs\node.exe'
$private = Join-Path $root 'private'
$stateFile = Join-Path $private 'launcher-state.json'
$apiEntry = Join-Path $root 'backend\server.mjs'
$httpsEntry = Join-Path $root 'windows\https-edge.mjs'
$envFile = Join-Path $private 'api.env'
$pfxFile = Join-Path $private 'localhost.pfx'
$launched = [System.Collections.Generic.List[object]]::new()
$mutex = $null
$locked = $false


# فقط پورت و مبدأ عمومی برگردانده می‌شوند؛ رمزهای فایل تنظیمات چاپ نمی‌شوند.
function Get-LauncherSettings {
    $source = @'
const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.APP_ORIGIN);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid API port.');
if (origin.protocol !== 'https:' || origin.hostname !== 'localhost' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('Invalid local HTTPS origin.');
const httpsPort = Number(origin.port || 443);
if (port === httpsPort) throw Error('API and HTTPS ports must differ.');
console.log(JSON.stringify({ port, origin: origin.origin, httpsPort }));
'@
    $output = @(& $node "--env-file=$envFile" --input-type=module --eval $source)
    if (($LASTEXITCODE -ne 0) -or ($output.Count -ne 1)) {
        throw 'خواندن تنظیمات عمومی راه‌انداز موفق نبود؛ فایل تنظیمات را بررسی کنید.'
    }
    return ($output[0] | ConvertFrom-Json)
}

function Show-LauncherMessage {
    param([string]$Text)
    [System.Windows.MessageBox]::Show($Text, 'BehMasir') | Out-Null
}

# شناسه و زمان ایجاد، مسیر برنامه و آرگومان فایل همگی بررسی می‌شوند.
function Get-RecordedProcess {
    param($Record)
    if ($Record.Entry -notin @($apiEntry, $httpsEntry)) {
        throw 'مسیر فرایند ثبت‌شده معتبر نیست؛ توقف خودکار انجام نشد.'
    }
    $process = Get-Process -Id ([int]$Record.ProcessId) -ErrorAction SilentlyContinue
    if ($null -eq $process) { return $null }
    if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$Record.StartTicks) {
        return $null
    }
    $details = Get-CimInstance Win32_Process -Filter ('ProcessId=' + [int]$Record.ProcessId)
    if (($process.Path -ine $node) -or ($null -eq $details) -or
        ([string]$details.CommandLine).IndexOf([string]$Record.Entry, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw 'هویت فرایند با سابقهٔ راه‌انداز مطابق نیست؛ از توقف آن خودداری شد.'
    }
    return $process
}

function Read-LauncherState {
    if (!(Test-Path -LiteralPath $stateFile)) { return @() }
    $state = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
    if (($state.Version -ne 1) -or ($state.Root -ine $root)) {
        throw 'فایل وضعیت راه‌انداز معتبر نیست؛ هیچ فرایندی متوقف نشد.'
    }
    return @($state.Processes)
}

function Save-LauncherState {
    $state = [ordered]@{ Version = 1; Root = $root; Processes = @($launched.ToArray()) }
    $temp = $stateFile + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
    try {
        [System.IO.File]::WriteAllText($temp, ($state | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temp -Destination $stateFile -Force
    }
    finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp }
    }
}

function Start-ManagedNode {
    param([string]$Entry)
    $arguments = '"--env-file=' + $envFile + '" "' + $Entry + '"'
    $process = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru
    # شیء فرایند بلافاصله ثبت می‌شود تا خطا موجب فراموش‌شدن آن نشود.
    $record = [pscustomobject]@{
        ProcessId = $process.Id
        StartTicks = $process.StartTime.ToUniversalTime().Ticks.ToString()
        Entry = $Entry
    }
    $launched.Add($record)
    Save-LauncherState
    return $record
}

function Wait-ManagedHealth {
    param($Record, [string]$Uri)
    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($null -eq (Get-RecordedProcess $Record)) {
            throw 'یکی از سرویس‌های نرم‌افزار پیش از آماده‌شدن متوقف شد.'
        }
        try {
            $reply = Invoke-RestMethod -Uri $Uri -Method Get -TimeoutSec 2
            if ($reply.ok -eq $true) { return }
        }
        catch { }
        Start-Sleep -Milliseconds 400
    }
    throw 'مهلت آماده‌شدن سرویس تمام شد؛ اتصال و تنظیمات را بررسی کنید.'
}

function Stop-RecordedProcesses {
    param([object[]]$Records)
    foreach ($record in @($Records | Sort-Object Entry -Descending)) {
        $process = Get-RecordedProcess $record
        if ($null -ne $process) {
            $process.Kill()
            if (!$process.WaitForExit(10000)) {
                throw 'توقف یکی از فرایندهای نرم‌افزار کامل نشد.'
            }
        }
    }
}

try {
    if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') {
        throw 'این راه‌انداز باید با گزینهٔ STA اجرا شود.'
    }
    if (!(Test-Path -LiteralPath $private -PathType Container)) {
        throw 'پوشهٔ محافظت‌شدهٔ private پیدا نشد.'
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $hash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))).Replace('-', '')
    }
    finally { $sha.Dispose() }
    $mutex = [Threading.Mutex]::new($false, ('Local\BehMasirLauncher-' + $hash))
    try { $locked = $mutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) {
        Show-LauncherMessage 'یک عملیات شروع یا توقف دیگر در حال انجام است. کمی صبر کنید.'
        exit 0
    }

    $records = @(Read-LauncherState)
    if ($Mode -eq 'Stop') {
        if ($records.Count -eq 0) {
            Show-LauncherMessage 'اجرایی توسط این راه‌انداز ثبت نشده است. پنجره‌های اجرای دستی را باید جداگانه متوقف کنید.'
            exit 0
        }
        Stop-RecordedProcesses $records
        Remove-Item -LiteralPath $stateFile -ErrorAction SilentlyContinue
        Show-LauncherMessage 'API و HTTPS متعلق به این راه‌انداز متوقف شدند. MySQL و پشتیبان‌گیری روزانه تغییر نکردند.'
        exit 0
    }

    foreach ($file in @($node, $envFile, $pfxFile, $apiEntry, $httpsEntry, (Join-Path $PSScriptRoot 'launcher-password.ps1'))) {
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "فایل لازم پیدا نشد: $file" }
    }
    $configuration = Get-LauncherSettings
    $apiPort = [int]$configuration.port
    $httpsPort = [int]$configuration.httpsPort
    $appOrigin = [string]$configuration.origin
    $apiHealthUri = 'http:' + '//127.0.0.1:' + $apiPort + '/api/health'
    $httpsHealthUri = $appOrigin + '/api/health'

    $live = @($records | Where-Object { $null -ne (Get-RecordedProcess $_) })
    if ($live.Count -gt 0) {
        if (($records.Count -eq 2) -and ($live.Count -eq 2) -and
            (@($live | Where-Object Entry -eq $apiEntry).Count -eq 1) -and
            (@($live | Where-Object Entry -eq $httpsEntry).Count -eq 1)) {
            Wait-ManagedHealth ($live | Where-Object Entry -eq $apiEntry) $apiHealthUri
            Wait-ManagedHealth ($live | Where-Object Entry -eq $httpsEntry) $httpsHealthUri
            Start-Process $appOrigin
            exit 0
        }
        throw 'اجرای قبلی ناقص است؛ ابتدا آیکون توقف و سپس شروع را بزنید.'
    }
    if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }

    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -in @($apiPort, $httpsPort) })
    if ($listeners.Count -gt 0) {
        throw "پورت $apiPort یا $httpsPort اشغال است. ابتدا اجرای دستی قبلی را متوقف کنید؛ هیچ فرایندی خودکار بسته نشد."
    }

    . (Join-Path $PSScriptRoot 'launcher-password.ps1')
    $secret = Read-BehMasirPfxPassword
    if ($null -eq $secret) { exit 0 }
    $plain = $null
    $certificate = $null
    try {
        $plain = [Net.NetworkCredential]::new('', $secret).Password
        $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
            $pfxFile, $plain, [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet
        )
        if (!$certificate.HasPrivateKey) { throw 'فایل PFX کلید خصوصی ندارد.' }
        if ($certificate.NotAfter -le (Get-Date)) { throw 'گواهی HTTPS منقضی شده است.' }
        $certificate.Dispose()
        $certificate = $null

        $api = Start-ManagedNode $apiEntry
        Wait-ManagedHealth $api $apiHealthUri

        $oldEnvironment = @{}
        foreach ($name in @('HTTPS_PFX', 'HTTPS_PFX_PASSWORD', 'EDGE_HOST')) {
            $oldEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        }
        try {
            $env:HTTPS_PFX = $pfxFile
            $env:HTTPS_PFX_PASSWORD = $plain
            $env:EDGE_HOST = '127.0.0.1'
            $https = Start-ManagedNode $httpsEntry
        }
        finally {
            foreach ($name in $oldEnvironment.Keys) {
                [Environment]::SetEnvironmentVariable($name, $oldEnvironment[$name], 'Process')
            }
            $oldEnvironment.Clear()
        }
        $plain = $null
        Wait-ManagedHealth $https $httpsHealthUri
    }
    finally {
        if ($null -ne $certificate) { $certificate.Dispose() }
        if ($null -ne $secret) { $secret.Dispose() }
        $plain = $null
    }
    Start-Process $appOrigin
}
catch {
    $message = $_.Exception.Message
    if (($Mode -eq 'Start') -and ($launched.Count -gt 0)) {
        try {
            Stop-RecordedProcesses ($launched.ToArray())
            if (Test-Path -LiteralPath $stateFile) { Remove-Item -LiteralPath $stateFile }
        }
        catch {
            $message += "`nتوقف کامل اجرای ناقص تأیید نشد؛ فایل وضعیت برای بررسی حفظ شد."
        }
    }
    Show-LauncherMessage $message
    exit 1
}
finally {
    if ($locked -and ($null -ne $mutex)) { $mutex.ReleaseMutex() }
    if ($null -ne $mutex) { $mutex.Dispose() }
}
