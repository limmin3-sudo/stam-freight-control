param(
    [Parameter(Mandatory=$true)][string]$Installer,
    [Parameter(Mandatory=$true)][string]$Work
)
$ErrorActionPreference = 'Stop'
# Run only in a clean build profile, never over an installed user copy.
$registry = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{D372A120-919A-4477-8362-37E8FA39E863}_is1'
$settings = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'STAM'
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'STAM.lnk'
$menuLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'STAM/STAM.lnk'
foreach ($existing in @($registry,$settings,$desktopLink,$menuLink)) {
    if (Test-Path $existing) { throw 'Installer QA needs a clean build profile; existing STAM data was not touched' }
}
$target = Join-Path $Work 'installed app'
$pathText = 'C:\Synthetic game\StarCitizen\LIVE\Game.log'
$uninstaller = Join-Path $target 'unins000.exe'
function Run-Checked([string]$Exe,[string[]]$Arguments) {
    $run = Start-Process -FilePath $Exe -ArgumentList $Arguments -Wait -PassThru
    if ($run.ExitCode -ne 0) { throw ('Installer check process failed: ' + $run.ExitCode) }
}
function Check-Preserved {
    if ((Get-Content (Join-Path $settings 'log-path.txt') -Raw) -ne $pathText) { throw 'Log path changed during install/update/remove' }
    if ((Get-Content (Join-Path $settings 'ui-language.txt') -Raw) -ne 'en') { throw 'Language changed during install/update/remove' }
}
try {
    New-Item -ItemType Directory $settings | Out-Null
    [IO.File]::WriteAllText((Join-Path $settings 'log-path.txt'),$pathText)
    [IO.File]::WriteAllText((Join-Path $settings 'ui-language.txt'),'en')
    $arguments = @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/TASKS=desktopicon',('/DIR="' + $target + '"'))
    Run-Checked $Installer $arguments
    Check-Preserved
    $exe = Join-Path $target 'STAM.exe'
    if (!(Test-Path $exe)) { throw 'Installed executable is missing' }
    $shell = New-Object -ComObject WScript.Shell
    foreach ($link in @($desktopLink,$menuLink)) {
        if (!(Test-Path $link)) { throw 'STAM shortcut is missing' }
        if ($shell.CreateShortcut($link).TargetPath -ne $exe) { throw 'Shortcut must launch STAM.exe, not a script or browser' }
    }
    foreach ($check in @('--self-test','--self-test-language','--self-test-window')) { Run-Checked $exe @($check) }
    # Exercise the actual executable entry point, not just the form's restore method.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class STAMWindowQA {
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window,uint message,IntPtr wParam,IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window,System.Text.StringBuilder text,int maximum);
}
'@
    $first=$null;$second=$null;$watchers=@();$priorQA=$env:STAM_WINDOW_QA
    try {
        $env:STAM_WINDOW_QA='1'
        $first=Start-Process -FilePath $exe -PassThru -RedirectStandardError (Join-Path $Work 'entry-check.txt')
        $deadline=(Get-Date).AddSeconds(15)
        do { Start-Sleep -Milliseconds 100; $first.Refresh() } while ($first.MainWindowHandle -eq 0 -and !$first.HasExited -and (Get-Date) -lt $deadline)
        if ($first.HasExited -or $first.MainWindowHandle -eq 0) { throw 'App window did not open' }
        $deadline=(Get-Date).AddSeconds(15)
        do { Start-Sleep -Milliseconds 100; $watchers=@(Get-CimInstance Win32_Process -Filter ("ParentProcessId = " + $first.Id + " AND Name = 'node.exe'")) } while ($watchers.Count -eq 0 -and (Get-Date) -lt $deadline)
        if ($watchers.Count -ne 1) { throw 'Expected one log watcher' }
        # Keep the actual form handle. Process.MainWindowHandle may select a
        # different helper/tray window once the form has been hidden.
        $window=$first.MainWindowHandle
        $caption=New-Object System.Text.StringBuilder 256
        [STAMWindowQA]::GetWindowText($window,$caption,256) | Out-Null
        Write-Host ('Entry window: ' + $caption.ToString())
        # Title-bar X / Alt+F4 uses WM_SYSCOMMAND + SC_CLOSE. A bare WM_CLOSE
        # is TaskManagerClosing in WinForms and correctly exits instead of hiding.
        if (![STAMWindowQA]::PostMessage($window,0x0112,[IntPtr]0xF060,[IntPtr]::Zero)) { throw 'Close message was not delivered' }
        $deadline=(Get-Date).AddSeconds(5)
        do { Start-Sleep -Milliseconds 100; $first.Refresh() } while ([STAMWindowQA]::IsWindowVisible($window) -and (Get-Date) -lt $deadline)
        if ($first.HasExited -or [STAMWindowQA]::IsWindowVisible($window)) { throw ('Close did not hide the running app: exited=' + $first.HasExited + ', visible=' + [STAMWindowQA]::IsWindowVisible($window)) }
        $second=Start-Process -FilePath $exe -PassThru
        if (!$second.WaitForExit(10000) -or $second.ExitCode -ne 0) { throw 'Second icon launch did not hand off to existing app' }
        $deadline=(Get-Date).AddSeconds(5)
        do { Start-Sleep -Milliseconds 100; $first.Refresh() } while (![STAMWindowQA]::IsWindowVisible($window) -and (Get-Date) -lt $deadline)
        if (![STAMWindowQA]::IsWindowVisible($window)) { throw 'Existing window was not restored' }
        $after=@(Get-CimInstance Win32_Process -Filter ("ParentProcessId = " + $first.Id + " AND Name = 'node.exe'"))
        if ($after.Count -ne 1 -or $after[0].ProcessId -ne $watchers[0].ProcessId) { throw 'Icon launch restarted or duplicated log watcher' }
    } finally {
        $env:STAM_WINDOW_QA=$priorQA
        foreach ($process in @($second,$first)) { if ($process -and !$process.HasExited) { Stop-Process -Id $process.Id -Force; $process.WaitForExit() } }
        if (Test-Path (Join-Path $Work 'entry-check.txt')) { Get-Content (Join-Path $Work 'entry-check.txt') | Write-Host }
        foreach ($watcher in $watchers) { $process=Get-Process -Id $watcher.ProcessId -ErrorAction SilentlyContinue; if ($process -and !$process.WaitForExit(5000)) { Stop-Process -Id $process.Id -Force; throw 'Watcher did not stop when the parent exited' } }
    }
    Run-Checked $Installer $arguments # Same AppId updates the existing install.
    Check-Preserved
    if (@(Get-ChildItem ([Environment]::GetFolderPath('Desktop')) -Filter 'STAM*.lnk').Count -ne 1) { throw 'Duplicate desktop icons after update' }
    Run-Checked $uninstaller @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART')
    $deadline=(Get-Date).AddSeconds(20)
    while ((Test-Path $exe) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 100 }
    if ((Test-Path $exe) -or (Test-Path $desktopLink) -or (Test-Path $menuLink)) { throw 'Uninstall left the app or shortcut behind' }
    Check-Preserved
    @{passed=$true;checks=@('single STAM shortcut','installed runtime','second icon restores existing window without duplicate watcher','settings restored on restart','upgrade preserves settings','uninstall preserves settings')} | ConvertTo-Json | Set-Content (Join-Path $Work 'installer-check.json') -Encoding UTF8
} finally {
    if (Test-Path $uninstaller) { Start-Process -FilePath $uninstaller -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -Wait | Out-Null }
    # Only the two synthetic files created above are removed.
    Remove-Item (Join-Path $settings 'log-path.txt'),(Join-Path $settings 'ui-language.txt') -ErrorAction SilentlyContinue
    if ((Test-Path $settings) -and @(Get-ChildItem $settings -Force).Count -eq 0) { Remove-Item $settings }
}
