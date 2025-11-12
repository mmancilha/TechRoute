# TechRoute

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-initial-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## What is it

TechRoute is a web app to schedule and manage technical service visits. It provides a dark, responsive UI and a simple API to store appointments.

## What we use

- FastAPI, SQLAlchemy, SQLite
- HTML, CSS (dark theme), JavaScript (fetch)

## Requirements

- Python 3.11+
- pip and virtualenv

## Quick Start

```bash
git clone https://github.com/mmancilha/TechRoute.git
cd TechRoute

python -m venv .venv
. .venv\Scripts\Activate.ps1  # Windows PowerShell
pip install fastapi uvicorn sqlalchemy pydantic

uvicorn backend.main:app --reload --port 8000
cd frontend && python -m http.server 8001
```

- UI: `http://127.0.0.1:8001/`
- API: `http://127.0.0.1:8000/`

## Usage (API)

```bash
curl -X POST "http://127.0.0.1:8000/api/visits" \
  -H "Content-Type: application/json" \
  -d '{
        "client_name": "Acme Corp",
        "client_location": "123 Main St",
        "assigned_technician": "Olivia Brown",
        "service_type": "Installation",
        "visit_date": "2025-11-05",
        "visit_time": "13:30:00"
      }'
```
