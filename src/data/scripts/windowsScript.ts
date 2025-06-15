
export const windowsScript = `@echo off
REM JERICHO Security System - Windows Installation
echo Installing JERICHO Security System...

REM Install globally from GitHub using npm
npm install -g github:AbdurahmanZA/jericho-security-ad958edc

REM Stop IIS
iisreset /stop

REM Clean and deploy
rmdir /s /q "C:\\inetpub\\wwwroot" 2>nul
mkdir "C:\\inetpub\\wwwroot"

REM Copy from global npm installation
for /f "delims=" %%i in ('npm root -g') do set NPM_PATH=%%i
xcopy /s /y "%NPM_PATH%\\jericho-security-ad958edc\\dist\\*" "C:\\inetpub\\wwwroot\\"

REM Start IIS
iisreset /start

echo Installation complete! Access at http://localhost`;
