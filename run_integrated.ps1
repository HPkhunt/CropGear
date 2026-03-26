$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host ""
Write-Host "  CropGear — Starting Development Servers" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor DarkGray
Write-Host ""

# --- Backend ---
Write-Host "[backend] Starting FastAPI on http://127.0.0.1:8000 ..." -ForegroundColor Green
$backend = Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" `
    -WorkingDirectory "$root\backend" `
    -PassThru -NoNewWindow

# --- Frontend ---
if (!(Test-Path "$root\frontend\node_modules")) {
    Write-Host "[frontend] Installing dependencies..." -ForegroundColor Yellow
    Push-Location "$root\frontend"
    npm install
    Pop-Location
}

Write-Host "[frontend] Starting Vite on http://localhost:5173 ..." -ForegroundColor Green
$frontend = Start-Process -FilePath "npm" `
    -ArgumentList "run dev" `
    -WorkingDirectory "$root\frontend" `
    -PassThru -NoNewWindow

Write-Host ""
Write-Host "  Both servers running. Press Ctrl+C to stop." -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""

try {
    Wait-Process -Id $backend.Id
} finally {
    if (!$frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    if (!$backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    Write-Host ""
    Write-Host "Servers stopped." -ForegroundColor Yellow
}
