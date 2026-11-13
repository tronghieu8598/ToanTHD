@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Chua co Node.js. Chay Cai_dat_lan_dau.bat truoc.
 pause
 exit /b 1
)
node scripts/run-local.mjs
if errorlevel 1 (
 echo Chua mo duoc web. Xem thong bao o tren.
 pause
 exit /b 1
)
