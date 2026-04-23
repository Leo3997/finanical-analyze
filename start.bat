@echo off
echo Starting Flask backend...
start "Backend Server" cmd /k "cd /d "%~dp0" && call venv\Scripts\activate && python app.py"

echo Starting Vite frontend...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Done! Two new console windows should be running now.
pause
