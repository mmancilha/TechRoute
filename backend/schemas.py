from pydantic import BaseModel, Field
from datetime import date, time, datetime # <-- 1. IMPORT DATETIME
from enum import Enum
from typing import List, Optional # <-- 2. IMPORT OPTIONAL

# ---  ADD NEW STATUS ENUM ---
class VisitStatus(str, Enum):
    scheduled = "Scheduled"
    in_progress = "In Progress"
    completed = "Completed"
    canceled = "Canceled"
    rescheduled = "Rescheduled"

# --- (Enums ServiceType, Technician, ResourceType - Keep as-is) ---
class ServiceType(str, Enum):
    # ... (existing values)
    installation = "Installation"
    preventive_maintenance = "Preventive Maintenance"
    urgent_repair = "Urgent Repair"
    network_setup = "Network Setup"
    hardware_upgrade = "Hardware Upgrade"
    software_installation = "Software Installation"
    system_diagnostics = "System Diagnostics"
    onsite_consultation = "On-site Consultation"

class Technician(str, Enum):
    # ... (existing values)
    olivia_brown = "Olivia Brown"
    liam_johnson = "Liam Johnson"
    emma_wilson = "Emma Wilson"
    noah_thompson = "Noah Thompson"

class ResourceType(str, Enum):
    material = "Material"
    tool = "Tool"
    equipment = "Equipment"

# --- (Resource Schemas - Keep as-is) ---
class ResourceBase(BaseModel):
    item_name: str
    item_type: ResourceType

class ResourceCreate(ResourceBase):
    pass

class Resource(ResourceBase):
    id: int
    visit_id: int
    class Config: from_attributes = True

# --- (VisitBase & VisitCreate - Keep as-is) ---
class VisitBase(BaseModel):
    client_name: str
    client_location: str
    assigned_technician: Technician
    service_type: ServiceType
    visit_date: date
    visit_time: time

class VisitCreate(VisitBase):
    pass

# --- 4. ADD NEW SCHEMA FOR STATUS UPDATES ---
# This schema is for the request body of our new PATCH endpoint
# (Criterion 2: easily add reasons)
class VisitStatusUpdate(BaseModel):
    status: VisitStatus
    reason: Optional[str] = None # Reason is optional

# --- 5. MODIFY THE MAIN 'Visit' RESPONSE SCHEMA ---
# Add the new status fields so the frontend can display them
class Visit(VisitBase):
    id: int
    resources: List[Resource] = []
    
    # --- ADD THESE NEW FIELDS ---
    status: VisitStatus = VisitStatus.scheduled # Default for existing
    status_timestamp: Optional[datetime] = None
    status_reason: Optional[str] = None
    # --- END OF ADDITION ---

    class Config:
        from_attributes = True