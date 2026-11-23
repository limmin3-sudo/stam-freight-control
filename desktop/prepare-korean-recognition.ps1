param([string]$Work, [string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
function Get-VoiceArchive($Name, $Uri, $Hash) {
    $archive = Join-Path $Work "$Name.zip"
    Invoke-WebRequest -UseBasicParsing $Uri -OutFile $archive
    if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne $Hash) { throw "Unexpected $Name archive" }
    $target = Join-Path $Work $Name
    Expand-Archive $archive -DestinationPath $target
    return $target
}
$sdk = Get-VoiceArchive 'vosk' 'https://api.nuget.org/v3-flatcontainer/vosk/0.3.38/vosk.0.3.38.nupkg' 'd01f96e306f3b6abd68bd0eef6d8aacb15c870b7873a74074c775b13dd50397f'
Copy-Item "$sdk/build/lib/win-x64/*.dll" $OutputDirectory
$model = Get-VoiceArchive 'ko-model' 'https://alphacephei.com/vosk/models/vosk-model-small-ko-0.22.zip' 'eea36124087fed26c59996a4761519458e3bd185e8ea9d9865ad8760c4a1d989'
Copy-Item "$model/vosk-model-small-ko-0.22" $OutputDirectory -Recurse
Copy-Item (Join-Path $PSScriptRoot 'recognition-licenses') $OutputDirectory -Recurse
