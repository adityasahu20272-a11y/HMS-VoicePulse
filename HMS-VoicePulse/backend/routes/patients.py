from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[schemas.PatientResponse])
def get_all_patients(
    q: Optional[str] = Query(None, description="Search by name or patient ID"),
    db: Session = Depends(get_db)
):
    """Fetch patients with optional search query."""
    query = db.query(models.Patient)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (models.Patient.full_name.ilike(term)) | 
            (models.Patient.patient_id.ilike(term))
        )
    return query.order_by(models.Patient.created_at.desc()).all()

@router.post("", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(payload: schemas.PatientCreate, db: Session = Depends(get_db)):
    """Register a new patient record with unique patient_id check."""
    existing = db.query(models.Patient).filter(models.Patient.patient_id == payload.patient_id.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with ID '{payload.patient_id}' already exists."
        )

    patient = models.Patient(
        patient_id=payload.patient_id.strip(),
        full_name=payload.full_name.strip(),
        age=payload.age,
        dob=payload.dob.strip() if payload.dob else None,
        gender=payload.gender.strip() if payload.gender else None,
        contact_number=payload.contact_number.strip() if payload.contact_number else None,
        address=payload.address.strip() if payload.address else None,
        medical_history=payload.medical_history.strip() if payload.medical_history else None,
        allergies=payload.allergies.strip() if payload.allergies else None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient_by_id(patient_id: str, db: Session = Depends(get_db)):
    """Get single patient details."""
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found.")
    return patient

@router.put("/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(patient_id: str, payload: schemas.PatientUpdate, db: Session = Depends(get_db)):
    """Update patient information."""
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found.")

    if payload.full_name is not None:
        patient.full_name = payload.full_name.strip()
    if payload.age is not None:
        patient.age = payload.age
    if payload.dob is not None:
        patient.dob = payload.dob.strip() if payload.dob else None
    if payload.gender is not None:
        patient.gender = payload.gender.strip() if payload.gender else None
    if payload.contact_number is not None:
        patient.contact_number = payload.contact_number.strip() if payload.contact_number else None
    if payload.address is not None:
        patient.address = payload.address.strip() if payload.address else None
    if payload.medical_history is not None:
        patient.medical_history = payload.medical_history.strip() if payload.medical_history else None
    if payload.allergies is not None:
        patient.allergies = payload.allergies.strip() if payload.allergies else None

    db.commit()
    db.refresh(patient)
    return patient

@router.delete("/{patient_id}", status_code=status.HTTP_200_OK)
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Delete patient record safely. Rejects deletion if consultations exist."""
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient '{patient_id}' not found.")

    consultation_count = db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).count()
    if consultation_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete Patient '{patient_id}' because {consultation_count} consultation record(s) exist for this patient."
        )

    db.delete(patient)
    db.commit()
    return {"message": f"Patient '{patient_id}' deleted successfully.", "deleted_id": patient_id}
