#define AppVersion "0.4.0"
[Setup]
AppId={{6F80AA19-ACDA-49EA-9564-46C29778CA6A}
AppName=狮子街传说
AppVersion={#AppVersion}
AppVerName=狮子街传说 · 试玩版 {#AppVersion}
DefaultDirName={localappdata}\Programs\LeoStreetLegend
DefaultGroupName=狮子街传说
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.18362
OutputDir=..\release
OutputBaseFilename=狮子街传说-试玩版-{#AppVersion}-安装包
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile=game.ico
UninstallDisplayIcon={app}\LeoStreetLegend.exe
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
; Permanent disclaimer (owner, 2026-10-02): shown before any file is installed. Do not remove.
InfoBeforeFile=免责声明.txt
InfoAfterFile=试玩说明.txt

[Languages]
Name: "chinesesimp"; MessagesFile: "ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; Flags: checkedonce

[Files]
Source: "dist\app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "vendor\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy

[Icons]
Name: "{autoprograms}\狮子街传说"; Filename: "{app}\LeoStreetLegend.exe"
Name: "{autodesktop}\狮子街传说"; Filename: "{app}\LeoStreetLegend.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\LeoStreetLegend.exe"; Description: "开始试玩狮子街传说"; Flags: nowait postinstall skipifsilent; Check: RuntimeReady

[Code]
var Ready: Boolean;
function RuntimeReady: Boolean;
begin
  Result := Ready;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Release: Cardinal;
begin
  Result := '';
  if (not RegQueryDWordValue(HKLM, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', Release)) or (Release < 528040) then
    Result := '需要 Microsoft .NET Framework 4.8 或更新版本。请先通过 Windows 更新安装该组件，再运行此安装包。';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer;
begin
  if CurStep = ssPostInstall then begin
    Ready := Exec(ExpandConstant('{app}\LeoStreetLegend.exe'), '--check-runtime', '', SW_HIDE, ewWaitUntilTerminated, Code) and (Code = 0);
    if not Ready then begin
      WizardForm.StatusLabel.Caption := '正在安装 Microsoft Edge WebView2（需要联网），请稍候…';
      ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
      Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, Code);
      Ready := Exec(ExpandConstant('{app}\LeoStreetLegend.exe'), '--check-runtime', '', SW_HIDE, ewWaitUntilTerminated, Code) and (Code = 0);
      if not Ready then
        RaiseException('Microsoft Edge WebView2 未能安装。请检查网络连接，然后重新运行安装包。游戏文件已安装，但暂时不能启动。');
    end;
  end;
end;
