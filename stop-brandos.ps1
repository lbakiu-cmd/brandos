$ErrorActionPreference = "Continue"

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

$processFile = Join-Path $root ".brandos-services.json"

if (Test-Path $processFile) {
    $services = Get-Content $processFile | ConvertFrom-Json

    foreach ($property in $services.PSObject.Properties) {
        $processId = $property.Value

        Write-Host "Stopping $($property.Name) terminal (PID $processId)..."
        taskkill /PID $processId /T /F 2>$null
    }

    Remove-Item $processFile -Force
}

# Safety fallback for Web and API.
Stop-PortProcess -Port 3000
Stop-PortProcess -Port 4000

Write-Host "Stopping PostgreSQL and Redis..."
docker compose -f infrastructure/docker/docker-compose.yml down

Write-Host "BrandOS stopped." -ForegroundColor Green