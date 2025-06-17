
export const windowsScript = `@echo off
REM JERICHO Security System - Windows Installation Script
REM Updated with latest configuration and fixes

echo ========================================
echo JERICHO Security System - Windows Setup
echo ========================================

REM Check for administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Administrator privileges required
    echo Please run this script as Administrator
    pause
    exit /b 1
)

REM Check for required software
echo 🔍 Checking prerequisites...

where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js not found
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

where git >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Git not found
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Create installation directory
set INSTALL_DIR=C:\\jericho-security
echo 📁 Creating installation directory: %INSTALL_DIR%
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%"
cd /d "%INSTALL_DIR%"

REM Download from GitHub
echo ⬇️ Downloading JERICHO Security System...
set REPO_URL=https://github.com/AbdurahmanZA/jericho-security-ad958edc.git

git clone "%REPO_URL%" .
if errorlevel 1 (
    echo ❌ Failed to clone repository. Please ensure:
    echo 1. Git is installed and configured
    echo 2. You have access to the repository
    echo 3. Git credentials are set up if repository is private
    pause
    exit /b 1
)

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Build frontend
echo 🏗️ Building frontend application...
npm run build
if errorlevel 1 (
    echo ❌ Failed to build frontend application
    pause
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
npm install
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

REM Create Windows service script for backend
echo ⚙️ Creating backend service script...
echo @echo off > start-backend.bat
echo title JERICHO Security Backend >> start-backend.bat
echo cd /d "%INSTALL_DIR%\\backend" >> start-backend.bat
echo echo Starting JERICHO Security Backend... >> start-backend.bat
echo node server.js >> start-backend.bat
echo pause >> start-backend.bat

REM Configure IIS (if available)
echo 🔧 Configuring web server...

REM Check if IIS is available
sc query W3SVC >nul 2>&1
if %errorLevel% equ 0 (
    echo 🌐 Configuring IIS...
    
    REM Stop IIS
    iisreset /stop
    
    REM Clean wwwroot
    if exist "C:\\inetpub\\wwwroot" (
        del /q "C:\\inetpub\\wwwroot\\*.*" 2>nul
        for /d %%i in ("C:\\inetpub\\wwwroot\\*") do rmdir /s /q "%%i" 2>nul
    )
    
    REM Copy built files
    xcopy /s /y /i "dist\\*" "C:\\inetpub\\wwwroot\\"
    
    REM Create web.config for SPA and proxy
    echo ^<?xml version="1.0" encoding="utf-8"?^> > "C:\\inetpub\\wwwroot\\web.config"
    echo ^<configuration^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo   ^<system.webServer^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^<rewrite^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^<rules^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<rule name="WebSocket" stopProcessing="true"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<match url="^api/ws" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<action type="Rewrite" url="http://localhost:3001/{R:0}" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^</rule^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<rule name="API" stopProcessing="true"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<match url="^api/(.*)" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<action type="Rewrite" url="http://localhost:3001/api/{R:1}" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^</rule^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<rule name="Assets" stopProcessing="true"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<match url="^assets/(.*)" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<action type="None" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^</rule^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<rule name="HLS" stopProcessing="true"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<match url="^hls/(.*)" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<action type="None" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^</rule^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<rule name="SPA" stopProcessing="true"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<match url=".*" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<conditions logicalGrouping="MatchAll"^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo             ^<add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo             ^<add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^</conditions^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo           ^<action type="Rewrite" url="/index.html" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^</rule^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^</rules^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^</rewrite^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^<staticContent^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^<mimeMap fileExtension=".m3u8" mimeType="application/vnd.apple.mpegurl" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^<mimeMap fileExtension=".ts" mimeType="video/mp2t" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^</staticContent^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^<httpProtocol^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^<customHeaders^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<add name="Access-Control-Allow-Origin" value="*" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<add name="Access-Control-Allow-Methods" value="GET, POST, OPTIONS" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo         ^<add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" /^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo       ^</customHeaders^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo     ^</httpProtocol^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo   ^</system.webServer^> >> "C:\\inetpub\\wwwroot\\web.config"
    echo ^</configuration^> >> "C:\\inetpub\\wwwroot\\web.config"
    
    REM Create directories for media
    mkdir "C:\\inetpub\\wwwroot\\hls" 2>nul
    mkdir "C:\\inetpub\\wwwroot\\snapshots" 2>nul
    
    REM Start IIS
    iisreset /start
    
    echo ✅ IIS configured successfully
) else (
    echo ⚠️ IIS not available, using development server
    
    REM Create simple HTTP server script
    echo @echo off > start-frontend.bat
    echo title JERICHO Security Frontend >> start-frontend.bat
    echo cd /d "%INSTALL_DIR%" >> start-frontend.bat
    echo echo Starting JERICHO Security Frontend... >> start-frontend.bat
    echo echo Frontend will be available at http://localhost:3000 >> start-frontend.bat
    echo npx serve -s dist -l 3000 >> start-frontend.bat
    echo pause >> start-frontend.bat
)

REM Create startup scripts
echo 📝 Creating startup scripts...

echo @echo off > start-jericho.bat
echo title JERICHO Security System >> start-jericho.bat
echo echo ======================================== >> start-jericho.bat
echo echo JERICHO Security System - Windows >> start-jericho.bat
echo echo ======================================== >> start-jericho.bat
echo echo. >> start-jericho.bat
echo echo Starting backend server... >> start-jericho.bat
echo start "JERICHO Backend" /d "%INSTALL_DIR%" start-backend.bat >> start-jericho.bat
echo echo. >> start-jericho.bat
echo echo Waiting for backend to start... >> start-jericho.bat
echo timeout /t 5 /nobreak >> start-jericho.bat

REM Add frontend start if not using IIS
sc query W3SVC >nul 2>&1
if %errorLevel% neq 0 (
    echo echo Starting frontend server... >> start-jericho.bat
    echo start "JERICHO Frontend" /d "%INSTALL_DIR%" start-frontend.bat >> start-jericho.bat
    echo echo. >> start-jericho.bat
    echo echo Frontend: http://localhost:3000 >> start-jericho.bat
)

echo echo Backend API: http://localhost:3001/api/status >> start-jericho.bat
echo echo. >> start-jericho.bat
echo echo System is starting... >> start-jericho.bat
echo echo Press any key to open web interface... >> start-jericho.bat
echo pause ^>nul >> start-jericho.bat

REM Add browser opening based on web server type
sc query W3SVC >nul 2>&1
if %errorLevel% equ 0 (
    echo start http://localhost >> start-jericho.bat
) else (
    echo start http://localhost:3000 >> start-jericho.bat
)

REM Create stop script
echo @echo off > stop-jericho.bat
echo title Stopping JERICHO Security System >> stop-jericho.bat
echo echo Stopping JERICHO Security System... >> stop-jericho.bat
echo taskkill /f /im node.exe 2^>nul >> stop-jericho.bat
echo echo Backend stopped. >> stop-jericho.bat
echo pause >> stop-jericho.bat

REM Create Windows Firewall rules
echo 🔥 Configuring Windows Firewall...
netsh advfirewall firewall add rule name="JERICHO Backend" dir=in action=allow protocol=TCP localport=3001 2>nul
netsh advfirewall firewall add rule name="JERICHO Frontend" dir=in action=allow protocol=TCP localport=3000 2>nul
netsh advfirewall firewall add rule name="JERICHO HTTP" dir=in action=allow protocol=TCP localport=80 2>nul

REM Create desktop shortcuts
echo 🖥️ Creating desktop shortcuts...
set DESKTOP=%USERPROFILE%\\Desktop

echo [InternetShortcut] > "%DESKTOP%\\JERICHO Security.url"
sc query W3SVC >nul 2>&1
if %errorLevel% equ 0 (
    echo URL=http://localhost >> "%DESKTOP%\\JERICHO Security.url"
) else (
    echo URL=http://localhost:3000 >> "%DESKTOP%\\JERICHO Security.url"
)

REM Test installation
echo 🧪 Testing installation...
cd backend
echo Testing backend startup...
start /b node server.js
timeout /t 3 /nobreak >nul

REM Check if backend responds
curl -f http://localhost:3001/api/status >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Backend test successful
) else (
    echo ⚠️ Backend may need troubleshooting
)

REM Stop test backend
taskkill /f /im node.exe 2>nul

echo ========================================
echo ✅ JERICHO Security System Installed!
echo ========================================
echo.
echo 📁 Installation: %INSTALL_DIR%
sc query W3SVC >nul 2>&1
if %errorLevel% equ 0 (
    echo 🌐 Frontend: http://localhost ^(IIS^)
) else (
    echo 🌐 Frontend: http://localhost:3000 ^(Development^)
)
echo 🔧 Backend API: http://localhost:3001/api/status
echo.
echo 🚀 To start the system:
echo    Double-click: start-jericho.bat
echo    Or run from: %INSTALL_DIR%\\start-jericho.bat
echo.
echo 🛑 To stop the system:
echo    Double-click: stop-jericho.bat
echo    Or press Ctrl+C in the console windows
echo.
echo 🎯 Next Steps:
echo 1. Run start-jericho.bat to start the system
echo 2. Access the web interface
echo 3. Add your camera RTSP URLs
echo 4. Configure settings as needed
echo.
echo 🔧 Troubleshooting:
echo • Check Windows Firewall if access issues occur
echo • Ensure ports 80, 3000, and 3001 are available
echo • Check backend logs in the console window
echo • Verify Node.js and Git installations
echo.
echo ⚠️ Important Notes:
echo • Backend runs in a console window - do not close it
echo • Frontend served via IIS or development server
echo • WebSocket connections use ws:// protocol internally
echo • Add firewall exceptions if prompted
echo ========================================
echo.
pause
`;
