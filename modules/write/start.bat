@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Japanese Writing Studio - Khoi dong he thong

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo ===============================================================================
echo                 JAPANESE WRITING STUDIO - DANG KHOI DONG
echo ===============================================================================
echo.

:: 1. Kiem tra moi truong
echo [1/4] Kiem tra moi truong va cau hinh...

if not exist "%PROJECT_DIR%\apps\api\.venv\Scripts\activate.bat" (
    if not exist "%PROJECT_DIR%\apps\api\venv\Scripts\activate.bat" (
        echo   [LOI] Khong tim thay moi truong ao Python tai apps/api/.venv.
        pause
        exit /b 1
    )
)

where npm >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo   [LOI] Khong tim thay Node.js / NPM trong PATH! Vui long cai dat Node.js.
    pause
    exit /b 1
)

:: Tao file .env neu chua co
if not exist "%PROJECT_DIR%\apps\api\.env" (
    if exist "%PROJECT_DIR%\apps\api\.env.example" (
        copy "%PROJECT_DIR%\apps\api\.env.example" "%PROJECT_DIR%\apps\api\.env" >nul
        echo   [INFO] Da tao apps/api/.env tu .env.example
    )
)
if not exist "%PROJECT_DIR%\apps\web\.env" (
    if exist "%PROJECT_DIR%\apps\web\.env.example" (
        copy "%PROJECT_DIR%\apps\web\.env.example" "%PROJECT_DIR%\apps\web\.env" >nul
        echo   [INFO] Da tao apps/web/.env tu .env.example
    )
)

if not exist "%PROJECT_DIR%\apps\web\node_modules" (
    echo   [WARN] Chua tim thay apps/web/node_modules, dang tien hanh npm install...
    cd /d "%PROJECT_DIR%\apps\web"
    call npm install
)

:: 2. Giai phong Port cu & Chay Migration CSDL
echo [2/4] Giai phong cong va cap nhat Database...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5174 .*LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

cd /d "%PROJECT_DIR%\apps\api"
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)
python -m alembic upgrade head >nul 2>&1

:: 3. Khoi dong Backend va Frontend
echo [3/4] Khoi dong Backend (FastAPI :8001) va Frontend (Vite :5173)...

:: Bat Backend
if exist "%PROJECT_DIR%\apps\api\.venv\Scripts\activate.bat" (
    start "Japanese Writing - Backend (Port 8001)" /D "%PROJECT_DIR%\apps\api" cmd /c "title Japanese Writing - Backend (Port 8001) && color 0A && echo ====================================================== && echo    DANG CHAY FASTAPI BACKEND TREN PORT 8001 && echo ====================================================== && call .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
) else (
    start "Japanese Writing - Backend (Port 8001)" /D "%PROJECT_DIR%\apps\api" cmd /c "title Japanese Writing - Backend (Port 8001) && color 0A && echo ====================================================== && echo    DANG CHAY FASTAPI BACKEND TREN PORT 8001 && echo ====================================================== && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
)

:: Bat Frontend ngay lap tuc
start "Japanese Writing - Frontend (Port 5173)" /D "%PROJECT_DIR%\apps\web" cmd /c "title Japanese Writing - Frontend (Port 5173) && color 0B && echo ====================================================== && echo    DANG CHAY VITE FRONTEND TREN PORT 5173 && echo ====================================================== && npm run dev"

:: 4. Mo trinh duyet
echo [4/4] Dang mo ung dung tren trinh duyet...
ping -n 4 127.0.0.1 >nul
start http://localhost:5173

echo.
echo ===============================================================================
echo   [OK] HE THONG DA KHOI DONG THANH CONG!
echo   -----------------------------------------------------------------------------
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8001/docs
echo   - De dung he thong, ban co the chay file stop.bat
echo ===============================================================================
echo.
exit /b 0
