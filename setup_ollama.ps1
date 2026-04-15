Write-Host "Installing Ollama..." -ForegroundColor Cyan

$url = "https://ollama.ai/download/OllamaSetup.exe"
$installer = "$env:TEMP\OllamaSetup.exe"

if (-Not (Test-Path $installer)) {
    Write-Host "Downloading Ollama..."
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
}

Write-Host "Running installer..."
& $installer /SILENT /NORESTART
Start-Sleep -Seconds 20

Write-Host "Starting Ollama service..."
$exe = "C:\Program Files\Ollama\ollama.exe"
if (Test-Path $exe) {
    Start-Process -FilePath $exe -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    Write-Host "Pulling mistral model (this will take a few minutes)..."
    & $exe pull mistral
    
    Write-Host "Done! Ollama is running." -ForegroundColor Green
}
else {
    Write-Host "Ollama not found. Installation may have failed." -ForegroundColor Yellow
}

GOOGLE_API_KEY=your_key_here
