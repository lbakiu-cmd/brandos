$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Stop-PortProcess {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    foreach ($connection in $connections) {
        $processId = $connection.OwningProcess

        if ($processId -and $processId -ne 0) {
            Write-Host "Stopping process on port $Port (PID $processId)..."
            taskkill /PID $processId /T /F 2>$null
        }
    }
}

Write-Host ""
Write-Host "Preparing BrandOS..." -ForegroundColor Cyan

# Stop stale local dev servers.
Stop-PortProcess -Port 3000
Stop-PortProcess -Port 4000

# Remove a stale Next.js development lock if it exists.
$nextLock = Join-Path $root "apps\web\.next\dev\lock"
if (Test-Path $nextLock) {
    Write-Host "Removing stale Next.js lock..."
    Remove-Item $nextLock -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting PostgreSQL and Redis..."
docker compose -f infrastructure/docker/docker-compose.yml up -d

Start-Sleep -Seconds 3

$services = @(
    @{
        Name = "web"
        Command = "pnpm --filter @brandos/web dev"
    },
    @{
        Name = "api"
        Command = "pnpm --filter @brandos/api dev"
    },
    @{
        Name = "worker"
        Command = "pnpm --filter @brandos/worker dev"
    }
)

$startedProcesses = @{}

foreach ($service in $services) {
    Write-Host "Opening $($service.Name) terminal..."

    $process = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoExit",
            "-Command",
            "Set-Location '$root'; $($service.Command)"
        ) `
        -PassThru

    $startedProcesses[$service.Name] = $process.Id
}

$startedProcesses | ConvertTo-Json | Set-Content `
    -Path (Join-Path $root ".brandos-services.json") `
    -Encoding utf8

Write-Host ""
Write-Host "BrandOS services are starting." -ForegroundColor Green
Write-Host "Web:    http://localhost:3000"
Write-Host "API:    http://127.0.0.1:4000/health"
Write-Host "Worker: separate PowerShell window"