@echo off
chcp 65001 >nul
cd /d D:\AAA大学\竞赛\安全年会\程序\前端\gas-outburst-frontend-worktree\gas-outburst-api
start "瓦斯突出预警系统 - 后端API" cmd /c "call start_server.bat"
cd /d D:\AAA大学\竞赛\安全年会\程序\前端\gas-outburst-frontend-worktree\frontend
start "瓦斯突出预警系统 - 前端" cmd /c "npm run dev"
echo.
echo  后端 API: http://localhost:8000
echo  前端页面: http://localhost:3000
echo Swagger 文档: http://localhost:8000/docs
echo.
echo  提示：启动后可在任务管理器关闭后端 (python.exe) 和前端 (node.exe)
echo.
pause
