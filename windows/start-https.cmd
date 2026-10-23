@echo off
setlocal

set "SCRIPT=%~dp0start-https.ps1"

if not exist "%SCRIPT%" (
    echo The HTTPS PowerShell script was not found.
    pause
    exit /b 1
)

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%SCRIPT%"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo HTTPS stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%