@echo off
chcp 65001 >nul
cd /d "%~dp0.."
cd gas-outburst-api
"C:\Users\hty\anaconda3\envs\lymenv\python.exe" -m uvicorn api:app --host 0.0.0.0 --port 8001