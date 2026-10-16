$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectDirectory 'backend'
$pythonExecutable = Join-Path $backendDirectory '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonExecutable)) {
    throw 'Prepare o ambiente Python conforme backend/README.md.'
}
Push-Location -LiteralPath $backendDirectory
try {
    & $pythonExecutable -m app.localdev start
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar o PostgreSQL do projeto.' }
    & $pythonExecutable -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload
} finally {
    Pop-Location
}
