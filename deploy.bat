@echo off
setlocal

set VPS=root@159.195.65.208
set PUBLISH_DIR=%~dp0publish

echo [1/5] Building frontend...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/5] Publishing backend...
cd /d "%~dp0backend"
dotnet publish FlightPlanner.Api -c Release -o "%PUBLISH_DIR%"
if errorlevel 1 ( echo Backend publish failed & exit /b 1 )

echo [3/5] Copying procedure database...
if not exist "%PUBLISH_DIR%\NavData" mkdir "%PUBLISH_DIR%\NavData"
if exist "%~dp0backend\FlightPlanner.Api\bin\Debug\net10.0\NavData\procedures.sqlite" (
    copy /Y "%~dp0backend\FlightPlanner.Api\bin\Debug\net10.0\NavData\procedures.sqlite" "%PUBLISH_DIR%\NavData\procedures.sqlite"
    echo   procedures.sqlite copied from Debug build.
) else if exist "%~dp0backend\FlightPlanner.Api\bin\Release\net10.0\NavData\procedures.sqlite" (
    copy /Y "%~dp0backend\FlightPlanner.Api\bin\Release\net10.0\NavData\procedures.sqlite" "%PUBLISH_DIR%\NavData\procedures.sqlite"
    echo   procedures.sqlite copied from Release build.
) else (
    echo   WARNING: procedures.sqlite not found. SIDs/STARs will return 503.
    echo   Run first: dotnet run --project backend\FlightPlanner.Api -- import-cifp "^<cifp-dir^>" "^<navdata-dir^>"
)

echo [4/5] Copying frontend dist...
if not exist "%PUBLISH_DIR%\frontend" mkdir "%PUBLISH_DIR%\frontend"
xcopy /E /I /Y "%~dp0frontend\dist" "%PUBLISH_DIR%\frontend\dist"

echo [5/5] Transferring to VPS and restarting service...
scp -r "%PUBLISH_DIR%\*" %VPS%:/opt/flightplanner/
ssh %VPS% "systemctl restart flightplanner && systemctl status flightplanner --no-pager"

echo.
echo Deploy complete.
endlocal
