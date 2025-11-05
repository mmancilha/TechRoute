
# 1. IMPORT DATETIME and func
from sqlalchemy import (
    create_engine, Column, Integer, String, Date, Time, 
    Enum as SQLAlchemyEnum, ForeignKey, DateTime, func
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Import schemas to reference its Enums
from backend import schemas 

# --- Database Setup (as-is) ---
DATABASE_URL = "sqlite:///./techroute.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Resource Model (as-is) ---
class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    item_type = Column(SQLAlchemyEnum(schemas.ResourceType), nullable=False) 
    visit_id = Column(Integer, ForeignKey("technical_visits.id"))
    visit = relationship("TechnicalVisit", back_populates="resources")

# --- MODIFIED: TechnicalVisit Model ---
class TechnicalVisit(Base):
    __tablename__ = "technical_visits"

    # --- (Existing Columns) ---
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, index=True)
    client_location = Column(String)
    assigned_technician = Column(SQLAlchemyEnum(schemas.Technician), nullable=False)
    service_type = Column(SQLAlchemyEnum(schemas.ServiceType), nullable=False)
    visit_date = Column(Date)
    visit_time = Column(Time)
    
    # --- 2. ADD THESE NEW STATUS COLUMNS ---
    status = Column(
        SQLAlchemyEnum(schemas.VisitStatus), 
        nullable=False, 
        default=schemas.VisitStatus.scheduled
    )
    # Criterion 1: updated correctly with a timestamp
    status_timestamp = Column(
        DateTime, 
        default=func.now(), 
        onupdate=func.now()
    )
    # Criterion 2: add reasons
    status_reason = Column(String, nullable=True)
    # --- END OF ADDITION ---

    # Relationship (as-is)
    resources = relationship(
        "Resource", 
        back_populates="visit", 
        cascade="all, delete-orphan"
    )

# --- Create tables ---
# This will now add the new columns to 'technical_visits'
Base.metadata.create_all(bind=engine)