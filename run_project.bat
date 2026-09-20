@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  Varuna Netra - local launcher (Windows)
echo ==============================================

rem ---- 0) env files (created once from the examples) ----
if not exist backend\.env  copy /y backend\.env.example  backend\.env  >nul
if not exist frontend\.env copy /y frontend\.env.example frontend\.env >nul

rem ---- 1) MongoDB (skip if already running on 27017) ----
netstat -ano | findstr ":27017" >nul
if errorlevel 1 (
  where mongod >nul 2>nul
  if errorlevel 1 (
    echo [!] MongoDB is not running and 'mongod' is not on PATH.
    echo     Install MongoDB Community, or put an Atlas connection string in backend\.env ^(MONGO_URL^).
  ) else (
    echo [1/3] Starting MongoDB...
    if not exist mongodb_data mkdir mongodb_data
    start "Varuna Netra - MongoDB" /B mongod --dbpath "%~dp0mongodb_data" --bind_ip 127.0.0.1 --port 27017
    timeout /t 3 /nobreak >nul
  )
) else (
  echo [1/3] MongoDB already running on 27017.
)

rem ---- 2) Backend ----
echo [2/3] Starting backend on http://127.0.0.1:8000 ...
cd backend
if not exist .venv (
  echo      creating virtualenv and installing requirements ^(first run, a few minutes^)...
  python -m venv .venv
  call .venv\Scripts\python.exe -m pip install --upgrade pip >nul
  call .venv\Scripts\pip.exe install -r requirements.txt
)
start "Varuna Netra - Backend" cmd /k ".venv\Scripts\uvicorn.exe server:app --host 127.0.0.1 --port 8000"
cd ..

rem ---- 3) Frontend ----
echo [3/3] Starting frontend on http://localhost:3000 ...
cd frontend
if not exist node_modules (
  echo      installing packages ^(first run^)...
  call yarn install
)
call yarn start
