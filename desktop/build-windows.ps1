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
# System.Speech is a desktop reference assembly, not in csc.exe's framework folder.
$speechReference = Join-Path ${env:ProgramFiles(x86)} 'Reference Assemblies/Microsoft/Framework/.NETFramework/v4.8/System.Speech.dll'
if (!(Test-Path $speechReference)) {
    Add-Type -AssemblyName System.Speech
    $speechReference = [System.Speech.Recognition.SpeechRecognitionEngine].Assembly.Location
}
if (!(Test-Path $speechReference)) { throw 'System.Speech reference assembly is required to compile the optional voice feature' }

& $csc /nologo /target:winexe /platform:x64 /codepage:65001 /win32icon:desktop/stam.ico /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.Net.Http.dll "/reference:$speechReference" "/out:$out/STAM.exe" (Resolve-Path 'desktop/Launcher.cs').Path (Resolve-Path 'desktop/DeckTheme.cs').Path (Resolve-Path 'desktop/CompanionGuidance.cs').Path (Resolve-Path 'desktop/HeldMicrophone.cs').Path (Resolve-Path 'desktop/CompanionOverlay.cs').Path (Resolve-Path 'desktop/CompanionOverlayChecks.cs').Path
if ($LASTEXITCODE -ne 0) { throw 'Launcher compile failed' }
# The test executable owns its bridge lifecycle. Waiting for its entire process tree
# can hang a CI runner after the executable itself has already returned a result.
function Invoke-CompanionCheck([string[]]$Arguments) {
    Write-Host "Checking STAM.exe $($Arguments -join ' ')"
    $process = Start-Process -FilePath (Join-Path $out 'STAM.exe') -ArgumentList $Arguments -PassThru
    if (!$process.WaitForExit(90000)) {
        Stop-Process -Id $process.Id -Force
        throw "Companion check timed out: $($Arguments -join ' ')"
    }
    return $process
}
$languageTest = Invoke-CompanionCheck -Arguments '--self-test-language'
if ($languageTest.ExitCode -ne 0) { throw 'Launcher language switching failed' }
# Run the compiled app against its bundled runtime, not the runner's node on PATH.
$smoke = Invoke-CompanionCheck -Arguments '--self-test'
if ($smoke.ExitCode -ne 0) { throw 'Packaged launcher self-test failed' }
$windowTest = Invoke-CompanionCheck -Arguments '--self-test-window'
if ($windowTest.ExitCode -ne 0) { throw 'Launcher close, reopen and settings preservation failed' }
New-Item -ItemType Directory -Force dist | Out-Null
$overlayEvidence = Join-Path (Resolve-Path dist) 'overlay-native-check.json'
$overlayTest = Invoke-CompanionCheck -Arguments @('--self-test-overlay', ('"' + $overlayEvidence + '"'))
if ($overlayTest.ExitCode -ne 0 -or !(Test-Path $overlayEvidence)) { throw 'Native overlay verification failed' }
$manifest = @{ version=$version; runtime="Node.js $runtimeVersion win-x64"; runtimeArchiveSHA256=$expected; gameValidated=$false; signed=$false; files=@() }
Get-ChildItem $out -File -Recurse | ForEach-Object { $manifest.files += @{path=$_.FullName.Substring($out.Length+1).Replace('\','/'); bytes=$_.Length; sha256=(Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} }
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $out 'PACKAGE.json') -Encoding UTF8
New-Item -ItemType Directory -Force dist | Out-Null
# Capture the real Windows form, including disabled button text and the bundled logo.
$previewPath = Join-Path (Resolve-Path dist) 'launcher-preview.png'
$capture = Invoke-CompanionCheck -Arguments @('--capture-ui', ('"' + $previewPath + '"'))
if ($capture.ExitCode -ne 0 -or !(Test-Path $previewPath)) { throw 'Launcher UI capture failed' }
$englishPreview = Join-Path (Resolve-Path dist) 'launcher-preview-en.png'
$captureEnglish = Invoke-CompanionCheck -Arguments @('--capture-ui-en', ('"' + $englishPreview + '"'))
if ($captureEnglish.ExitCode -ne 0 -or !(Test-Path $englishPreview)) { throw 'English launcher UI capture failed' }
$designCapture = Invoke-CompanionCheck -Arguments @('--capture-design', ('"' + (Resolve-Path dist).Path + '"'))
if ($designCapture.ExitCode -ne 0) { throw 'Companion design capture failed' }
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
