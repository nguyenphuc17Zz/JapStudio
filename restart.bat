@echo off
chcp 65001 >nul 2>&1
title JapStudio - Khởi động lại dịch vụ

echo [JapStudio] Đang dừng dịch vụ cũ...
call "%~dp0stop.bat"
echo.
echo [JapStudio] Đang khởi động lại hệ thống...
call "%~dp0start.bat" all
