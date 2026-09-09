@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title JapImmersion - Source Manager

set "MODULE_DIR=%~dp0"
if "%MODULE_DIR:~-1%"=="\" set "MODULE_DIR=%MODULE_DIR:~0,-1%"

echo ======================================================================
echo          JAPIMMERSION — JAPANESE CONTENT INGESTION ENGINE
echo ======================================================================
echo.

echo [1/3] Giai phong cong 8002 va 3002...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
ping -n 2 127.0.0.1 >nul

echo [2/3] Khoi dong Immersion Backend (FastAPI :8002)...
start "JapImmersion - Backend (Port 8002)" /D "%MODULE_DIR%\apps\api" cmd /c "title JapImmersion API (8002) && color 0D && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload || pause"

echo [3/3] Khoi dong Immersion Web (Next.js :3002)...
start "JapImmersion - Web (Port 3002)" /D "%MODULE_DIR%\apps\web" cmd /c "title JapImmersion Web (3002) && color 0A && npm run dev || pause"

ping -n 4 127.0.0.1 >nul
start http://localhost:3002/sources

echo.
echo [OK] JapImmersion da khoi dong thanh cong!
echo - Web Dashboard: http://localhost:3002/sources
echo - API Docs:      http://localhost:8002/docs
echo.
exit /b 0
