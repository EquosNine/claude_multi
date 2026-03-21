@echo off
title claude-multi server
cd /d "%~dp0"

echo Killing any existing server on port 3456...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3456 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

echo Building frontend...
call "%USERPROFILE%\.bun\bin\bun.exe" run build

echo Starting claude-multi at http://localhost:3456
start http://localhost:3456

:loop
"%USERPROFILE%\.bun\bin\bun.exe" run server.ts
echo.
echo Server exited. Restarting in 2 seconds... (Ctrl+C to quit)
timeout /t 2 /nobreak >nul
goto loop
