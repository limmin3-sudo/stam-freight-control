@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH. Install Node.js 22 or newer and reopen this window.
  echo Official download: https://nodejs.org/en/download
  pause
  exit /b 1
)
node -e "console.log('Using Node.js '+process.version+' at '+process.execPath);if(Number(process.versions.node.split('.')[0]) < 22){console.error('Node.js 22 or newer is required. Found '+process.version);process.exit(1)}"
if errorlevel 1 (
  echo Official download: https://nodejs.org/en/download
  pause
  exit /b 1
)
if /i "%~1"=="--check" exit /b 0
echo Select the active Game.log. This tool only reads the selected file.
echo Keep this window open while testing. Press Ctrl+C to stop.
powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Title = 'Select Star Citizen Game.log (read only)'; $dialog.Filter = 'Log files (*.log)|*.log'; if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }; & node scripts/log-link-server.mjs --file $dialog.FileName --open; exit $LASTEXITCODE"
set "stam_log_exit=%errorlevel%"
pause
exit /b %stam_log_exit%
