@echo off
echo ========================================
echo  瓦斯突出预警系统 - 后端API服务启动脚本
echo ========================================
echo.
echo 正在检查Python环境...
python --version
if %errorlevel% neq 0 (
    echo 错误：未安装Python，请先安装Python 3.10+
    pause
    exit /b 1
)
echo.
echo 正在检查依赖包...
python -c "import fastapi; print('FastAPI: OK')" 2>nul || (
    echo 正在安装依赖包...
    pip install -r requirements.txt
)
echo.
echo 启动API服务...
echo 服务地址: http://localhost:8000
echo Swagger文档: http://localhost:8000/docs
echo.
python api.py
