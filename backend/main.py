# main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Request, Response

# Import our custom modules using package imports
from backend import models, schemas
from backend.models import SessionLocal, engine

app = FastAPI(
    title="TechRoute API",
    description="API for managing technical service visits.",
    version="1.0.0"
)

# --- CORS Configuration ---
# Allow requests from our future frontend
origins = [
    "*",  # For development. In production, change this to your frontend URL.
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)
# --- End CORS ---

@app.middleware("http")
async def set_content_language(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Content-Language"] = "en-CA"
    return response


# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"Project": "TechRoute API", "Status": "Online", "locale": "en-CA", "currency": "CAD"}

@app.post("/api/visits", response_model=schemas.Visit)
def create_visit(visit: schemas.VisitCreate, db: Session = Depends(get_db)):
    """
    Create a new technical visit in the database.
    Receives data from the scheduling form (as JSON).
    """
    
    # Create a new SQLAlchemy model instance from the validated schema data
    db_visit = models.TechnicalVisit(
        client_name=visit.client_name,
        client_location=visit.client_location,
        assigned_technician=visit.assigned_technician,
        service_type=visit.service_type,
        visit_date=visit.visit_date,
        visit_time=visit.visit_time
    )
    
    # Add to the session, commit to the database, and refresh
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    
    # Return the newly created object
    return db_visit