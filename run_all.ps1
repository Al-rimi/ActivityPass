<#
Automated setup & run script for ActivityPass.
Steps:
1. Backend venv create/activate
2. Install Python deps
3. Migrate + seed students
4. Start Django server (new window)
5. Frontend install deps
6. Start React dev server
Requires: PowerShell, Python 3.11+, Node.js & npm, MySQL running.
#>

param(
    [string]$PythonPath = 'python',
    [string]$Host = '0.0.0.0',
    [int]$Port = 8000,
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

Write-Host "[ActivityPass] Starting automated setup..." -ForegroundColor Cyan

# Paths
$RepoRoot = Split-Path $PSScriptRoot -Parent | Split-Path -Parent | Split-Path -Parent | Split-Path -Parent | Split-Path -Parent
# On Windows PSScriptRoot already points to repo root in this context, fallback:
if (-not (Test-Path (Join-Path $PSScriptRoot 'backend'))) { $RepoRoot = $PSScriptRoot }
$Backend = Join-Path $RepoRoot 'backend'
$Frontend = Join-Path $RepoRoot 'frontend'

Push-Location $Backend
if (-not (Test-Path '.venv')) {
    Write-Host "[Backend] Creating virtual environment" -ForegroundColor Yellow
    & $PythonPath -m venv .venv
}

Write-Host "[Backend] Activating virtual environment" -ForegroundColor Yellow
$venvActivate = Join-Path '.venv' 'Scripts' 'Activate.ps1'
. $venvActivate

Write-Host "[Backend] Installing dependencies" -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host "[Backend] Applying migrations" -ForegroundColor Yellow
python manage.py migrate

if (-not $SkipSeed) {
    Write-Host "[Backend] Seeding students" -ForegroundColor Yellow
    try { python manage.py seed_students } catch { Write-Warning "Seeding failed: $_" }
}

Write-Host "[Backend] Starting Django server on $Host:$Port (new window)" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit","cd `"$Backend`"; . ./.venv/Scripts/Activate.ps1; python manage.py runserver $Host`:$Port"

Pop-Location

Push-Location $Frontend
Write-Host "[Frontend] Installing npm dependencies" -ForegroundColor Yellow
npm install

Write-Host "[Frontend] Starting React dev server" -ForegroundColor Green
npm start
Pop-Location
