param([string]$FfmpegPath = "ffmpeg")

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

$atlasDirectory = Join-Path $projectRoot "\assets\atlases"

$shadowDirectory = Join-Path $atlasDirectory "shadows"

$atlasDataPath = Join-Path $projectRoot "\data\atlases\items_atlas.json"

$atlasData =
    Get-Content -Raw -LiteralPath $atlasDataPath |
    ConvertFrom-Json

$shadowCellSize = 52
$spriteSize = 36
$spriteOffsetX = 8
$spriteOffsetY = 9
$shadowBlur = 1.5

New-Item `
    -ItemType Directory `
    -Path $shadowDirectory `
    -Force |
    Out-Null

foreach ($categoryProperty in $atlasData.categories.PSObject.Properties) {

    $category = $categoryProperty.Value

    $sourcePath = Join-Path $atlasDirectory $category.file

    $outputPath = Join-Path $shadowDirectory $category.file

    $layout = "$($category.columns)x$($category.rows)"

    $filter = @(
        "format=rgba"
        "untile=$layout"
        "scale=${spriteSize}:${spriteSize}:flags=neighbor"
        "pad=${shadowCellSize}:${shadowCellSize}:${spriteOffsetX}:${spriteOffsetY}:color=0x00000000"
        "colorchannelmixer=rr=0:gg=0:bb=0:aa=0.5"
        "gblur=sigma=${shadowBlur}:planes=8"
        "tile=${layout}:padding=0:margin=0"
    ) -join ","

    & $FfmpegPath `
        -hide_banner `
        -loglevel error `
        -y `
        -i $sourcePath `
        -vf $filter `
        -frames:v 1 `
        -pix_fmt rgba `
        $outputPath

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build shadow atlas: $($category.file)"
    }
}