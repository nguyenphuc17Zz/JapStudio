@echo off
chcp 65001 >nul 2>&1
setlocal

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "PS1=%ROOT%\launcher.ps1"

REM Ensure launcher.ps1 has UTF-8 BOM (required for PowerShell 5.x to parse Vietnamese correctly)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$f='%PS1%'; $b=[System.IO.File]::ReadAllBytes($f); if($b.Count -lt 3 -or $b[0] -ne 0xEF -or $b[1] -ne 0xBB -or $b[2] -ne 0xBF){ $nb=[byte[]](0xEF,0xBB,0xBF)+$b; [System.IO.File]::WriteAllBytes($f,$nb) }"

REM Launch the WPF GUI
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Loi] JapStudio GUI da dung lai do co loi (Error code: %ERRORLEVEL%).
    echo Vui long kiem tra thong bao loi o tren.
    echo.
    pause
)
