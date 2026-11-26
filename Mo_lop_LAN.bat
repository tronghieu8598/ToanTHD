@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can cai Node.js 24 LTS.
 pause
 exit /b 1
)
echo TOAN THD v0.6 - LAN
echo Giu cua so nay mo. Dung bang Ctrl+C.
node scripts/run-local.mjs --lan
if errorlevel 1 pause
