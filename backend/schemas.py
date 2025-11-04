# schemas.py
from pydantic import BaseModel
from datetime import date, time
from enum import Enum

# Base schema for data validation
class ServiceType(str, Enum):
    installation = "Installation"
    preventive_maintenance = "Preventive Maintenance"
    urgent_repair = "Urgent Repair"
    network_setup = "Network Setup"
    hardware_upgrade = "Hardware Upgrade"
    software_installation = "Software Installation"
    system_diagnostics = "System Diagnostics"
    onsite_consultation = "On-site Consultation"

class Technician(str, Enum):
    olivia_brown = "Olivia Brown"
    liam_johnson = "Liam Johnson"
    emma_wilson = "Emma Wilson"
    noah_thompson = "Noah Thompson"

class VisitBase(BaseModel):
    client_name: str
    client_location: str
    assigned_technician: Technician
    service_type: ServiceType
    visit_date: date
    visit_time: time

# Schema for creating a new visit (what we expect from the request)
class VisitCreate(VisitBase):
    pass

# Schema for reading/returning a visit (what we send back in the response)
class Visit(VisitBase):
    id: int

    class Config:
        from_attributes = True # Replaces orm_mode = True