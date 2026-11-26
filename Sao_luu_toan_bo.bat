@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can Node.js 24 LTS.
 pause
 exit /b 1
)
node scripts/snapshot-local.mjs
if errorlevel 1 (
 echo CHUA HOAN TAT. Xem thong bao phia tren.
 pause
 exit /b 1
)
pause
