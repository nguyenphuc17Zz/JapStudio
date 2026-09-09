@echo off
chcp 65001 >nul 2>&1
title JapImmersion - Dung dich vu

echo [1/2] Dang dong tien trinh tren cong 8002 va 3002...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":8002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr /R /C:":3002 .*LISTENING"') do ( taskkill /F /T /PID %%a >nul 2>&1 )

echo [2/2] Dong tien trinh lien quan...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('cmd.exe','python.exe','node.exe')) -and ($_.CommandLine -like '*JapImmersion*' -or $_.CommandLine -like '*modules\immersion*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo [OK] JapImmersion da dung thanh cong!
ping -n 2 127.0.0.1 >nul
