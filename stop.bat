@echo off
chcp 65001 >nul 2>&1
title JapStudio - Dừng tất cả dịch vụ

echo ======================================================================
echo            JAPSTUDIO — DỪNG TẤT CẢ DỊCH VỤ ĐANG CHẠY
echo ======================================================================
echo.

echo [1/3] Đang đóng sạch các tab terminal và tiến trình của JapSpeak, JapWrite và JapImmersion...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*JapWrite*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*' -or $_.CommandLine -like '*multiprocessing*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo [2/3] Đang giải phóng các cổng mạng (8000, 8001, 8002, 3000, 3002, 5173)...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 8001, 8002, 3000, 3002, 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8001 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3000 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":5173 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )

echo [3/3] Đang đóng dứt điểm các tab Windows Terminal mồ côi...
powershell -NoProfile -Command "$openCons = @(Get-Process OpenConsole -ErrorAction SilentlyContinue); if ($openCons.Count -gt 0) { $all = Get-CimInstance Win32_Process; $openCons | ForEach-Object { $id = $_.Id; $c = $all | Where-Object { $_.ParentProcessId -eq $id }; if ($null -eq $c -or $c.Count -eq 0) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } }"

echo.
echo [OK] Toàn bộ dịch vụ và tab terminal JapStudio đã được tắt an toàn!
echo.
ping -n 2 127.0.0.1 >nul
