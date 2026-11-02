@echo off
setlocal
cd /d "%~dp0"
title RAIDMATE - servidor local

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo Python no esta instalado o no esta en el PATH.
  echo Instala Python 3.10+ desde https://www.python.org/downloads/
  echo y vuelve a ejecutar start.bat.
  echo.
  pause
  exit /b 1
)

echo Iniciando RAIDMATE...
python server.py --open
if errorlevel 1 (
  echo.
  echo El servidor se cerro con un error.
  pause
)
