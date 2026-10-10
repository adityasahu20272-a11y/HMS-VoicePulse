from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    doctor_id: str = Field(..., description="Unique alphanumeric identifier (e.g. DOC-101)")
    name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    designation: Optional[str] = None
    opd_room: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    opd_room: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Patient Schemas ---
class PatientBase(BaseModel):
    patient_id: str = Field(..., description="Unique alphanumeric identifier (e.g. PAT-2026-001)")
    full_name: str = Field(..., min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=130)
    dob: Optional[str] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=130)
    dob: Optional[str] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Structured Clinical Note Schema ---
class ClinicalNoteSchema(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    symptom_duration: Optional[str] = None
    temperature: Optional[str] = None
    observations: List[str] = Field(default_factory=list)
    medicines_mentioned: List[str] = Field(default_factory=list)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    negations_recorded: List[str] = Field(default_factory=list, description="Explicit denials like 'no vomiting', 'no chest pain'")
    additional_details: List[str] = Field(default_factory=list)
    needs_doctor_verification: bool = True

# --- Consultation Schemas ---
class ConsultationCreate(BaseModel):
    consultation_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    transcript_original: str
    language: Optional[str] = "en"
    clinical_notes_draft: Optional[Dict[str, Any]] = None
    doctor_notes_text: Optional[str] = None

class ConsultationVerify(BaseModel):
    clinical_notes_verified: Dict[str, Any]
    doctor_notes_text: Optional[str] = None
    status: Optional[str] = "verified"

class ConsultationResponse(BaseModel):
    id: int
    consultation_id: str
    patient_id: str
    doctor_id: str
    date_time: datetime
    transcript_original: str
    language: str
    clinical_notes_draft: Optional[str] = None
    clinical_notes_verified: Optional[str] = None
    doctor_notes_text: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    doctor: Optional[DoctorResponse] = None
    patient: Optional[PatientResponse] = None

    class Config:
        from_attributes = True

# --- NLP Extraction Request/Response ---
class ExtractNLPRequest(BaseModel):
    transcript: str

class ExtractNLPResponse(BaseModel):
    transcript: str
    extracted_data: ClinicalNoteSchema
    flagged_for_manual_review: bool

# --- Health Schema ---
class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database_connected: bool
    whisper_model: str
    device: str
    compute_type: str
    records_count: Dict[str, int]
