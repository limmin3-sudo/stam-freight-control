@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  "C:\Users\limmi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\prepare.mjs
  "C:\Users\limmi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server\local.mjs
) else (
  node scripts\prepare.mjs
  node server\local.mjs
)
pause
