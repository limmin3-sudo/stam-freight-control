param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference = 'Stop'
# The x64 compiler runs on the same architecture as the app. Pin the build tool;
# do not depend on whichever Inno Setup happens to be on the runner image.
$version = '7.1.1'
$sha256 = '8a5a6711c3766a6e5fb74f280ba0e3551e719ce94538d901fdbd1f8f9920b3f0'
New-Item -ItemType Directory -Force $Directory | Out-Null
$download = Join-Path $Directory 'compiler-setup.exe'
Invoke-WebRequest -UseBasicParsing "https://github.com/jrsoftware/issrc/releases/download/is-7_1_1/innosetup-$version-x64.exe" -OutFile $download
if ((Get-FileHash $download -Algorithm SHA256).Hash.ToLowerInvariant() -ne $sha256) { throw 'Installer compiler checksum mismatch' }
$target = Join-Path $Directory 'compiler'
$process = Start-Process -FilePath $download -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-','/CURRENTUSER','/NOICONS',('/DIR="' + $target + '"')) -Wait -PassThru
if ($process.ExitCode -ne 0) { throw 'Installer compiler setup failed' }
$compiler = Join-Path $target 'ISCC.exe'
if (!(Test-Path $compiler)) { throw 'Installer compiler not found after setup' }
Write-Output $compiler
