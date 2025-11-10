from sqlalchemy import (
    create_engine, Column, Integer, String, Date, Time,
    Enum as SQLAlchemyEnum, ForeignKey, DateTime, func, Text
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from backend import schemas 

DATABASE_URL = "sqlite:///./techroute.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    item_type = Column(SQLAlchemyEnum(schemas.ResourceType), nullable=False) 
    visit_id = Column(Integer, ForeignKey("technical_visits.id"))
    visit = relationship("TechnicalVisit", back_populates="resources")

class PostVisitNote(Base):
    __tablename__ = "post_visit_notes"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    visit_id = Column(Integer, ForeignKey("technical_visits.id"))
    visit = relationship("TechnicalVisit", back_populates="notes")

class TechnicalVisit(Base):
    __tablename__ = "technical_visits"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, index=True)
    client_location = Column(String)
    assigned_technician = Column(SQLAlchemyEnum(schemas.Technician), nullable=False)
    service_type = Column(SQLAlchemyEnum(schemas.ServiceType), nullable=False)
    visit_date = Column(Date)
    visit_time = Column(Time)
    
    status = Column(
        SQLAlchemyEnum(schemas.VisitStatus), 
        nullable=False, 
        default=schemas.VisitStatus.scheduled
    )
    status_timestamp = Column(
        DateTime, 
        default=func.now(), 
        onupdate=func.now()
    )
    status_reason = Column(String, nullable=True)
    
    resources = relationship(
        "Resource", 
        back_populates="visit", 
        cascade="all, delete-orphan"
    )

    notes = relationship(
        "PostVisitNote",
        back_populates="visit",
        cascade="all, delete-orphan",
        order_by="PostVisitNote.created_at.desc()"
    )
Base.metadata.create_all(bind=engine)