@echo off
setlocal
cd /d "%~dp0"
node --experimental-sqlite -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or later to start the STAM partner server.
  exit /b 1
)
if not exist "apps\control-room\node_modules\.bin\vite.cmd" (
  call npm ci --prefix apps\control-room
  if errorlevel 1 exit /b 1
)
call npm run build:control-room
if errorlevel 1 exit /b 1
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; if (-not $env:OPENAI_API_KEY) { $secret=Read-Host 'OpenAI API key' -AsSecureString; if ($secret.Length -eq 0) { exit 1 }; try { $env:OPENAI_API_KEY=([pscredential]::new('stam',$secret)).GetNetworkCredential().Password } finally { $secret.Dispose() } }; node --experimental-sqlite server/local.mjs; exit $LASTEXITCODE"
exit /b %errorlevel%
