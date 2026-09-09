@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Japanese Writing Studio - Stop Servers

echo ===============================================================================
echo                 DANG DUNG CAC TIEN TRINH HE THONG
echo ===============================================================================
echo.

set "FOUND_PORT="

echo Dang dong sach cac tab terminal JapWrite...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'cmd.exe'\" | Where-Object { $_.CommandLine -like '*JapWrite*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Dang kiem tra Port 8001 (Backend FastAPI)...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   [x] Da dung process Backend (PID: %%a) tren Port 8001
    set "FOUND_PORT=1"
)

echo Dang kiem tra Port 5173 / 5174 (Frontend Vite)...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   [x] Da dung process Frontend (PID: %%a) tren Port 5173
    set "FOUND_PORT=1"
)
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5174 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo   [x] Da dung process Frontend (PID: %%a) tren Port 5174
    set "FOUND_PORT=1"
)

if not defined FOUND_PORT (
    echo   [INFO] Khong co tien trinh nao dang chiem Port 8001 hoac 5173.
)

echo.
echo ===============================================================================
echo   [OK] Toan bo may chu Backend va Frontend da duoc dung thanh cong!
echo ===============================================================================
echo.
pause
exit /b 0
