@echo off
setlocal

set "ROOT=%~dp0.."
set "NODE=C:\Program Files\nodejs\node.exe"

if not exist "%NODE%" (
    echo Node.js was not found.
    pause
    exit /b 1
)

if not exist "%ROOT%\private\api.env" (
    echo The private api.env file was not found.
    pause
    exit /b 1
)

"%NODE%" "--env-file=%ROOT%\private\api.env" "%ROOT%\backend\server.mjs"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo API stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%