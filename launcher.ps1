$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrEmpty($scriptDir)) {
    $scriptDir = "E:\JapStudio"
}
# Promote to script scope so WPF event handlers can access it
$script:scriptDir = $scriptDir

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="JapStudio - Japanese Multi-Mode AI Learning OS"
        Height="650" Width="840"
        WindowStartupLocation="CenterScreen"
        ResizeMode="CanMinimize"
        Background="#0B0F19"
        Foreground="#F8FAFC"
        FontFamily="Segoe UI, Segoe UI Emoji, Arial"
        TextOptions.TextRenderingMode="ClearType">
    <Window.Resources>
        <Style TargetType="Button">
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
            <Setter Property="FontSize" Value="13"/>
            <Setter Property="Padding" Value="14,10"/>
            <Setter Property="Foreground" Value="White"/>
            <Setter Property="BorderThickness" Value="0"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Background="{TemplateBinding Background}"
                                CornerRadius="8"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <Grid Margin="24,20,24,20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <Grid Grid.Row="0" Margin="0,0,0,16">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            <Border Grid.Column="0" Width="56" Height="56" CornerRadius="12" Margin="0,0,14,0" ClipToBounds="True">
                <Image Name="imgLogo" Stretch="UniformToFill"/>
            </Border>
            <StackPanel Grid.Column="1" VerticalAlignment="Center">
                <TextBlock Text="JAPSTUDIO" FontSize="22" FontWeight="Bold" Foreground="#F8FAFC"/>
                <TextBlock Text="Japanese Multi-Mode AI Learning OS (Speak + Write + Immersion)" FontSize="12" Foreground="#94A3B8" Margin="0,2,0,0"/>
            </StackPanel>
        </Grid>

        <!-- Status Panel (6 Ports) -->
        <Border Grid.Row="1" Background="#151D2E" BorderBrush="#243048" BorderThickness="1" CornerRadius="10" Padding="14,10" Margin="0,0,0,16">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                
                <StackPanel Grid.Column="0" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotSpeakWeb" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtSpeakWeb" Text="Speak Web :3000" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>

                <StackPanel Grid.Column="1" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotSpeakApi" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtSpeakApi" Text="Speak API :8000" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>

                <StackPanel Grid.Column="2" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotWriteWeb" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtWriteWeb" Text="Write Web :5173" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>

                <StackPanel Grid.Column="3" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotWriteApi" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtWriteApi" Text="Write API :8001" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>

                <StackPanel Grid.Column="4" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotImmersionWeb" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtImmersionWeb" Text="Immersion Web :3002" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>

                <StackPanel Grid.Column="5" Orientation="Horizontal" HorizontalAlignment="Center">
                    <Ellipse Name="dotImmersionApi" Width="9" Height="9" Fill="#64748B" Margin="0,0,6,0" VerticalAlignment="Center"/>
                    <TextBlock Name="txtImmersionApi" Text="Immersion API :8002" FontSize="11" Foreground="#94A3B8" VerticalAlignment="Center"/>
                </StackPanel>
            </Grid>
        </Border>

        <!-- Mode: Full Hub -->
        <Border Grid.Row="2" Background="#182238" BorderBrush="#3B82F6" BorderThickness="1.5" CornerRadius="12" Padding="16,14" Margin="0,0,0,14">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>
                <StackPanel Grid.Column="0" VerticalAlignment="Center">
                    <StackPanel Orientation="Horizontal" Margin="0,0,0,4">
                        <TextBlock Text="🌟 FULL STUDIO HUB" FontSize="15" FontWeight="Bold" Foreground="#60A5FA"/>
                        <Border Background="#1E3A8A" CornerRadius="4" Padding="6,1" Margin="8,0,0,0" VerticalAlignment="Center">
                            <TextBlock Text="KHUYÊN DÙNG" FontSize="9" FontWeight="Bold" Foreground="#93C5FD"/>
                        </Border>
                    </StackPanel>
                    <TextBlock Text="Khởi chạy cả 3 Mode: JapSpeak, JapWrite và JapImmersion rồi tự động mở Hub Portal (:3000)."
                               FontSize="11" Foreground="#94A3B8" TextWrapping="Wrap" Margin="0,2,10,0"/>
                </StackPanel>
                <Button Name="btnStartAll" Grid.Column="1" Background="#2563EB" Width="180" Height="40"
                        Content="🚀 Khởi chạy Full Studio" HorizontalAlignment="Right" VerticalAlignment="Center"/>
            </Grid>
        </Border>

        <!-- Modes Grid (3 Columns) -->
        <Grid Grid.Row="3" Margin="0,0,0,16">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="12"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="12"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>

            <!-- JapSpeak -->
            <Border Grid.Column="0" Background="#151D2E" BorderBrush="#243048" BorderThickness="1" CornerRadius="12" Padding="14">
                <StackPanel>
                    <TextBlock Text="🎙️ JapSpeak" FontSize="14" FontWeight="Bold" Foreground="#34D399" Margin="0,0,0,2"/>
                    <TextBlock Text="Luyện Nói &amp; Hội Thoại AI" FontSize="11" FontWeight="SemiBold" Foreground="#64748B"/>
                    <TextBlock Text="Web :3000 | API :8000. Luyện phát âm và phản xạ qua Micro."
                               FontSize="11" Foreground="#94A3B8" TextWrapping="Wrap" Margin="0,4,0,12" Height="36"/>
                    <Button Name="btnStartSpeak" Background="#059669" Height="36" Content="🎙️ Mở JapSpeak"/>
                </StackPanel>
            </Border>

            <!-- JapWrite -->
            <Border Grid.Column="2" Background="#151D2E" BorderBrush="#243048" BorderThickness="1" CornerRadius="12" Padding="14">
                <StackPanel>
                    <TextBlock Text="✍️ JapWrite" FontSize="14" FontWeight="Bold" Foreground="#A78BFA" Margin="0,0,0,2"/>
                    <TextBlock Text="Luyện Viết &amp; Thử Thách AI" FontSize="11" FontWeight="SemiBold" Foreground="#64748B"/>
                    <TextBlock Text="Web :5173 | API :8001. Luyện viết câu, ngữ pháp &amp; đánh Boss."
                               FontSize="11" Foreground="#94A3B8" TextWrapping="Wrap" Margin="0,4,0,12" Height="36"/>
                    <Button Name="btnStartWrite" Background="#7C3AED" Height="36" Content="✍️ Mở JapWrite"/>
                </StackPanel>
            </Border>

            <!-- JapImmersion -->
            <Border Grid.Column="4" Background="#151D2E" BorderBrush="#243048" BorderThickness="1" CornerRadius="12" Padding="14">
                <StackPanel>
                    <TextBlock Text="🌏 JapImmersion" FontSize="14" FontWeight="Bold" Foreground="#FB7185" Margin="0,0,0,2"/>
                    <TextBlock Text="Đắm Chìm &amp; Đọc Báo Thực Tế" FontSize="11" FontWeight="SemiBold" Foreground="#64748B"/>
                    <TextBlock Text="Web :3002 | API :8002. Live Feed, Reader, Quiz, FSRS &amp; Xu Hướng."
                               FontSize="11" Foreground="#94A3B8" TextWrapping="Wrap" Margin="0,4,0,12" Height="36"/>
                    <Button Name="btnStartImmersion" Background="#E11D48" Height="36" Content="🌏 Mở JapImmersion"/>
                </StackPanel>
            </Border>
        </Grid>

        <!-- Bottom Action Bar -->
        <Grid Grid.Row="5" Margin="0,4,0,0">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="Auto"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>

            <Button Name="btnOpenBrowser" Grid.Column="0" Background="#1E293B" Padding="12,7" Margin="0,0,8,0" Content="🌐 Mở Web Portal (:3000)"/>
            <Button Name="btnOpenWrite" Grid.Column="1" Background="#1E293B" Padding="12,7" Margin="0,0,8,0" Content="📝 Mở Web Write (:5173)"/>
            <Button Name="btnOpenImmersion" Grid.Column="2" Background="#1E293B" Padding="12,7" Content="🌏 Mở Immersion (:3002)"/>

            <Button Name="btnStopAll" Grid.Column="4" Background="#DC2626" Padding="14,7" Content="🛑 Dừng Tất Cả Dịch Vụ"/>
        </Grid>

        <!-- Status Message / Log -->
        <TextBlock Name="txtStatus" Grid.Row="6" Text="Sẵn sàng." FontSize="11" Foreground="#64748B" Margin="0,12,0,0" TextAlignment="Center"/>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

# Set Window Icon and Logo Image
$logoPath = Join-Path $scriptDir "assets\japstudio.png"
if (Test-Path $logoPath) {
    try {
        $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
        $bitmap.BeginInit()
        $bitmap.UriSource = New-Object System.Uri($logoPath, [System.UriKind]::Absolute)
        $bitmap.EndInit()
        $imgLogo = $window.FindName("imgLogo")
        if ($null -ne $imgLogo) {
            $imgLogo.Source = $bitmap
        }
    } catch {}
}

$icoPath = Join-Path $scriptDir "assets\japstudio.ico"
if (Test-Path $icoPath) {
    try {
        $window.Icon = [System.Windows.Media.Imaging.BitmapFrame]::Create((New-Object System.Uri($icoPath, [System.UriKind]::Absolute)))
    } catch {}
}

# Elements
$btnStartAll       = $window.FindName("btnStartAll")
$btnStartSpeak     = $window.FindName("btnStartSpeak")
$btnStartWrite     = $window.FindName("btnStartWrite")
$btnStartImmersion = $window.FindName("btnStartImmersion")
$btnStopAll        = $window.FindName("btnStopAll")
$btnOpenBrowser    = $window.FindName("btnOpenBrowser")
$btnOpenWrite      = $window.FindName("btnOpenWrite")
$btnOpenImmersion  = $window.FindName("btnOpenImmersion")
$txtStatus         = $window.FindName("txtStatus")

$brushRunning      = [System.Windows.Media.Brushes]::LimeGreen
$brushStopped      = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#64748B")
$brushActiveText   = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#F8FAFC")
$brushInactiveText = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#94A3B8")

function Update-PortStatus {
    $activeCount = 0
    $speakWeb     = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
    $speakApi     = [bool](Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue)
    $writeWeb     = [bool](Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)
    $writeApi     = [bool](Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue)
    $immersionWeb = [bool](Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue)
    $immersionApi = [bool](Get-NetTCPConnection -LocalPort 8002 -State Listen -ErrorAction SilentlyContinue)

    $statusMap = @{
        "SpeakWeb"     = $speakWeb
        "SpeakApi"     = $speakApi
        "WriteWeb"     = $writeWeb
        "WriteApi"     = $writeApi
        "ImmersionWeb" = $immersionWeb
        "ImmersionApi" = $immersionApi
    }

    foreach ($entry in $statusMap.GetEnumerator()) {
        $key = $entry.Key
        $isOpen = $entry.Value
        if ($isOpen) { $activeCount++ }
        $dot = $window.FindName("dot$key")
        $txt = $window.FindName("txt$key")
        if ($null -ne $dot -and $null -ne $txt) {
            if ($isOpen) {
                $dot.Fill = $brushRunning
                $txt.Foreground = $brushActiveText
            } else {
                $dot.Fill = $brushStopped
                $txt.Foreground = $brushInactiveText
            }
        }
    }

    $speakReady     = $speakWeb -and $speakApi
    $writeReady     = $writeWeb -and $writeApi
    $immersionReady = $immersionWeb -and $immersionApi

    if ($speakReady -and $writeReady -and $immersionReady) {
        $txtStatus.Text = "🌟 Full Studio đang hoạt động (Speak :3000 | Write :5173 | Immersion :3002)"
    } elseif ($speakReady -and $writeReady) {
        $txtStatus.Text = "🌟 Speak & Write đang hoạt động (:3000 | :5173)"
    } elseif ($immersionReady) {
        $txtStatus.Text = "🌏 JapImmersion đang sẵn sàng (Web :3002 | API :8002)"
    } elseif ($speakReady) {
        $txtStatus.Text = "🎙️ JapSpeak đang sẵn sàng (Web :3000 | API :8000)"
    } elseif ($writeReady) {
        $txtStatus.Text = "✍️ JapWrite đang sẵn sàng (Web :5173 | API :8001)"
    } elseif ($activeCount -eq 0 -and $txtStatus.Text -notlike 'Đang khởi động*') {
        $txtStatus.Text = "Sẵn sàng."
    }
}

# Timer for live status refresh every 1.5s
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(1500)
$timer.Add_Tick({ Update-PortStatus })
$timer.Start()

# --- Helper: Kill process on a specific port ---
function Stop-PortProcess {
    param([int]$Port)
    $lines = netstat -ano | Select-String ":$Port\s"
    foreach ($line in $lines) {
        if ($line -match 'LISTENING\s+(\d+)') {
            $pidNum = [int]$Matches[1]
            if ($pidNum -gt 0) {
                Stop-Process -Id $pidNum -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# --- Helper: Kill all JapStudio service processes ---
function Stop-AllJapServices {
    foreach ($port in @(8000, 8001, 8002, 3000, 3002, 5173)) { Stop-PortProcess $port }
    # Also kill via Get-NetTCPConnection (more reliable than netstat text parsing)
    try {
        Get-NetTCPConnection -LocalPort 8000,8001,8002,3000,3002,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch {}
    # Kill python/node/cmd related to JapStudio, including multiprocessing children that hold sockets after parent dies
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.Name -in @('python.exe','node.exe','cmd.exe')) -and
        ($_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*modules\immersion*' -or
         $_.CommandLine -like '*uvicorn*' -or $_.CommandLine -like '*next*dev*' -or $_.CommandLine -like '*vite*' -or
         $_.CommandLine -like '*multiprocessing*' -or $_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*JapImmersion*')
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    # Fallback: kill any python with multiprocessing
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'python.exe' -and ($_.CommandLine -like '*-c*multiprocessing.spawn*')
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 800
    # Extra sweep for orphaned python multiprocessing
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -eq 'python.exe' -and $_.CommandLine -like '*spawn_main*'
    } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Milliseconds 300
}

# --- Helper: Write log ---
function Write-LauncherLog {
    param([string]$Text)
    try {
        $logPath = Join-Path $script:scriptDir "launcher.log"
        $timeStr = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content -LiteralPath $logPath -Value "[$timeStr] $Text" -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {}
}

# --- Helper: Start a single service in a named cmd window ---
function Start-ServiceWindow {
    param([string]$Title, [string]$Color, [string]$WorkDir, [string]$Command)
    try {
        if ([string]::IsNullOrWhiteSpace($WorkDir) -or !(Test-Path -LiteralPath $WorkDir)) {
            $msg = "Không tìm thấy thư mục: $WorkDir"
            $txtStatus.Text = "❌ $msg"
            [System.Windows.MessageBox]::Show($msg, "JapStudio - Lỗi WorkDir", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error) | Out-Null
            return
        }
        if ($Command -like "*activate.bat*" -and !(Test-Path -LiteralPath (Join-Path $WorkDir ".venv\Scripts\activate.bat")) -and !(Test-Path -LiteralPath (Join-Path $WorkDir ".venv\Scripts\python.exe"))) {
            $txtStatus.Text = "⚠️ Cảnh báo: thiếu .venv tại $WorkDir"
        }
        $cmdStr = "/k title `"$Title`" && color $Color && cd /d `"$WorkDir`" && $Command || pause"
        Start-Process "cmd.exe" -ArgumentList $cmdStr -WindowStyle Normal
        Write-LauncherLog "START $Title | $WorkDir | $Command"
    } catch {
        $msg = $_.Exception.Message
        $txtStatus.Text = "❌ Lỗi khởi động $Title : $msg"
        try {
            [System.Windows.MessageBox]::Show("$Title`n$msg", "JapStudio - Lỗi", [System.Windows.MessageBoxButton]::OK, [System.Windows.MessageBoxImage]::Error) | Out-Null
        } catch {}
        Write-LauncherLog "ERROR $Title : $msg"
    }
}

# Button handlers
$btnStartAll.Add_Click({
    $txtStatus.Text = "Đang dọn dẹp tiến trình cũ..."
    Stop-AllJapServices
    $sd = $script:scriptDir
    $speakApi     = "$sd\modules\speak\apps\api"
    $speakWeb     = "$sd\modules\speak\apps\web"
    $writeApi     = "$sd\modules\write\apps\api"
    $writeWeb     = "$sd\modules\write\apps\web"
    $immersionApi = "$sd\modules\immersion\apps\api"
    $immersionWeb = "$sd\modules\immersion\apps\web"

    $txtStatus.Text = "Đang khởi động Full Studio Hub (Speak + Write + Immersion)..."
    Start-ServiceWindow "JapSpeak API (8000)" "0C" $speakApi "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    Start-ServiceWindow "JapWrite API (8001)" "09" $writeApi "call .venv\Scripts\activate.bat && python -m alembic upgrade head >nul 2>&1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
    Start-ServiceWindow "JapImmersion API (8002)" "0D" $immersionApi "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"

    Start-ServiceWindow "JapSpeak Web (3000)" "0E" $speakWeb "call npm run dev"
    Start-ServiceWindow "JapWrite Web (5173)" "0B" $writeWeb "call npm run dev"
    Start-ServiceWindow "JapImmersion Web (3002)" "0A" $immersionWeb "call npm run dev"

    Start-Sleep -Seconds 4
    Start-Process "http://localhost:3000"
})

$btnStartSpeak.Add_Click({
    $txtStatus.Text = "Đang dọn dẹp tiến trình cũ..."
    Stop-AllJapServices
    $sd = $script:scriptDir
    $speakApi = "$sd\modules\speak\apps\api"
    $speakWeb = "$sd\modules\speak\apps\web"

    $txtStatus.Text = "Đang khởi động JapSpeak..."
    Start-ServiceWindow "JapSpeak API (8000)" "0C" $speakApi "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    Start-ServiceWindow "JapSpeak Web (3000)" "0E" $speakWeb "call npm run dev"
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:3000/dashboard"
})

$btnStartWrite.Add_Click({
    $txtStatus.Text = "Đang dọn dẹp tiến trình cũ..."
    Stop-AllJapServices
    $sd = $script:scriptDir
    $writeApi = "$sd\modules\write\apps\api"
    $writeWeb = "$sd\modules\write\apps\web"

    $txtStatus.Text = "Đang khởi động JapWrite..."
    Start-ServiceWindow "JapWrite API (8001)" "09" $writeApi "call .venv\Scripts\activate.bat && python -m alembic upgrade head >nul 2>&1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
    Start-ServiceWindow "JapWrite Web (5173)" "0B" $writeWeb "call npm run dev"
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:5173"
})

$btnStartImmersion.Add_Click({
    $txtStatus.Text = "Đang dọn dẹp tiến trình cũ..."
    Stop-AllJapServices
    $sd = $script:scriptDir
    $immersionApi = "$sd\modules\immersion\apps\api"
    $immersionWeb = "$sd\modules\immersion\apps\web"

    $txtStatus.Text = "Đang khởi động JapImmersion..."
    Start-ServiceWindow "JapImmersion API (8002)" "0D" $immersionApi "call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"
    Start-ServiceWindow "JapImmersion Web (3002)" "0A" $immersionWeb "call npm run dev"
    Start-Sleep -Seconds 4
    Start-Process "http://localhost:3002/immersion"
})

$btnStopAll.Add_Click({
    $txtStatus.Text = "Đang dừng toàn bộ dịch vụ..."
    Stop-AllJapServices
    $txtStatus.Text = "Đã dừng toàn bộ dịch vụ JapStudio."
    Update-PortStatus
})

$btnOpenBrowser.Add_Click({
    Start-Process "http://localhost:3000"
})

$btnOpenWrite.Add_Click({
    Start-Process "http://localhost:5173"
})

$btnOpenImmersion.Add_Click({
    Start-Process "http://localhost:3002/immersion"
})

$window.Add_Loaded({
    Update-PortStatus
})

# Show GUI
$window.ShowDialog() | Out-Null
