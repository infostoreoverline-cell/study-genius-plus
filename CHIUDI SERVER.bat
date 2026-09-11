@echo off
setlocal EnableExtensions

REM Ferma solo i processi riconosciuti come StudyGenius+ sulle porte riservate.
REM Non usa "taskkill /IM node.exe": gli altri programmi Node restano intatti.

cd /d "%~dp0"
title StudyGenius+ - Chiusura locale
echo.
echo  ==============================================
echo   StudyGenius+ - chiusura locale
echo  ==============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(3000, 5173); $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }; $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $processIds) { Write-Host 'Nessun processo StudyGenius+ in esecuzione.'; exit 0 }; $stopped = 0; foreach ($targetId in $processIds) { try { $processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $targetId) -ErrorAction Stop; $isStudyGenius = $processInfo.Name -match '^node(\.exe)?$' -and $processInfo.CommandLine -match 'apps[\\/]+server[\\/]+src[\\/]+index\.ts|node_modules[\\/]+vite[\\/]bin[\\/]+vite\.js'; if (-not $isStudyGenius) { Write-Warning ('Non arrestato: PID ' + $targetId + ' sulla porta/e ' + (($connections | Where-Object { $_.OwningProcess -eq $targetId } | ForEach-Object LocalPort) -join ', ') + ' non e riconosciuto come StudyGenius+.'); continue }; $process = Get-Process -Id $targetId -ErrorAction Stop; Write-Host ('Arresto: ' + $process.ProcessName + ' (PID ' + $targetId + ', porta/e ' + (($connections | Where-Object { $_.OwningProcess -eq $targetId } | ForEach-Object LocalPort) -join ', ') + ')'); Stop-Process -Id $targetId -Force -ErrorAction Stop; $stopped++ } catch { Write-Warning ('Impossibile arrestare il PID ' + $targetId + ': ' + $_.Exception.Message) } }; if ($stopped -eq 0) { Write-Host 'Nessun processo StudyGenius+ riconosciuto da arrestare.' }; exit 0"

echo.
echo Chiusura completata.
timeout /t 2 /nobreak >nul
exit /b 0
