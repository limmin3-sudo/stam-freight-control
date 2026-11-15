; Per-user installer. Existing log path, language and browser flight data are preserved.
#ifndef AppVersion
#define AppVersion "1.4.0"
#endif
[Setup]
AppId={{D372A120-919A-4477-8362-37E8FA39E863}
AppName=STAM Log Companion
AppMutex=Local\STAM-Freight-Control
AppVersion={#AppVersion}
AppPublisher=STAM FREIGHT DIVISION
DefaultDirName={localappdata}\Programs\STAM Companion
DefaultGroupName=STAM
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\dist
OutputBaseFilename=STAM-app.{#AppVersion}-setup-win-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=stam.ico
SetupArchitecture=x64
MinVersion=10.0
CloseApplications=yes
RestartApplications=no
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"
[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"
[Files]
Source: "{#PackageRoot}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\STAM"; Filename: "{app}\STAM.exe"
Name: "{autodesktop}\STAM"; Filename: "{app}\STAM.exe"; Tasks: desktopicon
[Run]
Filename: "{app}\STAM.exe"; Description: "{cm:LaunchProgram,STAM Log Companion}"; Flags: nowait postinstall skipifsilent
