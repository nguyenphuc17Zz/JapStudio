@echo off
chcp 65001 >nul 2>&1
echo [CLEANUP] Dang don dep zombie ports 8000/8001/3000/5173...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "foreach($p in @(8000,8001,3000,5173)){ $l=netstat -ano | Select-String \":$p\s\"; foreach($line in $l){ if($line -match 'LISTENING\s+(\d+)'){ $id=[int]$Matches[1]; if($id -gt 0){ Write-Host \"Kill netstat PID $id for port $p\"; Stop-Process -Id $id -Force -ErrorAction SilentlyContinue } } } }" ^
  "; Get-NetTCPConnection -LocalPort 8000,8001,3000,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Host \"Kill GetNetTCP PID $($_.OwningProcess)\"; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" ^
  "; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { ($_.Name -in @('python.exe','node.exe','cmd.exe')) -and ($_.CommandLine -like '*modules\speak*' -or $_.CommandLine -like '*modules\write*' -or $_.CommandLine -like '*uvicorn*' -or $_.CommandLine -like '*next*dev*' -or $_.CommandLine -like '*vite*' -or $_.CommandLine -like '*multiprocessing*' -or $_.CommandLine -like '*JapSpeak*' -or $_.CommandLine -like '*JapWrite*') } | ForEach-Object { Write-Host \"Kill CIM $($_.ProcessId) $($_.Name)\"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" ^
  "; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'python.exe' -and $_.CommandLine -like '*spawn_main*' } | ForEach-Object { Write-Host \"Kill spawn $($_.ProcessId)\"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" ^
  "; Start-Sleep -Milliseconds 500; Write-Host \"Done. Remaining ports:\"; netstat -ano | Select-String \":8000|:8001|:3000|:5173\""

echo.
echo [OK] Da don dep. Hay dong cua so nay va mo lai JapStudio.bat
pause
