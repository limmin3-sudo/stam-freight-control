$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$version = (Get-Content desktop/version.json | ConvertFrom-Json).version
$runtimeVersion = '22.23.4'
$expected = 'cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20'
$temporaryRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$work = Join-Path $temporaryRoot ('stam-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory $work | Out-Null
$zip = Join-Path $work 'node.zip'
Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$runtimeVersion/node-v$runtimeVersion-win-x64.zip" -OutFile $zip
if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Runtime checksum mismatch' }
Expand-Archive $zip -DestinationPath $work
$out = Join-Path $work "STAM-$version-win-x64"
node scripts/build-desktop.mjs $out
if ($LASTEXITCODE -ne 0) { throw 'App assembly failed' }
foreach ($asset in @('assets/stam-logo-transparent.png', 'data/log-location-index.json', 'desktop/bridge.mjs')) {
    if (!(Test-Path (Join-Path $out ('app/' + $asset)))) { throw ('Missing companion guide asset: ' + $asset) }
}
if (Test-Path (Join-Path $out 'app/index.html')) { throw 'Website UI must not be bundled in the companion' }
New-Item -ItemType Directory (Join-Path $out 'runtime') | Out-Null
Copy-Item (Join-Path $work "node-v$runtimeVersion-win-x64/node.exe") (Join-Path $out 'runtime/node.exe')
Copy-Item (Join-Path $work "node-v$runtimeVersion-win-x64/LICENSE") (Join-Path $out 'runtime/LICENSE')
$csc = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
& $csc /nologo /target:winexe /platform:x64 /codepage:65001 /win32icon:desktop/stam.ico /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll "/out:$out/STAM.exe" (Resolve-Path 'desktop/Launcher.cs').Path
if ($LASTEXITCODE -ne 0) { throw 'Launcher compile failed' }
$languageTest = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList '--self-test-language' -Wait -PassThru
if ($languageTest.ExitCode -ne 0) { throw 'Launcher language switching failed' }
# Run the compiled app against its bundled runtime, not the runner's node on PATH.
$smoke = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList '--self-test' -Wait -PassThru
if ($smoke.ExitCode -ne 0) { throw 'Packaged launcher self-test failed' }
$windowTest = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList '--self-test-window' -Wait -PassThru
if ($windowTest.ExitCode -ne 0) { throw 'Launcher close, reopen and settings preservation failed' }
$manifest = @{ version=$version; runtime="Node.js $runtimeVersion win-x64"; runtimeArchiveSHA256=$expected; gameValidated=$false; signed=$false; files=@() }
Get-ChildItem $out -File -Recurse | ForEach-Object { $manifest.files += @{path=$_.FullName.Substring($out.Length+1).Replace('\','/'); bytes=$_.Length; sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} }
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $out 'PACKAGE.json') -Encoding UTF8
New-Item -ItemType Directory -Force dist | Out-Null
# Capture the real Windows form, including disabled button text and the bundled logo.
$previewPath = Join-Path (Resolve-Path dist) 'launcher-preview.png'
$capture = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList @('--capture-ui', ('"' + $previewPath + '"')) -Wait -PassThru
if ($capture.ExitCode -ne 0 -or !(Test-Path $previewPath)) { throw 'Launcher UI capture failed' }
$englishPreview = Join-Path (Resolve-Path dist) 'launcher-preview-en.png'
$captureEnglish = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList @('--capture-ui-en', ('"' + $englishPreview + '"')) -Wait -PassThru
if ($captureEnglish.ExitCode -ne 0 -or !(Test-Path $englishPreview)) { throw 'English launcher UI capture failed' }
$destination = Join-Path (Resolve-Path dist) "STAM-$version-win-x64.zip"
Compress-Archive -Path $out -DestinationPath $destination
$hash=(Get-FileHash $destination -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  STAM-$version-win-x64.zip" | Set-Content dist/SHA256SUMS.txt -Encoding ascii
@{version=$version;status='published';url="https://github.com/limmin3-sudo/stam-freight-control/releases/download/$version/STAM-$version-win-x64.zip";sha256=$hash;bytes=(Get-Item $destination).Length} | ConvertTo-Json | Set-Content dist/desktop-release.json -Encoding UTF8
# A per-user installer complements the portable ZIP. Neither step publishes it.
$iscc = & (Join-Path $PSScriptRoot 'prepare-installer-compiler.ps1') -Directory (Join-Path $work 'installer-compiler')
& $iscc "/DPackageRoot=$out" ('/DAppVersion=' + $version.Replace('app.','')) (Resolve-Path 'desktop/installer.iss').Path
if ($LASTEXITCODE -ne 0) { throw 'User installer build failed' }
$installer = Join-Path (Resolve-Path dist) "STAM-$version-setup-win-x64.exe"
$installerHash=(Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant()
"$installerHash  STAM-$version-setup-win-x64.exe" | Add-Content dist/SHA256SUMS.txt -Encoding ascii
& (Join-Path $PSScriptRoot 'check-installer.ps1') -Installer $installer -Work $work
Copy-Item (Join-Path $work 'installer-check.json') (Join-Path (Resolve-Path dist) 'installer-check.json')

$release = Get-Content dist/desktop-release.json | ConvertFrom-Json
$release | Add-Member -NotePropertyName installer -NotePropertyValue @{url="https://github.com/limmin3-sudo/stam-freight-control/releases/download/$version/STAM-$version-setup-win-x64.exe";sha256=$installerHash;bytes=(Get-Item $installer).Length}
$release | ConvertTo-Json -Depth 4 | Set-Content dist/desktop-release.json -Encoding UTF8
