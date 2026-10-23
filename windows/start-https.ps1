$ErrorActionPreference = 'Stop'

$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$node = 'C:\Program Files\nodejs\node.exe'
$envFile = Join-Path $root 'private\api.env'
$pfxFile = Join-Path $root 'private\localhost.pfx'
$edgeFile = Join-Path $root 'windows\https-edge.mjs'

$secret = $null
$exitCode = 0

try {
    foreach ($file in @($node, $envFile, $pfxFile, $edgeFile)) {
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "فایل لازم پیدا نشد: $file"
        }
    }

    $secret = Read-Host 'رمز فایل PFX را وارد کنید و Enter بزنید' -AsSecureString

    if ($secret.Length -eq 0) {
        throw 'رمز خالی است؛ HTTPS اجرا نشد.'
    }

    $env:HTTPS_PFX = $pfxFile
    $env:HTTPS_PFX_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
    $env:EDGE_HOST = '127.0.0.1'

    & $node "--env-file=$envFile" $edgeFile

    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "فرایند HTTPS با کد خطای $exitCode متوقف شد."
    }
}
catch {
    Write-Host ('خطا: ' + $_.Exception.Message) -ForegroundColor Red
    $exitCode = 1
}
finally {
    Remove-Item Env:\HTTPS_PFX_PASSWORD,Env:\HTTPS_PFX,Env:\EDGE_HOST -ErrorAction SilentlyContinue

    if ($null -ne $secret) {
        $secret.Dispose()
    }
}

exit $exitCode