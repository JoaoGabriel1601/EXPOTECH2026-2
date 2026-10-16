$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$pythonExecutable = Join-Path $projectDirectory 'backend/.venv/Scripts/python.exe'
& $pythonExecutable -m app.localdev stop
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível encerrar o PostgreSQL do projeto.' }
