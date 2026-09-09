@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title JapStudio - Japanese Multi-Mode AI Learning OS

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "SPEAK_DIR=%ROOT_DIR%\modules\speak"
set "WRITE_DIR=%ROOT_DIR%\modules\write"
set "IMMERSION_DIR=%ROOT_DIR%\modules\immersion"

REM ============================================================
REM CLI Argument Dispatcher
REM ============================================================
if /i "%~1"=="speak"     goto :START_SPEAK
if /i "%~1"=="write"     goto :START_WRITE
if /i "%~1"=="immersion" goto :START_IMMERSION
if /i "%~1"=="all"       goto :START_ALL
if /i "%~1"=="stop"      goto :STOP_ALL
if /i "%~1"=="help"      goto :USAGE

REM Default with no arg => Interactive Mode Selector
:MENU
cls
echo ======================================================================
echo             JAPSTUDIO — JAPANESE LEARNING MULTI-MODE OS
echo ======================================================================
echo.
echo   [1] JapSpeak     - Luyện Nói & Hội Thoại AI  (Web :3000 ^| API :8000)
echo   [2] JapWrite     - Luyện Viết & Thử Thách AI (Web :5173 ^| API :8001)
echo   [3] JapImmersion - Đắm Chìm & Quản Lý Nguồn  (Web :3002 ^| API :8002)
echo   [4] Full Hub     - Chạy cả 3 Mode & Mở Hub Portal (Khuyên dùng)
echo   [5] Stop All     - Dừng toàn bộ cổng (8000, 8001, 8002, 3000, 3002, 5173)
echo   [6] Thoát
echo.
echo ======================================================================
set /p "CHOICE=Nhập lựa chọn của bạn (1-6) [Mặc định 4]: "

if "%CHOICE%"=="" goto :START_ALL
if "%CHOICE%"=="1" goto :START_SPEAK
if "%CHOICE%"=="2" goto :START_WRITE
if "%CHOICE%"=="3" goto :START_IMMERSION
if "%CHOICE%"=="4" goto :START_ALL
if "%CHOICE%"=="5" goto :STOP_ALL
if "%CHOICE%"=="6" exit /b 0
echo Lựa chọn không hợp lệ, vui lòng chọn lại!
ping -n 2 127.0.0.1 >nul
goto :MENU

REM ============================================================
REM Mode 1: JapSpeak
REM ============================================================
:START_SPEAK
cls
call "%ROOT_DIR%\switch.bat" speak
ping -n 3 127.0.0.1 >nul
start http://localhost:3000/dashboard
goto :EOF

REM ============================================================
REM Mode 2: JapWrite
REM ============================================================
:START_WRITE
cls
call "%ROOT_DIR%\switch.bat" write
ping -n 3 127.0.0.1 >nul
start http://localhost:5173
goto :EOF

REM ============================================================
REM Mode 3: JapImmersion
REM ============================================================
:START_IMMERSION
cls
call "%ROOT_DIR%\switch.bat" immersion
ping -n 3 127.0.0.1 >nul
start http://localhost:3002/immersion
goto :EOF

REM ============================================================
REM Mode 4: Full Hub (All Modes)
REM ============================================================
:START_ALL
cls
echo ======================================================================
echo     JAPSTUDIO — ĐANG KHỞI ĐỘNG FULL HUB (SPEAK + WRITE + IMMERSION)
echo ======================================================================
echo.

echo [1/6] Dọn dẹp tab terminal và tiến trình cũ trên các cổng...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*' -or $_.CommandLine -like '*multiprocessing*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
powershell -NoProfile -Command "$openCons = @(Get-Process OpenConsole -ErrorAction SilentlyContinue); if ($openCons.Count -gt 0) { $all = Get-CimInstance Win32_Process; $openCons | ForEach-Object { $id = $_.Id; $c = $all | Where-Object { $_.ParentProcessId -eq $id }; if ($null -eq $c -or $c.Count -eq 0) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } }"
ping -n 2 127.0.0.1 >nul

echo [2/6] Khởi động JapSpeak Backend (FastAPI :8000)...
start "JapSpeak - Backend (Port 8000)" /D "%SPEAK_DIR%\apps\api" cmd /c "title JapSpeak API (8000) && color 0C && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload || pause"

echo [3/6] Khởi động JapWrite Backend (FastAPI :8001)...
start "JapWrite - Backend (Port 8001)" /D "%WRITE_DIR%\apps\api" cmd /c "title JapWrite API (8001) && color 09 && call .venv\Scripts\activate.bat && python -m alembic upgrade head >nul 2>&1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload || pause"

echo [4/6] Khởi động JapImmersion Backend (FastAPI :8002)...
start "JapImmersion - Backend (Port 8002)" /D "%IMMERSION_DIR%\apps\api" cmd /c "title JapImmersion API (8002) && color 0D && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload || pause"

echo [5/6] Khởi động Web Frontends (Speak :3000, Write :5173, Immersion :3002)...
start "JapSpeak - Web Hub (Port 3000)" /D "%SPEAK_DIR%\apps\web" cmd /c "title JapSpeak Web (3000) && color 0E && npm run dev || pause"
start "JapWrite - Web (Port 5173)" /D "%WRITE_DIR%\apps\web" cmd /c "title JapWrite Web (5173) && color 0B && npm run dev || pause"
start "JapImmersion - Web (Port 3002)" /D "%IMMERSION_DIR%\apps\web" cmd /c "title JapImmersion Web (3002) && color 0A && npm run dev || pause"

echo [6/6] Mở Hub Portal trên trình duyệt...
ping -n 5 127.0.0.1 >nul
start http://localhost:3000

echo.
echo ======================================================================
echo   [OK] JAPSTUDIO ĐÃ KHỞI ĐỘNG THÀNH CÔNG TẤT CẢ 3 CHẾ ĐỘ!
echo   ------------------------------------------------------------------
echo   - Web Hub Portal:  http://localhost:3000
echo   - JapSpeak Web:    http://localhost:3000/dashboard (API :8000)
echo   - JapWrite Web:    http://localhost:5173           (API :8001)
echo   - JapImmersion Web:http://localhost:3002/immersion (API :8002)
echo   ------------------------------------------------------------------
echo   * Để dừng toàn bộ, bạn có thể chạy: stop.bat hoặc start.bat stop
echo ======================================================================
echo.
exit /b 0

REM ============================================================
REM Stop All
REM ============================================================
:STOP_ALL
cls
call "%ROOT_DIR%\stop.bat"
goto :EOF

:USAGE
echo Cách sử dụng:
echo   start.bat            : Mở menu chọn chế độ đồ họa
echo   start.bat speak      : Khởi động chế độ JapSpeak (Luyện Nói)
echo   start.bat write      : Khởi động chế độ JapWrite (Luyện Viết)
echo   start.bat immersion  : Khởi động chế độ JapImmersion (Đắm Chìm & Nguồn)
echo   start.bat all        : Khởi động cả 3 chế độ và mở Hub Portal
echo   start.bat stop       : Dừng tất cả dịch vụ
goto :EOF
