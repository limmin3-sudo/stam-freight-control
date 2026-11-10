@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto missingnode
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a<22||(a===22&&b<12)?1:0)"
if errorlevel 1 goto missingnode
where npm >nul 2>nul
if errorlevel 1 goto missingnode
if not exist "apps\control-room\node_modules\.package-lock.json" (
  echo Installing the locked preview dependencies...
  call npm ci --prefix apps\control-room
  if errorlevel 1 goto failed
)
echo.
echo STAM control-room preview: http://127.0.0.1:5173
echo This starts the local preview only. It does not publish the website.
echo Keep this window open. Press Ctrl+C to stop.
call npm run dev:control-room
if errorlevel 1 goto failed
exit /b 0
:missingnode
echo Install Node.js 22.12 or newer, then reopen this file.
echo https://nodejs.org/en/download
pause
exit /b 1
:failed
echo The preview could not start. Keep the error above for diagnosis.
pause
exit /b 1
