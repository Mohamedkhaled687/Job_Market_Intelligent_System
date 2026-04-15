param(
    [switch]$UseDockerBackend,
    [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step {
    param([string]$Message)
    Write-Host "[run_all] $Message" -ForegroundColor Cyan
}

function Test-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 3
    )

    try {
        Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec $TimeoutSeconds -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-PortOpen {
    param(
        [int]$Port
    )

    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $async.AsyncWaitHandle.WaitOne(800)
        if ($connected -and $client.Connected) {
            $client.EndConnect($async) | Out-Null
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Ensure-EnvFile {
    $envPath = Join-Path $ProjectRoot ".env"
    $envExamplePath = Join-Path $ProjectRoot ".env.example"

    if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
        Copy-Item $envExamplePath $envPath
        Write-Step "Created .env from .env.example"
    }
    elseif (Test-Path $envPath) {
        Write-Step ".env already exists"
    }
    else {
        Write-Host "[run_all] Warning: .env.example not found. Continuing without creating .env" -ForegroundColor Yellow
    }
}

function Start-Ollama {
    if (Test-HttpEndpoint -Url "http://localhost:11434/api/tags") {
        Write-Step "Ollama is already running"
        return
    }

    Write-Step "Starting Ollama service"
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden | Out-Null

    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        if (Test-HttpEndpoint -Url "http://localhost:11434/api/tags") {
            Write-Step "Ollama is ready"
            return
        }
    }

    Write-Host "[run_all] Warning: Ollama endpoint did not become ready yet" -ForegroundColor Yellow
}

function Start-BackendDocker {
    $dockerComposePath = Join-Path $ProjectRoot "docker"

    try {
        docker info | Out-Null
    }
    catch {
        Write-Host "[run_all] Warning: Docker daemon is not available. Falling back to local backend." -ForegroundColor Yellow
        Start-BackendLocal
        return
    }

    Write-Step "Starting Docker services"
    Push-Location $dockerComposePath
    try {
        docker compose up -d
    }
    finally {
        Pop-Location
    }

    Write-Step "Docker backend started (API expected on http://localhost:8000)"
}

function Start-BackendLocal {
    if (Test-PortOpen -Port 8000) {
        Write-Step "Port 8000 already in use. Skipping local backend start"
        return
    }

    $pythonExe = "C:/Users/golde/AppData/Local/Programs/Python/Python312/python.exe"
    if (-not (Test-Path $pythonExe)) {
        throw "Python executable not found at $pythonExe"
    }

    if ($InstallDeps) {
        Write-Step "Installing Python dependencies"
        & $pythonExe -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
    }

    Write-Step "Starting FastAPI backend with uvicorn"
    Start-Process -FilePath $pythonExe `
        -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", $ProjectRoot `
        -WorkingDirectory $ProjectRoot | Out-Null
}

function Start-Frontend {
    $frontendPath = Join-Path $ProjectRoot "src/views/frontend"
    $npmCmd = "C:/Program Files/nodejs/npm.cmd"

    if (-not (Test-Path $npmCmd)) {
        throw "npm.cmd not found at $npmCmd"
    }

    if (-not (Test-Path (Join-Path $frontendPath "node_modules")) -or $InstallDeps) {
        Write-Step "Installing frontend dependencies"
        Push-Location $frontendPath
        try {
            & $npmCmd install
        }
        finally {
            Pop-Location
        }
    }

    if (Test-PortOpen -Port 5173) {
        Write-Step "Port 5173 already in use. Skipping frontend start"
        return
    }

    Write-Step "Starting Vite frontend"
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "\"$npmCmd\" run dev -- --host 0.0.0.0 --port 5173" `
        -WorkingDirectory $frontendPath | Out-Null
}

Write-Step "Project root: $ProjectRoot"
Ensure-EnvFile
Start-Ollama

if ($UseDockerBackend) {
    Start-BackendDocker
}
else {
    Start-BackendLocal
}

Start-Frontend

Write-Host ""
Write-Host "Services started:" -ForegroundColor Green
Write-Host "- Ollama:   http://localhost:11434"
Write-Host "- Backend:  http://localhost:8000"
Write-Host "- Frontend: http://localhost:5173/dashboard"
Write-Host ""
Write-Host "Tip: Use -UseDockerBackend to run API via docker compose." -ForegroundColor DarkGray
Write-Host "Tip: Use -InstallDeps to force reinstall dependencies." -ForegroundColor DarkGray
