@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Chua co Node.js. Cai Node.js 24 LTS tu https://nodejs.org/ roi chay lai.
 pause
 exit /b 1
)
echo TOAN THD v0.14 - CAI DAT LAN DAU
echo Can Internet de tai thu vien. Khong dong cua so khi dang cai.
call npm run install:ci
if errorlevel 1 goto :fail
node scripts/setup-local.mjs
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 goto :fail
echo.
echo DA HOAN TAT. Lan sau chi can chay Chay_web.bat.
echo Mat khau giao vien mau: toanthd-demo
pause
exit /b 0
:fail
echo.
echo CHUA CAI XONG. Giu nguyen cua so va gui noi dung loi de kiem tra.
pause
exit /b 1
