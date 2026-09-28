$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Push-Location $project
try {
    # Remove only the explicitly resolved generated app staging directory, never saves or source.
    $stage = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist/app'))
    $allowed = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist')) + [IO.Path]::DirectorySeparatorChar
    if (-not $stage.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid staging path' }
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    npm.cmd run build:desktop:web
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed' }
    node desktop/prepare.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Asset preparation failed' }
    $csc = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    & $csc /nologo /target:winexe /platform:x64 /optimize+ /utf8output '/out:desktop\dist\app\LeoStreetLegend.exe' '/win32icon:desktop\game.ico' '/win32manifest:desktop\app.manifest' /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll '/reference:desktop\dist\app\Microsoft.Web.WebView2.Core.dll' '/reference:desktop\dist\app\Microsoft.Web.WebView2.WinForms.dll' 'desktop\Program.cs'
    if ($LASTEXITCODE -ne 0) { throw 'Desktop compilation failed' }
    & desktop/tools/inno/ISCC.exe desktop/setup.iss
    if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed' }
} finally { Pop-Location }
