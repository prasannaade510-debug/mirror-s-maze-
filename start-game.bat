@echo off
title Mirror Maze Game Server
cd /d "%~dp0pixel-perfect-replica"

echo ========================================================
echo               Launching Mirror Maze...
echo ========================================================
echo.

:: Open the browser after 2 seconds
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"

:: Start the Vite development server
call npm.cmd run dev

pause
