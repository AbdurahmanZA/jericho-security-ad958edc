
export const windowsScript = `@echo off
REM JERICHO Security System - Windows Installation
echo Installing JERICHO Security System...

REM Create temporary directory
set TEMP_DIR=%TEMP%\\jericho-install-%RANDOM%
mkdir "%TEMP_DIR%"
cd /d "%TEMP_DIR%"

REM Download and extract from GitHub
echo Downloading JERICHO Security System...
set REPO_URL=https://github.com/AbdurahmanZA/jericho-security-ad958edc.git

git clone %REPO_URL% jericho-security-system
if errorlevel 1 (
    echo Failed to clone repository. Please ensure:
    echo 1. Git is installed and configured
    echo 2. You have access to the repository
    echo 3. Git credentials are set up if repository is private
    pause
    exit /b 1
)

cd jericho-security-system

REM Install dependencies and build
echo Installing dependencies...
npm install
if errorlevel 1 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo Building application...
npm run build
if errorlevel 1 (
    echo Failed to build application
    pause
    exit /b 1
)

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
echo.
echo If you encountered authentication issues:
echo - Configure Git credentials or use personal access tokens
echo - Ensure repository access permissions are correct`;
