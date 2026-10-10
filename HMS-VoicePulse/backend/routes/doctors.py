from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.get("", response_model=List[schemas.DoctorResponse])
def get_all_doctors(db: Session = Depends(get_db)):
    """Fetch all registered doctor profiles."""
    doctors = db.query(models.Doctor).order_by(models.Doctor.name.asc()).all()
    return doctors

@router.post("", response_model=schemas.DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: schemas.DoctorCreate, db: Session = Depends(get_db)):
    """Create a new doctor profile with unique doctor_id check."""
    existing = db.query(models.Doctor).filter(models.Doctor.doctor_id == payload.doctor_id.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor with ID '{payload.doctor_id}' already exists."
        )

    doctor = models.Doctor(
        doctor_id=payload.doctor_id.strip(),
        name=payload.name.strip(),
        department=payload.department.strip(),
        designation=payload.designation.strip() if payload.designation else None,
        opd_room=payload.opd_room.strip() if payload.opd_room else None,
        contact_number=payload.contact_number.strip() if payload.contact_number else None,
        email=payload.email.strip() if payload.email else None,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor

@router.get("/{doctor_id}", response_model=schemas.DoctorResponse)
def get_doctor_by_id(doctor_id: str, db: Session = Depends(get_db)):
    """Get single doctor profile by doctor_id."""
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Doctor '{doctor_id}' not found.")
    return doctor

@router.put("/{doctor_id}", response_model=schemas.DoctorResponse)
def update_doctor(doctor_id: str, payload: schemas.DoctorUpdate, db: Session = Depends(get_db)):
    """Update doctor profile fields."""
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Doctor '{doctor_id}' not found.")

    if payload.name is not None:
        doctor.name = payload.name.strip()
    if payload.department is not None:
        doctor.department = payload.department.strip()
    if payload.designation is not None:
        doctor.designation = payload.designation.strip()
    if payload.opd_room is not None:
        doctor.opd_room = payload.opd_room.strip()
    if payload.contact_number is not None:
        doctor.contact_number = payload.contact_number.strip()
    if payload.email is not None:
        doctor.email = payload.email.strip()

    db.commit()
    db.refresh(doctor)
    return doctor

@router.delete("/{doctor_id}", status_code=status.HTTP_200_OK)
def delete_doctor(doctor_id: str, db: Session = Depends(get_db)):
    """Delete doctor profile safely. Rejects deletion if consultations exist."""
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Doctor '{doctor_id}' not found.")

    # Check for associated consultations
    consultation_count = db.query(models.Consultation).filter(models.Consultation.doctor_id == doctor_id).count()
    if consultation_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete Doctor '{doctor_id}' because {consultation_count} clinical consultation(s) are associated with this record."
        )

    db.delete(doctor)
    db.commit()
    return {"message": f"Doctor '{doctor_id}' deleted successfully.", "deleted_id": doctor_id}
