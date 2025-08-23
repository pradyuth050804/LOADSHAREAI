@echo off
echo Starting Loadshare Chatbot Development Server...
echo.

REM Set Node.js PATH
set PATH=%PATH%;C:\Program Files\nodejs

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js and npm found successfully!
echo Starting development server...
echo.
echo The server will be available at: http://localhost:8080/
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
npm run dev

pause
