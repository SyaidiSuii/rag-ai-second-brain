@echo off
title Launching Project AI Second Brain

echo Starting Backend API (FastAPI/Uvicorn)...
start "Backend - FastAPI" cmd /k ".\venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Celery Worker...
start "Celery Worker" cmd /k ".\venv\Scripts\activate.bat && celery -A app.core.celery_app worker --loglevel=info -P solo"

echo Starting Frontend Dev Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services launched in separate windows!