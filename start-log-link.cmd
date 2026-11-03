@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 is required. Install Node.js 22 and try again.
  pause
  exit /b 1
)
node -e "if(process.versions.node.split('.')[0] !== '22'){console.error('Node.js 22 is required.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
echo Select the active Game.log. This tool only reads the selected file.
echo Keep this window open while testing. Press Ctrl+C to stop.
powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.OpenFileDialog; $dialog.Title = 'Select Star Citizen Game.log (read only)'; $dialog.Filter = 'Log files (*.log)|*.log'; if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { exit 0 }; & node scripts/log-link-server.mjs --file $dialog.FileName --open; exit $LASTEXITCODE"
set "stam_log_exit=%errorlevel%"
pause
exit /b %stam_log_exit%
