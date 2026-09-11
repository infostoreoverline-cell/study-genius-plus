@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM StudyGenius+ -- avvio locale con un doppio clic.
REM Questa procedura non pubblica l'applicazione su Internet: PDF, dati e chiavi
REM API restano sul PC, all'indirizzo http://127.0.0.1:5173.

cd /d "%~dp0"
set "APP_URL=http://127.0.0.1:5173"
set "API_PORT=3000"
set "WEB_PORT=5173"
set "DATA_DIR=%CD%\.study-genius"
set "NODE_STAMP=%DATA_DIR%\node-version.txt"

title StudyGenius+ - Avvio locale
echo.
echo  ==============================================
echo   StudyGenius+ - avvio locale
echo  ==============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRORE] Node.js 22 LTS non e installato o non e nel PATH.
  echo Installa Node.js 22 LTS, poi chiudi e riapri questa finestra.
  echo https://nodejs.org/en/download
  goto :failed
)

for /f "usebackq delims=" %%V in (`node -p "process.versions.node"`) do set "NODE_VERSION=%%V"
for /f "tokens=1 delims=." %%V in ("%NODE_VERSION%") do set "NODE_MAJOR=%%V"
if not "%NODE_MAJOR%"=="22" (
  echo [ERRORE] StudyGenius+ richiede Node.js 22 LTS. Versione rilevata: v%NODE_VERSION%.
  echo Disinstalla o disattiva Node.js 24 e installa Node.js 22 LTS da:
  echo https://nodejs.org/en/download
  goto :failed
)

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" >nul 2>&1

REM Installazione alla prima esecuzione e dopo un cambio di versione Node.
REM Cosi un node_modules lasciato a meta da Node 24 non viene riutilizzato con
REM Node 22, situazione che causerebbe l'errore di better-sqlite3.
set "NEEDS_INSTALL=0"
if not exist "node_modules\.bin\tsx.cmd" set "NEEDS_INSTALL=1"
if not exist "%NODE_STAMP%" set "NEEDS_INSTALL=1"
if exist "%NODE_STAMP%" (
  set /p "INSTALLED_NODE_VERSION=" < "%NODE_STAMP%"
  if not "!INSTALLED_NODE_VERSION!"=="%NODE_VERSION%" set "NEEDS_INSTALL=1"
)

if "%NEEDS_INSTALL%"=="1" (
  echo [1/4] Installazione delle dipendenze per Node.js %NODE_VERSION%...
  call npm ci
  if errorlevel 1 (
    echo.
    echo [ERRORE] L'installazione non e riuscita.
    echo Leggi il messaggio qui sopra; per better-sqlite3 usa Node.js 22 LTS.
    goto :failed
  )
  > "%NODE_STAMP%" echo %NODE_VERSION%
)

REM Se l'interfaccia e gia pronta, non avviamo una seconda copia.
call :isReady
if not errorlevel 1 (
  echo StudyGenius+ e gia in esecuzione: apro il browser.
  start "" "%APP_URL%"
  exit /b 0
)

call :isPortBusy %API_PORT%
if not errorlevel 1 (
  echo [ERRORE] La porta %API_PORT% e gia occupata.
  echo Se appartiene a StudyGenius+, esegui prima "CHIUDI SERVER.bat".
  echo Altrimenti chiudi il programma che sta usando quella porta.
  goto :failed
)

call :isPortBusy %WEB_PORT%
if not errorlevel 1 (
  echo [ERRORE] La porta %WEB_PORT% e gia occupata.
  echo Se appartiene a StudyGenius+, esegui prima "CHIUDI SERVER.bat".
  echo Altrimenti chiudi il programma che sta usando quella porta.
  goto :failed
)

echo [2/4] Avvio del server locale...
start "StudyGenius+ API" /min cmd /d /c "cd /d ""%CD%"" ^&^& npm run dev:server ^> ""%DATA_DIR%\server.log"" 2^>^&1"

echo [3/4] Avvio dell'interfaccia...
start "StudyGenius+ Web" /min cmd /d /c "cd /d ""%CD%"" ^&^& npm run dev:web ^> ""%DATA_DIR%\web.log"" 2^>^&1"

echo [4/4] Attendo che l'interfaccia sia pronta...
for /l %%I in (1,1,30) do (
  call :isReady
  if not errorlevel 1 goto :ready
  timeout /t 1 /nobreak >nul
)

echo.
echo [ERRORE] StudyGenius+ non ha risposto entro 30 secondi.
echo Apri questi file per vedere il motivo:
echo   %DATA_DIR%\server.log
echo   %DATA_DIR%\web.log
echo Poi esegui "CHIUDI SERVER.bat" prima di riprovare.
goto :failed

:ready
echo.
echo StudyGenius+ e pronto. Apro %APP_URL%
start "" "%APP_URL%"
exit /b 0

:isReady
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 1; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) { exit 0 } } catch {}; exit 1" >nul 2>&1
exit /b %errorlevel%

:isPortBusy
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = [int]$args[0]; if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1) { exit 0 }; exit 1" %1 >nul 2>&1
exit /b %errorlevel%

:failed
echo.
pause
exit /b 1
