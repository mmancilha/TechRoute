from pydantic import BaseModel, Field
from datetime import date, time, datetime
from enum import Enum
from typing import List, Optional

class VisitStatus(str, Enum):
    scheduled = "Scheduled"
    in_progress = "In Progress"
    completed = "Completed"
    canceled = "Canceled"
    rescheduled = "Rescheduled"

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

class ResourceType(str, Enum):
    material = "Material"
    tool = "Tool"
    equipment = "Equipment"

class ResourceBase(BaseModel):
    item_name: str
    item_type: ResourceType

class ResourceCreate(ResourceBase):
    pass

class Resource(ResourceBase):
    id: int
    visit_id: int
    class Config: from_attributes = True

class VisitBase(BaseModel):
    client_name: str
    client_location: str
    assigned_technician: Technician
    service_type: ServiceType
    visit_date: date
    visit_time: time

class VisitCreate(VisitBase):
    pass

class VisitStatusUpdate(BaseModel):
    status: VisitStatus
    reason: Optional[str] = None

class PostVisitNoteBase(BaseModel):
    content: str

class PostVisitNoteCreate(PostVisitNoteBase):
    pass

class PostVisitNote(PostVisitNoteBase):
    id: int
    created_at: datetime
    visit_id: int

    class Config:
        from_attributes = True


class Visit(VisitBase):
    id: int
    resources: List[Resource] = []
    status: VisitStatus = VisitStatus.scheduled
    status_timestamp: Optional[datetime] = None
    status_reason: Optional[str] = None
    notes: List[PostVisitNote] = []

    class Config:
        from_attributes = True