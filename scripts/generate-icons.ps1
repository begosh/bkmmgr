Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    [float]$margin = [Math]::Max(1.0, [float]$size * 0.05)
    [float]$rectX = $margin
    [float]$rectY = $margin
    [float]$rectW = [float]$size - ($margin * 2.0)
    [float]$rectH = [float]$size - ($margin * 2.0)
    [float]$radius = [float]$size * 0.22

    # Squircle Path
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    [float]$d = $radius * 2.0
    $path.AddArc($rectX, $rectY, $d, $d, 180.0, 90.0)
    $path.AddArc(($rectX + $rectW - $d), $rectY, $d, $d, 270.0, 90.0)
    $path.AddArc(($rectX + $rectW - $d), ($rectY + $rectH - $d), $d, $d, 0.0, 90.0)
    $path.AddArc($rectX, ($rectY + $rectH - $d), $d, $d, 90.0, 90.0)
    $path.CloseFigure()

    # Gradient Brush (Blue 600 #2563eb to Indigo 600 #4f46e5)
    $p1 = New-Object System.Drawing.PointF($rectX, $rectY)
    $p2 = New-Object System.Drawing.PointF(($rectX + $rectW), ($rectY + $rectH))
    $cTop = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)
    $cBottom = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1, $p2, $cTop, $cBottom)
    $g.FillPath($brush, $path)

    # Subtle inner border/highlight
    [float]$penW = [Math]::Max(1.0, [float]$size * 0.025)
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 255, 255, 255), $penW)
    $g.DrawPath($borderPen, $path)

    # Bookmark Ribbon dimensions
    [float]$bmW = [float]$size * 0.44
    [float]$bmH = [float]$size * 0.58
    [float]$bmX = ([float]$size - $bmW) / 2.0
    [float]$bmY = ([float]$size - $bmH) / 2.0 - ([float]$size * 0.02)
    [float]$notchH = $bmH * 0.30
    [float]$cornerR = [Math]::Max(1.0, [float]$size * 0.04)

    $bmPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bmPath.AddLine(($bmX + $cornerR), $bmY, ($bmX + $bmW - $cornerR), $bmY)
    $bmPath.AddArc(($bmX + $bmW - ($cornerR * 2.0)), $bmY, ($cornerR * 2.0), ($cornerR * 2.0), 270.0, 90.0)
    $bmPath.AddLine(($bmX + $bmW), ($bmY + $cornerR), ($bmX + $bmW), ($bmY + $bmH))
    $bmPath.AddLine(($bmX + $bmW), ($bmY + $bmH), ($bmX + ($bmW / 2.0)), ($bmY + $bmH - $notchH))
    $bmPath.AddLine(($bmX + ($bmW / 2.0)), ($bmY + $bmH - $notchH), $bmX, ($bmY + $bmH))
    $bmPath.AddLine($bmX, ($bmY + $bmH), $bmX, ($bmY + $cornerR))
    $bmPath.AddArc($bmX, $bmY, ($cornerR * 2.0), ($cornerR * 2.0), 180.0, 90.0)
    $bmPath.CloseFigure()

    # Drop Shadow for ribbon when size >= 32
    if ($size -ge 32) {
        $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
        $g.TranslateTransform(0.0, [Math]::Max(1.0, [float]$size * 0.025))
        $g.FillPath($shadowBrush, $bmPath)
        $g.ResetTransform()
    }

    # Fill white ribbon
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($whiteBrush, $bmPath)

    # Sparkle / Star accent in top right of ribbon when size >= 48
    if ($size -ge 48) {
        [float]$starCX = $bmX + $bmW - ([float]$size * 0.03)
        [float]$starCY = $bmY + ([float]$size * 0.07)
        [float]$starR = [float]$size * 0.08
        $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $starPath.AddLine($starCX, ($starCY - $starR), ($starCX + ($starR * 0.28)), ($starCY - ($starR * 0.28)))
        $starPath.AddLine(($starCX + ($starR * 0.28)), ($starCY - ($starR * 0.28)), ($starCX + $starR), $starCY)
        $starPath.AddLine(($starCX + $starR), $starCY, ($starCX + ($starR * 0.28)), ($starCY + ($starR * 0.28)))
        $starPath.AddLine(($starCX + ($starR * 0.28)), ($starCY + ($starR * 0.28)), $starCX, ($starCY + $starR))
        $starPath.AddLine($starCX, ($starCY + $starR), ($starCX - ($starR * 0.28)), ($starCY + ($starR * 0.28)))
        $starPath.AddLine(($starCX - ($starR * 0.28)), ($starCY + ($starR * 0.28)), ($starCX - $starR), $starCY)
        $starPath.AddLine(($starCX - $starR), $starCY, ($starCX - ($starR * 0.28)), ($starCY - ($starR * 0.28)))
        $starPath.AddLine(($starCX - ($starR * 0.28)), ($starCY - ($starR * 0.28)), $starCX, ($starCY - $starR))
        $starPath.CloseFigure()

        $starBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11)) # Amber 500
        $g.FillPath($starBrush, $starPath)
        $starBrush.Dispose()
        $starPath.Dispose()
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $brush.Dispose()
    $borderPen.Dispose()
    $path.Dispose()
    $bmPath.Dispose()
    $whiteBrush.Dispose()
    if ($shadowBrush) { $shadowBrush.Dispose() }
    $g.Dispose()
    $bmp.Dispose()
}

$sizes = @(16, 32, 48, 128, 512)
foreach ($s in $sizes) {
    $out = "public/icons/icon$s.png"
    Generate-Icon $s $out
    $len = (Get-Item $out).Length
    Write-Output "Successfully generated $out ($s x $s) - $len bytes"
}
