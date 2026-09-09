@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title JapStudio - Chuyển đổi Chế độ (Mode Switcher)

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "SPEAK_DIR=%ROOT_DIR%\modules\speak"
set "WRITE_DIR=%ROOT_DIR%\modules\write"
set "IMMERSION_DIR=%ROOT_DIR%\modules\immersion"

if /i "%~1"=="write" goto :SWITCH_TO_WRITE
if /i "%~1"=="speak" goto :SWITCH_TO_SPEAK
if /i "%~1"=="immersion" goto :SWITCH_TO_IMMERSION

echo Cách sử dụng:
echo   switch.bat write      - Chuyển sang JapWrite (:5173 / :8001)
echo   switch.bat speak      - Chuyển sang JapSpeak (:3000 / :8000)
echo   switch.bat immersion  - Chuyển sang JapImmersion (:3002 / :8002)
exit /b 1

REM ============================================================
REM CHUYỂN SANG JAPWRITE (:5173 / :8001)
REM ============================================================
:SWITCH_TO_WRITE
echo ======================================================================
echo   [JapStudio] Đang chuyển chế độ sang JapWrite...
echo   - Tắt sạch tab và tiến trình khác để giải phóng RAM ^& CPU
echo   - Khởi động JapWrite (Vite :5173 + FastAPI :8001)
echo ======================================================================

powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*' -or $_.CommandLine -like '*multiprocessing*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
ping -n 2 127.0.0.1 >nul

powershell -NoProfile -Command "$openCons = @(Get-Process OpenConsole -ErrorAction SilentlyContinue); if ($openCons.Count -gt 0) { $all = Get-CimInstance Win32_Process; $openCons | ForEach-Object { $id = $_.Id; $c = $all | Where-Object { $_.ParentProcessId -eq $id }; if ($null -eq $c -or $c.Count -eq 0) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } }"

echo   [+] Khởi động JapWrite API (:8001)...
start "JapWrite - Backend (Port 8001)" /D "%WRITE_DIR%\apps\api" cmd /c "title JapWrite API (8001) && color 09 && call .venv\Scripts\activate.bat && python -m alembic upgrade head >nul 2>&1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload || pause"

echo   [+] Khởi động JapWrite Web (:5173)...
start "JapWrite - Web (Port 5173)" /D "%WRITE_DIR%\apps\web" cmd /c "title JapWrite Web (5173) && color 0B && npm run dev || pause"

echo [OK] Đã kích hoạt JapWrite thành công!
exit /b 0

REM ============================================================
REM CHUYỂN SANG JAPSPEAK (:3000 / :8000)
REM ============================================================
:SWITCH_TO_SPEAK
echo ======================================================================
echo   [JapStudio] Đang chuyển chế độ sang JapSpeak...
echo   - Tắt sạch tab và tiến trình khác để giải phóng RAM ^& CPU
echo   - Khởi động JapSpeak (Next.js :3000 + FastAPI :8000)
echo ======================================================================

powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*' -or $_.CommandLine -like '*multiprocessing*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
ping -n 2 127.0.0.1 >nul

powershell -NoProfile -Command "$openCons = @(Get-Process OpenConsole -ErrorAction SilentlyContinue); if ($openCons.Count -gt 0) { $all = Get-CimInstance Win32_Process; $openCons | ForEach-Object { $id = $_.Id; $c = $all | Where-Object { $_.ParentProcessId -eq $id }; if ($null -eq $c -or $c.Count -eq 0) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } }"

echo   [+] Khởi động JapSpeak API (:8000)...
start "JapSpeak - Backend (Port 8000)" /D "%SPEAK_DIR%\apps\api" cmd /c "title JapSpeak API (8000) && color 0C && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload || pause"

echo   [+] Khởi động JapSpeak Web (:3000)...
start "JapSpeak - Web Hub (Port 3000)" /D "%SPEAK_DIR%\apps\web" cmd /c "title JapSpeak Web (3000) && color 0E && npm run dev || pause"

echo [OK] Đã kích hoạt JapSpeak thành công!
exit /b 0

REM ============================================================
REM CHUYỂN SANG JAPIMMERSION (:3002 / :8002)
REM ============================================================
:SWITCH_TO_IMMERSION
echo ======================================================================
echo   [JapStudio] Đang chuyển chế độ sang JapImmersion (Module 3)...
echo   - Tắt sạch tab và tiến trình khác để giải phóng RAM ^& CPU
echo   - Khởi động JapImmersion (Next.js :3002 + FastAPI :8002)
echo ======================================================================

powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*' -or $_.CommandLine -like '*multiprocessing*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
ping -n 2 127.0.0.1 >nul

powershell -NoProfile -Command "$openCons = @(Get-Process OpenConsole -ErrorAction SilentlyContinue); if ($openCons.Count -gt 0) { $all = Get-CimInstance Win32_Process; $openCons | ForEach-Object { $id = $_.Id; $c = $all | Where-Object { $_.ParentProcessId -eq $id }; if ($null -eq $c -or $c.Count -eq 0) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } }"

echo   [+] Khởi động JapImmersion API (:8002)...
start "JapImmersion - Backend (Port 8002)" /D "%IMMERSION_DIR%\apps\api" cmd /c "title JapImmersion API (8002) && color 0D && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload || pause"

echo   [+] Khởi động JapImmersion Web (:3002)...
start "JapImmersion - Web (Port 3002)" /D "%IMMERSION_DIR%\apps\web" cmd /c "title JapImmersion Web (3002) && color 0A && npm run dev || pause"

echo [OK] Đã kích hoạt JapImmersion thành công!
exit /b 0
