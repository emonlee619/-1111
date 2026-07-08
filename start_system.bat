@echo off
chcp 65001 >nul

set "BASE_DIR=%~dp0"

echo ========================================
echo  GAS OUTBURST WARNING SYSTEM
echo ========================================
echo.

echo Step 1: Stop existing processes...
for %%p in (3000 8001) do (
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p.*LISTENING"') do (
        echo   Kill port %%p PID: %%i
        taskkill /F /PID %%i >nul 2>&1
    )
)

echo.
echo Step 2: Start Outburst Model API (port 8001)...
start "OB_API" cmd /k "%BASE_DIR%scripts\start_outburst.bat"

echo Step 3: Start Frontend (port 3000)...
start "FRONTEND" cmd /k "%BASE_DIR%scripts\start_frontend.bat"

echo.
echo Wait for services to start...
timeout /t 15 /nobreak >nul

echo Step 4: Open browser...
start http://localhost:3000

echo.
echo ========================================
echo  START COMPLETE!
echo ========================================
echo  Outburst API: http://localhost:8001
echo  Frontend: http://localhost:3000
echo ========================================

pause