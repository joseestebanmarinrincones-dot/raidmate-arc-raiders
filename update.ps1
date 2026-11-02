# RaidMate updater for a downloaded (non-git) copy.
# It downloads the latest main branch and copies the app files over this folder.
# Your browser progress (routes, notes, timer, hotkey) is stored in localStorage
# and is not touched by this script.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = "https://github.com/joseestebanmarinrincones-dot/raidmate-arc-raiders"
$zip = Join-Path $env:TEMP "raidmate-update.zip"
$tmp = Join-Path $env:TEMP ("raidmate-update-" + [guid]::NewGuid().ToString("N"))

Write-Host ""
Write-Host "  RAIDMATE updater" -ForegroundColor Yellow
Write-Host "  Destino: $root"
Write-Host "  Cierra el servidor local (start.bat) antes de continuar."
Write-Host ""

$answer = Read-Host "Descargar la ultima version? [s/N]"
if ($answer -notin @("s", "S", "si", "Si", "SI", "y", "Y")) {
  Write-Host "Cancelado."
  exit 0
}

try {
  Write-Host "Descargando..."
  Invoke-WebRequest -Uri "$repo/archive/refs/heads/main.zip" -OutFile $zip -UseBasicParsing
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  $source = Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1
  if (-not $source) { throw "No se encontro la carpeta dentro del ZIP." }

  Write-Host "Copiando archivos..."
  Get-ChildItem -LiteralPath $source.FullName -Force | ForEach-Object {
    if ($_.Name -eq ".git") { return }
    Copy-Item -LiteralPath $_.FullName -Destination $root -Recurse -Force
  }

  if (Test-Path (Join-Path $root "version.json")) {
    $version = Get-Content (Join-Path $root "version.json") -Raw | ConvertFrom-Json
    Write-Host ""
    Write-Host "Actualizado a v$($version.version) ($($version.released))." -ForegroundColor Green
  } else {
    Write-Host ""
    Write-Host "Archivos copiados." -ForegroundColor Green
  }
  Write-Host "Vuelve a ejecutar start.bat."
} catch {
  Write-Host ""
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Puedes descargar el ZIP manualmente desde $repo/releases"
  exit 1
} finally {
  Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
