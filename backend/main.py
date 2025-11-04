# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import Request, Response
from typing import List # <-- IMPORTED FOR LIST RESPONSES

# Import our custom modules using package imports
from backend import models, schemas
from backend.models import SessionLocal, engine

# This creates the new 'resources' table if it doesn't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TechRoute API",
    description="API for managing technical service visits.",
    version="1.0.0"
)

# --- CORS Configuration (Keep as-is) ---
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

# --- Middleware (Keep as-is) ---
@app.middleware("http")
async def set_content_language(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["Content-Language"] = "en-CA"
    return response

# --- DB Dependency (Keep as-is) ---
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
    (Note: This now returns a Visit schema which includes an empty 'resources' list)
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

# --- NEW ENDPOINT (Add Resource) ---
@app.post("/api/visits/{visit_id}/resources", response_model=schemas.Resource)
def create_resource_for_visit(
    visit_id: int, 
    resource: schemas.ResourceCreate, 
    db: Session = Depends(get_db)
):
    """
    Create a new resource (material, tool, etc.) and
    associate it with a specific visit by visit_id.
    """
    # 1. Check if the visit exists
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # 2. Create the new resource linked to that visit
    db_resource = models.Resource(
        **resource.model_dump(), 
        visit_id=visit_id
    )
    
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

# --- NEW ENDPOINT (List All Visits) ---
@app.get("/api/visits", response_model=List[schemas.Visit])
def read_visits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve all visits, including their allocated resources.
    """
    visits = db.query(models.TechnicalVisit).offset(skip).limit(limit).all()
    return visits

# --- NEW ENDPOINT (Get One Visit) ---
@app.get("/api/visits/{visit_id}", response_model=schemas.Visit)
def read_visit(visit_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single visit by its ID, including its allocated resources.
    """
    db_visit = db.query(models.TechnicalVisit).filter(models.TechnicalVisit.id == visit_id).first()
    if db_visit is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return db_visit

# --- NEW ENDPOINT (Update Resource) ---
@app.patch("/api/resources/{resource_id}", response_model=schemas.Resource)
def update_resource(resource_id: int, resource_update: schemas.ResourceUpdate, db: Session = Depends(get_db)):
    """
    Update a resource's editable fields.
    """
    db_resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if db_resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Simple validation rules
    if len(resource_update.item_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Item name must have at least 2 characters")

    # Apply updates
    db_resource.item_name = resource_update.item_name.strip()
    db_resource.item_type = resource_update.item_type

    db.commit()
    db.refresh(db_resource)
    return db_resource

# --- NEW ENDPOINT (Delete Resource) ---
@app.delete("/api/resources/{resource_id}")
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    """
    Delete a resource. For safety, equipment items are considered essential and cannot be removed.
    """
    db_resource = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if db_resource is None:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Prevent deletion of essential resources (simple rule)
    if db_resource.item_type == schemas.ResourceType.equipment:
        raise HTTPException(status_code=400, detail="Equipment resources are essential and cannot be deleted")

    db.delete(db_resource)
    db.commit()
    return {"status": "deleted", "id": resource_id}