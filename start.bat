@echo off
REM Starts the DevFood backend (ASP.NET Core, http://localhost:5143)
REM and frontend (Vite, http://localhost:5173) in separate windows.

setlocal
cd /d "%~dp0"

where dotnet >nul 2>nul || (echo [ERROR] .NET SDK not found. Install .NET 10 SDK. & pause & exit /b 1)
dotnet --list-sdks | findstr /b "10." >nul || (echo [ERROR] .NET 10 SDK not found. Install it from https://dotnet.microsoft.com/download & pause & exit /b 1)
where npm >nul 2>nul || (echo [ERROR] Node.js/npm not found. Install Node.js. & pause & exit /b 1)

REM The API needs ConnectionStrings:Default (PostgreSQL). It is not in appsettings*.json,
REM so it must come from user-secrets or an environment variable.
if not defined ConnectionStrings__Default if not exist "%APPDATA%\Microsoft\UserSecrets\851d7a50-3053-4bef-87f1-cd617a576fd7\secrets.json" (
    echo [WARNING] No database connection string configured. The API will start,
    echo           but any request that touches the database will fail. Set it with:
    echo             cd DevFood.Api
    echo             dotnet user-secrets set "ConnectionStrings:Default" "Host=...;Database=...;Username=...;Password=..."
    echo.
)

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install || (echo [ERROR] npm install failed. & pause & exit /b 1)
)

echo Starting backend on http://localhost:5143 ...
start "DevFood API" cmd /k "cd /d "%~dp0DevFood.Api" && dotnet run --launch-profile http"

echo Starting frontend on http://localhost:5173 ...
start "DevFood Web" cmd /k "cd /d "%~dp0" && npm run dev -- --strictPort"

echo.
echo Both servers are starting in their own windows. Close those windows to stop them.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5143/swagger
endlocal
