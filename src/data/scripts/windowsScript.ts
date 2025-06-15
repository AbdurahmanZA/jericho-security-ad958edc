
export const windowsScript = `@echo off
REM JERICHO Security System - Windows Installation
echo Installing JERICHO Security System...

REM Create temporary directory
set TEMP_DIR=%TEMP%\\jericho-install-%RANDOM%
mkdir "%TEMP_DIR%"
cd /d "%TEMP_DIR%"

REM Download and extract from GitHub
echo Downloading JERICHO Security System...
REM Replace with your actual GitHub repository URL
set REPO_URL=https://github.com/YOUR_USERNAME/jericho-security-system
git clone %REPO_URL%.git jericho-security-system

cd jericho-security-system

REM Install dependencies and build
echo Building application...
npm install
npm run build

REM Stop IIS
iisreset /stop

REM Clean and deploy
rmdir /s /q "C:\\inetpub\\wwwroot" 2>nul
mkdir "C:\\inetpub\\wwwroot"

REM Copy built files
xcopy /s /y "dist\\*" "C:\\inetpub\\wwwroot\\"

REM Start IIS
iisreset /start

REM Cleanup
cd /d "%TEMP%"
rmdir /s /q "%TEMP_DIR%"

echo Installation complete! Access at http://localhost
echo NOTE: Update the REPO_URL variable in this script with your actual GitHub repository URL`;
