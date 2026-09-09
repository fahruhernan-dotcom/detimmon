@echo off
title DIGNITI ADMIN COMMAND CENTER
color 0B

echo ==============================================================================
echo   MEMULAI DIGNITI ADMIN COMMAND CENTER...
echo   LPK Indonesia Digniti in Collaboration with KLTC
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/2] Menjalankan server lokal (npm run dev)...
start "" http://localhost:8080
npm run dev

pause
