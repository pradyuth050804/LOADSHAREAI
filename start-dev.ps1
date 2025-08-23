Write-Host "Starting Loadshare Chatbot Development Server..." -ForegroundColor Green
Write-Host ""

# Set Node.js PATH
$env:PATH += ";C:\Program Files\nodejs"

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "Node.js and npm found successfully! (npm version: $npmVersion)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "The server will be available at: http://localhost:8080/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the development server
npm run dev
