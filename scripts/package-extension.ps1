# EdgeMark Extension Packaging Script for Edge Add-ons & Chrome Web Store

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " EdgeMark Extension Packaging Pipeline " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure fresh production build
Write-Host "`n[1/4] Running production build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed! Aborting packaging."
    exit 1
}

# 2. Check dist directory
$distPath = Resolve-Path "dist"
if (!(Test-Path $distPath)) {
    Write-Error "dist/ directory not found!"
    exit 1
}

# 3. Read version and validate description from manifest.json
$manifestPath = Join-Path $distPath "manifest.json"
if (!(Test-Path $manifestPath)) {
    Write-Error "manifest.json not found in dist/!"
    exit 1
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$name = "edgemark-extension-v$version.zip"

if ($manifest.description.Length -gt 132) {
    Write-Error "manifest.json description length ($($manifest.description.Length) chars) exceeds store limit of 132 chars!"
    exit 1
}
Write-Host "  -> Manifest version: $version" -ForegroundColor Gray
Write-Host "  -> Manifest description: $($manifest.description.Length)/132 chars (Valid)" -ForegroundColor Green

# 4. Prepare release folder
$releaseDir = "release"
if (!(Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir | Out-Null
}
$zipPath = Join-Path (Resolve-Path $releaseDir) $name

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Write-Host "`n[2/4] Verifying extension icons and assets..." -ForegroundColor Yellow
$requiredIcons = @("icon16.png", "icon32.png", "icon48.png", "icon128.png", "icon512.png")
foreach ($icon in $requiredIcons) {
    $iconFile = Join-Path $distPath "icons/$icon"
    if (!(Test-Path $iconFile)) {
        Write-Error "Missing icon in dist: $icon"
        exit 1
    }
}
Write-Host "  -> All standard store icons present (16, 32, 48, 128, 512)." -ForegroundColor Green

Write-Host "`n[3/4] Creating Store Submission ZIP archive: $name..." -ForegroundColor Yellow

# Important: Zip contents of dist directly so manifest.json is at archive root, using POSIX forward slashes
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipStream = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($zipStream, [System.IO.Compression.ZipArchiveMode]::Create)

$files = Get-ChildItem -Recurse -File $distPath
foreach ($file in $files) {
    $rel = $file.FullName.Substring($distPath.Path.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
}

$archive.Dispose()
$zipStream.Dispose()

$zipSize = (Get-Item $zipPath).Length
$zipSizeKB = [Math]::Round($zipSize / 1024, 2)

Write-Host "`n[4/4] Package created successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Package File : $zipPath" -ForegroundColor White
Write-Host " Package Size : $zipSizeKB KB ($zipSize bytes)" -ForegroundColor White
Write-Host " Version      : $version" -ForegroundColor White
Write-Host " Target Stores: Microsoft Edge Add-ons & Chrome Web Store" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Upload this .zip directly to:" -ForegroundColor Yellow
Write-Host " - Microsoft Partner Center: https://partner.microsoft.com/dashboard/microsoftedge" -ForegroundColor Gray
Write-Host " - Chrome Web Store Dev:     https://chrome.google.com/webstore/devconsole" -ForegroundColor Gray
