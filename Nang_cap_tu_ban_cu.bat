@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Cai Node.js 24 LTS truoc khi nang cap.
 pause
 exit /b 1
)
node scripts/upgrade-local.mjs
if errorlevel 1 (
 echo Chua sao chep duoc. Ban cu van duoc giu nguyen.
 pause
 exit /b 1
)
call Cai_dat_lan_dau.bat
