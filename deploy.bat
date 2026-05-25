@echo off
setlocal

set VPS=root@159.195.65.208
set PUBLISH_DIR=%~dp0publish

echo [1/4] Building frontend...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/4] Publishing backend...
cd /d "%~dp0backend"
dotnet publish FlightPlanner.Api -c Release -o "%PUBLISH_DIR%"
if errorlevel 1 ( echo Backend publish failed & exit /b 1 )

echo [3/4] Copying frontend dist...
if not exist "%PUBLISH_DIR%\frontend" mkdir "%PUBLISH_DIR%\frontend"
xcopy /E /I /Y "%~dp0frontend\dist" "%PUBLISH_DIR%\frontend\dist"

echo [4/4] Transferring to VPS and restarting service...
scp -r "%PUBLISH_DIR%\*" %VPS%:/opt/flightplanner/
ssh %VPS% "systemctl restart flightplanner && systemctl status flightplanner --no-pager"

echo.
echo Deploy complete.
endlocal
