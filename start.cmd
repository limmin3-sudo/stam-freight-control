@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 is required. Install it and reopen this window.
  pause
  exit /b 1
)
node -e "if(process.versions.node.split('.')[0] !== '22'){console.error('Node.js 22 is required.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
node scripts\prepare.mjs
if errorlevel 1 (
  echo Preparation failed. Check the error above and network access.
  pause
  exit /b 1
)
node server\local.mjs
set "app_exit=%errorlevel%"
pause
exit /b %app_exit%
