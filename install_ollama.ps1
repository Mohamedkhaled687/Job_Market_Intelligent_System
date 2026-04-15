$downloadUrl = "https://ollama.ai/download/OllamaSetup.exe"
$tempFile = "$env:TEMP\OllamaSetup.exe"
$installDir = "C:\Program Files\Ollama"

Write-Host "🚀 Ollama 2 Installation Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Download if needed
if (-not (Test-Path $tempFile)) {
    Write-Host "[1/4] Downloading Ollama..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -UseBasicParsing -ProgressAction SilentlyContinue
        Write-Host "✓ Download complete!" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Download failed: $_" -ForegroundColor Red
        Write-Host "Please download manually from: https://ollama.ai/download" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[1/4] Installer found (skipping download)" -ForegroundColor Green
}

# Install
Write-Host "[2/4] Installing Ollama..." -ForegroundColor Yellow
& $tempFile /SILENT /NORESTART
Write-Host "Waiting for installation..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# Check installation
if (Test-Path "$installDir\ollama.exe") {
    Write-Host "✓ Ollama installed!" -ForegroundColor Green
} else {
    Write-Host "⚠ Installation directory not found yet..." -ForegroundColor Yellow
}

# Start service
Write-Host "[3/4] Starting Ollama service..." -ForegroundColor Yellow
$ollamaExe = "$installDir\ollama.exe"
if (Test-Path $ollamaExe) {
    Write-Host "Starting server..." -ForegroundColor Green
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    $ready = $false
    $timeout = 0
    while (-not $ready -and $timeout -lt 60) {
        Start-Sleep -Seconds 2
        $timeout += 2
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -ErrorAction Stop | Out-Null
            Write-Host "✓ Ollama is ready!" -ForegroundColor Green
            $ready = $true
        }
        catch {
            Write-Host "  Waiting ($timeout/60s)..." -ForegroundColor Gray
        }
    }
}

# Pull model
Write-Host "[4/4] Downloading Mistral model..." -ForegroundColor Yellow
Write-Host "This will download ~4GB (one-time)..." -ForegroundColor Gray
& "$installDir\ollama.exe" pull mistral

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Ollama running on: http://localhost:11434" -ForegroundColor Cyan
Write-Host "Model: mistral" -ForegroundColor Cyan
Write-Host ""
