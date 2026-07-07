@echo off
chcp 65001 >nul
set LYMENV=C:\Users\hty\anaconda3\envs\lymenv
if exist "%LYMENV%\python.exe" (
    set PYTHON=%LYMENV%\python.exe
) else (
    set PYTHON=python
)
echo ========================================
echo  瓦斯突出预警系统 - 后端API服务启动脚本
echo ========================================
echo.
echo 正在检查Python环境...
%PYTHON% --version
if %errorlevel% neq 0 (
    echo 错误：未安装Python，请先安装Python 3.10+
    pause
    exit /b 1
)
echo.
echo 启动API服务...
echo 服务地址: http://localhost:8000
echo Swagger文档: http://localhost:8000/docs
echo.
%PYTHON% api.py
