param(
    [switch]$UseDockerBackend,
    [switch]$InstallDeps,
    [switch]$RestartOllama,
    [switch]$StopOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonExe = "C:/Users/golde/AppData/Local/Programs/Python/Python312/python.exe"
$NpmCmd = "C:/Program Files/nodejs/npm.cmd"
$FrontendPath = Join-Path $ProjectRoot "src/views/frontend"

function Write-Step {
    param([string]$Message)
    Write-Host "[restart_servers] $Message" -ForegroundColor Cyan
}

function Stop-ListenerOnPort {
    param([int]$Port)

    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        Write-Step "No listener on port $Port"
        return
    }

    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Step "Stopped PID $procId on port $Port"
        }
        catch {
            Write-Host "[restart_servers] Could not stop PID $procId on port ${Port}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

function Wait-ForHttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60,
        [int]$PollIntervalSeconds = 2,
        [string]$Label = "service"
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
            if ($null -ne $response) {
                Write-Step "$Label is ready at $Url"
                return $true
            }
        }
        catch {
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }

    throw "$Label did not become ready at $Url within $TimeoutSeconds seconds"
}

function Ensure-Ollama {
    try {
        Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop | Out-Null
        Write-Step "Ollama is running"
        return
    }
    catch {
        Write-Step "Starting Ollama"
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden | Out-Null
    }
}

function Restart-OllamaService {
    Write-Step "Restarting Ollama service"
    $ollamaProcs = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if ($ollamaProcs) {
        $ollamaProcs | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force -ErrorAction Stop
                Write-Step "Stopped Ollama PID $($_.Id)"
            }
            catch {
                Write-Host "[restart_servers] Could not stop Ollama PID $($_.Id): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        Start-Sleep -Seconds 1
    }

    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden | Out-Null
    Write-Step "Ollama start command sent"
}

function Start-BackendLocal {
    if (-not (Test-Path $PythonExe)) {
        throw "Python executable not found at $PythonExe"
    }

    if ($InstallDeps) {
        Write-Step "Installing Python dependencies"
        & $PythonExe -m pip install -r (Join-Path $ProjectRoot "requirements.txt")
    }

    $LogFile = Join-Path $ProjectRoot "backend.log"
    Write-Step "Starting backend on port 8000 (log: $LogFile)"
    $proc = Start-Process -FilePath $PythonExe `
        -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "`"$ProjectRoot`"" `
        -WorkingDirectory $ProjectRoot `
        -RedirectStandardOutput $LogFile `
        -RedirectStandardError "$LogFile.err" `
        -PassThru

    # Give the process a moment to either bind or crash
    Start-Sleep -Seconds 3
    if ($proc.HasExited) {
        $errContent = if (Test-Path "$LogFile.err") { Get-Content "$LogFile.err" -Raw } else { "(no stderr)" }
        $outContent = if (Test-Path $LogFile)          { Get-Content $LogFile -Raw }          else { "(no stdout)" }
        throw "Backend process exited immediately (exit code $($proc.ExitCode)).`nSTDERR: $errContent`nSTDOUT: $outContent"
    }

    Write-Step "Backend process PID $($proc.Id) is running - waiting for health endpoint"
    Wait-ForHttpEndpoint -Url "http://localhost:8000/health" -Label "Backend"
}

function Start-BackendDocker {
    Write-Step "Starting Docker backend"
    Push-Location (Join-Path $ProjectRoot "docker")
    try {
        docker compose up -d
    }
    finally {
        Pop-Location
    }

    Wait-ForHttpEndpoint -Url "http://localhost:8000/health" -Label "Backend"
}

function Start-Frontend {
    if (-not (Test-Path $NpmCmd)) {
        throw "npm.cmd not found at $NpmCmd"
    }

    if (-not (Test-Path (Join-Path $FrontendPath "node_modules")) -or $InstallDeps) {
        Write-Step "Installing frontend dependencies"
        Push-Location $FrontendPath
        try {
            & $NpmCmd install
        }
        finally {
            Pop-Location
        }
    }

    Write-Step "Starting frontend on port 5173"
    Start-Process -FilePath $NpmCmd `
        -ArgumentList "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173" `
        -WorkingDirectory $FrontendPath | Out-Null
}

Write-Step "Project root: $ProjectRoot"

# Stop current listeners so next start is a clean restart.
Stop-ListenerOnPort -Port 8000
Stop-ListenerOnPort -Port 5173

if ($RestartOllama) {
    Restart-OllamaService
}
else {
    Ensure-Ollama
}

if ($StopOnly) {
    Write-Step "Stop-only mode complete"
    exit 0
}

if ($UseDockerBackend) {
    Start-BackendDocker
}
else {
    Start-BackendLocal
}

Start-Frontend

Write-Host ""
Write-Host "Restart complete:" -ForegroundColor Green
Write-Host "- Ollama:   http://localhost:11434"
Write-Host "- Backend:  http://localhost:8000"
Write-Host "- Frontend: http://localhost:5173/dashboard"
