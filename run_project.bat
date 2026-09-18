@echo off
echo Starting Varuna Netra Project...

echo [1/3] Starting MongoDB...
start "Varuna Netra - MongoDB" /B "D:\XYZ1\mongodb_extracted\mongodb-win32-x86_64-windows-7.0.14\bin\mongod.exe" --dbpath "D:\XYZ1\mongodb_data" --bind_ip 127.0.0.1 --port 27017

timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "Varuna Netra - Backend" /D "D:\XYZ1\26143\backend" "D:\XYZ1\26143\backend\.venv\Scripts\uvicorn.exe" server:app --host 127.0.0.1 --port 8000

echo [3/3] Starting Frontend (React on http://localhost:3000)...
cd /d "D:\XYZ1\26143\frontend"
set PATH=C:\Users\agraw\AppData\Roaming\npm;C:\Users\agraw\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;%PATH%
yarn start
