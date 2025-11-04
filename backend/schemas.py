# backend/schemas.py
from pydantic import BaseModel
from datetime import date, time
from enum import Enum
from typing import List # <-- 1. IMPORT THIS

# --- ServiceType and Technician Enums (Keep as-is) ---
class ServiceType(str, Enum):
    # ... (all your existing service types) ...
    installation = "Installation"
    preventive_maintenance = "Preventive Maintenance"
    urgent_repair = "Urgent Repair"
    network_setup = "Network Setup"
    hardware_upgrade = "Hardware Upgrade"
    software_installation = "Software Installation"
    system_diagnostics = "System Diagnostics"
    onsite_consultation = "On-site Consultation"

class Technician(str, Enum):
    # ... (all your existing technicians) ...
    olivia_brown = "Olivia Brown"
    liam_johnson = "Liam Johnson"
    emma_wilson = "Emma Wilson"
    noah_thompson = "Noah Thompson"

# --- 2. ADD THIS NEW ENUM ---
class ResourceType(str, Enum):
    material = "Material"
    tool = "Tool"
    equipment = "Equipment"

# --- 3. ADD THESE NEW SCHEMAS (for Resources) ---
class ResourceBase(BaseModel):
    item_name: str
    item_type: ResourceType

class ResourceCreate(ResourceBase):
    pass # No extra fields needed for creation

class ResourceUpdate(ResourceBase):
    # For update operations; both fields required to keep validation simple
    pass

class Resource(ResourceBase):
    id: int
    visit_id: int

    class Config:
        from_attributes = True

# --- VisitBase and VisitCreate (Keep as-is) ---
class VisitBase(BaseModel):
    client_name: str
    client_location: str
    assigned_technician: Technician
    service_type: ServiceType
    visit_date: date
    visit_time: time

class VisitCreate(VisitBase):
    pass

# --- 4. MODIFY THE EXISTING 'Visit' SCHEMA ---
class Visit(VisitBase):
    id: int
    resources: List[Resource] = [] # <-- MODIFY THIS LINE (add 'resources')

    class Config:
        from_attributes = True