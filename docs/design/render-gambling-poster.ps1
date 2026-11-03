Add-Type -AssemblyName System.Drawing
$outDir = Join-Path $PSScriptRoot 'gambling-awareness'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 1080,1350
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$navy = [System.Drawing.ColorTranslator]::FromHtml('#061f32')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#e8c966')
$g.Clear($navy)
function Text($value, $size, $y, $color, $bold = $false) {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = New-Object System.Drawing.Font 'Arial',$size,$style,([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.DrawString($value,$font,$brush,72,$y)
  $font.Dispose(); $brush.Dispose()
}
$logoPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../frontend/src/assets/logo-white.png'))
$logo = [System.Drawing.Image]::FromFile($logoPath)
$g.DrawImage($logo,72,62,300,[int](300 * $logo.Height / $logo.Width))
$logo.Dispose()
$pen = New-Object System.Drawing.Pen $gold,3
$g.DrawLine($pen,72,180,1008,180)
Text 'СЭРЭМЖЛҮҮЛЭГ' 24 218 $gold $true
Text 'МӨРИЙТЭЙ' 76 280 ([System.Drawing.Color]::White) $true
Text 'ТОГЛООМООС' 76 365 ([System.Drawing.Color]::White) $true
Text 'ТАТГАЛЗЪЯ' 76 450 $gold $true
Text 'Санхүү, ирээдүйгээ хамгаалъя.' 33 562 ([System.Drawing.Color]::White)
$panelBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#102f43'))
$g.FillRectangle($panelBrush,72,657,936,224)
Text 'ХУУЛИАР ХОРИГЛОСОН' 28 687 $gold $true
Text 'Төлбөрт таавар, бооцоот тоглоом,' 32 740 ([System.Drawing.Color]::White)
Text 'цахим мөрийтэй тоглоомын үйл' 32 783 ([System.Drawing.Color]::White)
Text 'ажиллагаа эрхлэхийг хориглоно.' 32 826 ([System.Drawing.Color]::White)
Text '01   Мөрий, бооцоонд мөнгөө бүү эрсдэлд оруул.' 29 927 ([System.Drawing.Color]::White)
Text '02   Дансаа бусдад бүү ашиглуул.' 29 986 ([System.Drawing.Color]::White)
Text '03   Санхүүгийн мэдээллээ хамгаал.' 29 1045 ([System.Drawing.Color]::White)
$g.DrawLine($pen,72,1146,1008,1146)
Text 'Эрүүгийн хуулийн 20.18, 20.19 дүгээр зүйл' 23 1175 $gold
Text 'Эх сурвалж: Монголбанк · fiu.mongolbank.mn/mn/r/2220' 20 1215 ([System.Drawing.Color]::LightGray)
Text 'scm.mn' 28 1275 ([System.Drawing.Color]::White) $true
$bitmap.Save((Join-Path $outDir 'facebook-gambling-warning-1080x1350.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$pen.Dispose(); $panelBrush.Dispose(); $g.Dispose(); $bitmap.Dispose()
