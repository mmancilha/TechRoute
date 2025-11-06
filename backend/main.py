# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Request, Response
from typing import List

# Import our custom modules using package imports
from backend import models, schemas
from backend.models import SessionLocal, engine

# This creates/updates all tables (incl. new 'post_visit_notes' table)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TechRoute API",
    description="API for managing technical service visits.",
    version="1.0.0"
)

# --- CORS Configuration (as-is) ---
origins = [
    "*", 
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)
# --- End CORS ---

# --- Middleware (as-is) ---
@app.middleware("http")
async def set_content_language(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Content-Language"] = "en-CA"
    return response

# --- DB Dependency (as-is) ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API Endpoints (Existing) ---

@app.get("/")
def read_root():
    return {"Project": "TechRoute API", "Status": "Online", "locale": "en-CA", "currency": "CAD"}

@app.post("/api/visits", response_model=schemas.Visit)
def create_visit(visit: schemas.VisitCreate, db: Session = Depends(get_db)):
    """
    Create a new technical visit in the database.
    (Now defaults to 'Scheduled' status)
    """
    db_visit = models.TechnicalVisit(
        client_name=visit.client_name,
        client_location=visit.client_location,
        assigned_technician=visit.assigned_technician,
        service_type=visit.service_type,
        visit_date=visit.visit_date,
        visit_time=visit.visit_time
    )
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@app.post("/api/visits/{visit_id}/resources", response_model=schemas.Resource)
def create_resource_for_visit(
    visit_id: int, 
    resource: schemas.ResourceCreate, 
    db: Session = Depends(get_db)
):
    """
    Create a new resource and associate it with a specific visit.
    """
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    db_resource = models.Resource(**resource.model_dump(), visit_id=visit_id)
    
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@app.get("/api/visits", response_model=List[schemas.Visit])
def read_visits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve all visits, including their resources and status.
    """
    visits = db.query(models.TechnicalVisit).offset(skip).limit(limit).all()
    return visits

@app.get("/api/visits/{visit_id}", response_model=schemas.Visit)
def read_visit(visit_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single visit by its ID, including resources, status, and notes.
    """
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return db_visit

@app.patch("/api/visits/{visit_id}/status", response_model=schemas.Visit)
def update_visit_status(
    visit_id: int, 
    status_update: schemas.VisitStatusUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update the status of a visit (e.g., Completed, Canceled)
    and optionally provide a reason.
    Timestamp is updated automatically.
    """
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Update the fields
    db_visit.status = status_update.status
    
    if status_update.reason is not None:
        db_visit.status_reason = status_update.reason
    
    # Commit changes and refresh instance
    db.commit()
    db.refresh(db_visit)
    return db_visit


# --- NEW: Create post-visit note ---
@app.post("/api/visits/{visit_id}/notes", response_model=schemas.PostVisitNote)
def create_post_visit_note(
    visit_id: int,
    note: schemas.PostVisitNoteCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new post-visit note associated with a visit.
    """
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")

    db_note = models.PostVisitNote(content=note.content, visit_id=visit_id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note