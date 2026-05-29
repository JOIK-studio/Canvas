@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  Canvas - Instalador de despliegue
REM  Uso:
REM    install_canvas.bat "URL_ZIP_PUBLICO"
REM    install_canvas.bat "URL_ZIP_PUBLICO" "C:\Ruta\Destino"
REM ============================================================

set "ZIP_URL=%~1"
set "TARGET_DIR=%~2"

echo.
echo  ================================
echo   Canvas - Instalador
echo  ================================
echo.

if "%ZIP_URL%"=="" (
  set /p ZIP_URL=URL del paquete ZIP de Canvas: 
)

if "%TARGET_DIR%"=="" (
  set /p TARGET_DIR=Ruta de instalacion ^(ej: C:\inetpub\wwwroot\canvas^): 
)

if "%TARGET_DIR%"=="" (
  set "TARGET_DIR=%CD%\Canvas-App"
)

if "%ZIP_URL%"=="" (
  echo.
  echo  Error: no se recibio URL del paquete.
  exit /b 1
)

set "WORK_DIR=%TEMP%\canvas_installer_%RANDOM%%RANDOM%"
set "ZIP_FILE=%WORK_DIR%\canvas.zip"
set "EXTRACT_DIR=%WORK_DIR%\extract"

for %%I in ("%TARGET_DIR%") do set "TARGET_DIR=%%~fI"

echo.
echo [1/7] Preparando directorios temporales...
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%"
mkdir "%WORK_DIR%" >nul 2>&1
mkdir "%EXTRACT_DIR%" >nul 2>&1

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" >nul 2>&1
if not exist "%TARGET_DIR%" (
  echo  Error: no se pudo crear el directorio de instalacion.
  goto :fail
)

echo [2/7] Descargando paquete...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing -ErrorAction Stop } catch { Write-Error $_; exit 1 }"
if errorlevel 1 (
  echo  Error: no se pudo descargar el paquete. Verifica la URL e intenta de nuevo.
  goto :fail
)

echo [3/7] Extrayendo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force } catch { Write-Error $_; exit 1 }"
if errorlevel 1 (
  echo  Error: no se pudo extraer el paquete.
  goto :fail
)

for /d %%D in ("%EXTRACT_DIR%\*") do (
  set "SRC_DIR=%%~fD"
  goto :found
)

echo  Error: no se encontro contenido en el paquete.
goto :fail

:found
echo [4/7] Copiando archivos...
if exist "%TARGET_DIR%\index.html" (
  echo  Aviso: ya existe una instalacion en "%TARGET_DIR%". Se sobreescribiran archivos.
)

robocopy "%SRC_DIR%" "%TARGET_DIR%" /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP /XD ".git" ".github" ".vscode" "node_modules" "memories" "secrets" "private" /XF ".env" ".env.*" "*.pem" "*.key" "*.p12" "*.pfx" "*.jks" "*.keystore" "*.kdbx" "id_rsa" "id_ed25519" "canvas-env.js" "*.log" >nul

echo [5/7] Limpieza de archivos internos...
for %%F in (".env" ".env.local" ".env.production" ".npmrc" ".pypirc") do (
  if exist "%TARGET_DIR%\%%~F" del /f /q "%TARGET_DIR%\%%~F" >nul 2>&1
)
if exist "%TARGET_DIR%\install_canvas.bat" del /f /q "%TARGET_DIR%\install_canvas.bat" >nul 2>&1
if exist "%TARGET_DIR%\supabase_schema.sql" del /f /q "%TARGET_DIR%\supabase_schema.sql" >nul 2>&1

echo [6/7] Configurando conexion Supabase...
echo.
echo  Necesitas los datos de tu proyecto Supabase:
echo  (Supabase Dashboard -^> Project Settings -^> API)
echo.
set "SB_URL="
set "SB_KEY="
set /p SB_URL= Supabase Project URL (https://xxxx.supabase.co): 
set /p SB_KEY= Supabase Anon/Public Key (eyJ...): 

if "%SB_URL%"=="" (
  echo.
  echo  Aviso: no se configuro Supabase. Puedes hacerlo despues desde auth.html?setup=1
  goto :skip_env
)
if "%SB_KEY%"=="" (
  echo.
  echo  Aviso: Anon Key vacia. Configuracion omitida. Usa auth.html?setup=1 mas adelante.
  goto :skip_env
)

echo  Generando js\canvas-env.js...
(
  echo // Canvas - Configuracion de entorno generada por instalador
  echo // NO editar manualmente. Regenerar ejecutando install_canvas.bat de nuevo.
  echo window.CANVAS_SUPABASE_URL = "%SB_URL%";
  echo window.CANVAS_SUPABASE_KEY = "%SB_KEY%";
) > "%TARGET_DIR%\js\canvas-env.js"

REM Inyectar referencia en index.html si no esta ya
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%TARGET_DIR%\index.html'; $c=[System.IO.File]::ReadAllText($f,'UTF-8'); if ($c -notmatch 'canvas-env\.js') { $c=$c -replace '(<script src=\"js/supabase-config\.js\">)', '<script src=\"js/canvas-env.js\"></script>`n  $1'; [System.IO.File]::WriteAllText($f,$c,'UTF-8') }"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%TARGET_DIR%\auth.html'; $c=[System.IO.File]::ReadAllText($f,'UTF-8'); if ($c -notmatch 'canvas-env\.js') { $c=$c -replace '(<script src=\"js/supabase-config\.js\">)', '<script src=\"js/canvas-env.js\"></script>`n  $1'; [System.IO.File]::WriteAllText($f,$c,'UTF-8') }"

echo  Conexion Supabase configurada.

:skip_env
echo [7/7] Limpieza final...
rmdir /s /q "%WORK_DIR%" >nul 2>&1

echo.
echo  ================================================
echo   Instalacion completada
echo   Directorio: %TARGET_DIR%
echo  ================================================
echo.
echo  Proximos pasos:
echo   1) Abre index.html en un servidor HTTP local
echo      (VS Code "Live Server", XAMPP, IIS, nginx...)
echo   2) Si no configuraste Supabase ahora, abre:
echo      auth.html?setup=1
echo   3) Crea tu cuenta o inicia sesion
echo.
exit /b 0

:fail
echo.
echo  Instalacion cancelada.
if exist "%WORK_DIR%" rmdir /s /q "%WORK_DIR%" >nul 2>&1
exit /b 1
