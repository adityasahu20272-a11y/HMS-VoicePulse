import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..nlp_processor import extract_clinical_notes

router = APIRouter(prefix="/api/consultations", tags=["Consultations"])

@router.post("/extract-nlp", response_model=schemas.ExtractNLPResponse)
def run_nlp_extraction(payload: schemas.ExtractNLPRequest):
    """
    Run local deterministic NLP structured note extraction on a transcript.
    Follows strict clinical safety rules without inventing missing data.
    """
    extracted = extract_clinical_notes(payload.transcript)
    return {
        "transcript": payload.transcript,
        "extracted_data": extracted,
        "flagged_for_manual_review": True
    }

@router.get("", response_model=List[schemas.ConsultationResponse])
def get_consultations(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    doctor_id: Optional[str] = Query(None, description="Filter by doctor ID"),
    status: Optional[str] = Query(None, description="Filter by status (draft, verified, completed)"),
    db: Session = Depends(get_db)
):
    """Fetch saved consultations with optional filters."""
    query = db.query(models.Consultation)
    if patient_id:
        query = query.filter(models.Consultation.patient_id == patient_id)
    if doctor_id:
        query = query.filter(models.Consultation.doctor_id == doctor_id)
    if status:
        query = query.filter(models.Consultation.status == status)

    return query.order_by(models.Consultation.date_time.desc()).all()

@router.post("", response_model=schemas.ConsultationResponse, status_code=status.HTTP_201_CREATED)
def create_consultation(payload: schemas.ConsultationCreate, db: Session = Depends(get_db)):
    """
    Save a new consultation record.
    Links to valid doctor and patient.
    Stores original raw transcript untouched.
    """
    # Verify patient exists
    patient = db.query(models.Patient).filter(models.Patient.patient_id == payload.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{payload.patient_id}' not found. Please create or select a valid patient first."
        )

    # Verify doctor exists
    doctor = db.query(models.Doctor).filter(models.Doctor.doctor_id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor '{payload.doctor_id}' not found. Please select an active doctor."
        )

    # Generate unique consultation ID if not provided
    cid = payload.consultation_id
    if not cid:
        timestamp_part = datetime.utcnow().strftime("%Y%m%d")
        rand_part = uuid.uuid4().hex[:5].upper()
        cid = f"CON-{timestamp_part}-{rand_part}"

    # Extract NLP draft notes if not provided
    draft_notes = payload.clinical_notes_draft
    if draft_notes is None:
        draft_notes = extract_clinical_notes(payload.transcript_original)

    consultation = models.Consultation(
        consultation_id=cid,
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        date_time=datetime.utcnow(),
        transcript_original=payload.transcript_original,
        language=payload.language or "en",
        clinical_notes_draft=json.dumps(draft_notes),
        clinical_notes_verified=None,
        doctor_notes_text=payload.doctor_notes_text,
        status="draft"
    )

    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return consultation

@router.get("/{consultation_id}", response_model=schemas.ConsultationResponse)
def get_consultation_by_id(consultation_id: str, db: Session = Depends(get_db)):
    """Retrieve full consultation details."""
    consultation = db.query(models.Consultation).filter(models.Consultation.consultation_id == consultation_id).first()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consultation '{consultation_id}' not found."
        )
    return consultation

@router.put("/{consultation_id}/verify", response_model=schemas.ConsultationResponse)
def verify_consultation_notes(
    consultation_id: str,
    payload: schemas.ConsultationVerify,
    db: Session = Depends(get_db)
):
    """
    Doctor verifies and updates clinical notes.
    Original raw speech transcript is strictly PRESERVED and untouched.
    """
    consultation = db.query(models.Consultation).filter(models.Consultation.consultation_id == consultation_id).first()
    if not consultation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consultation '{consultation_id}' not found."
        )

    # Save doctor-verified notes as JSON string
    consultation.clinical_notes_verified = json.dumps(payload.clinical_notes_verified)
    consultation.status = payload.status or "verified"
    if payload.doctor_notes_text is not None:
        consultation.doctor_notes_text = payload.doctor_notes_text

    db.commit()
    db.refresh(consultation)
    return consultation
