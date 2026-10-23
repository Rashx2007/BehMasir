$ErrorActionPreference = 'Stop'

try {
    $root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $dump = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe'
    $config = Join-Path $root 'private\backup.cnf'
    $folder = Join-Path $root 'private\backups'

    foreach ($file in @($dump, $config)) {
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) {
            throw "Required file not found: $file"
        }
    }
    if (!(Test-Path -LiteralPath $folder -PathType Container)) {
        throw 'Backup folder not found.'
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $final = Join-Path $folder "behmasir-$stamp.sql"
    $partial = "$final.partial"

    if ((Test-Path -LiteralPath $final) -or (Test-Path -LiteralPath $partial)) {
        throw 'Backup filename already exists.'
    }

    & $dump "--defaults-extra-file=$config" --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 "--result-file=$partial" behmasir

    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump failed with exit code $LASTEXITCODE."
    }
    if (!(Test-Path -LiteralPath $partial -PathType Leaf)) {
        throw 'Backup output was not created.'
    }
    if ((Get-Item -LiteralPath $partial).Length -eq 0) {
        throw 'Backup output is empty.'
    }
    if (!(Get-Content -LiteralPath $partial -Tail 5 | Select-String -Pattern '^-- Dump completed on')) {
        throw 'Backup completion marker was not found.'
    }

    Move-Item -LiteralPath $partial -Destination $final -ErrorAction Stop
    Write-Output "Backup completed: $final"
    exit 0
}
catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}