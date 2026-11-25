@echo off
setlocal
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0"

if not exist "frontend\dist\index.html" (
  echo Building frontend...
  cd frontend
  call npm.cmd run build
  cd ..
)

echo Starting Bangladesh School Management Platform on http://localhost:5000 ...
start "" "http://localhost:5000"
cd backend
node src/index.js
