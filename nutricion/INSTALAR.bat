@echo off
title Plataforma Nutricional - Dra. Jaquez
echo.
echo  ================================================
echo   Plataforma Nutricional - Dra. Anayanet Jaquez
echo  ================================================
echo.

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Python no esta instalado.
    echo  Descarga Python desde: https://www.python.org/downloads/
    echo  Marca la opcion "Add Python to PATH" durante la instalacion.
    pause
    exit
)

:: Instalar dependencias si es necesario
echo  Verificando dependencias...
pip install flask flask-cors >nul 2>&1
echo  Dependencias OK.
echo.
echo  Iniciando servidor local...
echo  Abre tu navegador en: http://localhost:5000
echo.
echo  Para cerrar el sistema, cierra esta ventana.
echo.

:: Iniciar Flask
cd /d "%~dp0"
python app.py

pause
