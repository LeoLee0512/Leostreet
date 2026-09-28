$ErrorActionPreference = 'Stop'
try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -TimeoutSec 2
  if ($response.StatusCode -eq 200) { exit 0 }
} catch { }
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'artifacts') | Out-Null
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'artifacts/dev-windows.log') -RedirectStandardError (Join-Path $PSScriptRoot 'artifacts/dev-windows-error.log')
