param(
  [string]$BaseUrl = "http://127.0.0.1:8787"
)

$ErrorActionPreference = "Stop"

Write-Host "Smoke test for: $BaseUrl"

try {
  $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
  Write-Host "[OK] /health"
  $health | ConvertTo-Json -Depth 5
} catch {
  Write-Error "[FAIL] /health не отвечает: $($_.Exception.Message)"
  exit 1
}

try {
  $restaurants = Invoke-RestMethod -Uri "$BaseUrl/restaurants" -Method GET
  Write-Host "[OK] /restaurants"
  $restaurants | ConvertTo-Json -Depth 8
} catch {
  Write-Error "[FAIL] /restaurants ошибка: $($_.Exception.Message)"
  exit 1
}
