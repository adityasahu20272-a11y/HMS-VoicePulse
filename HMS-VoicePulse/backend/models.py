from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    designation = Column(String(100), nullable=True)
    opd_room = Column(String(50), nullable=True)
    contact_number = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    consultations = relationship("Consultation", back_populates="doctor")

    def to_dict(self):
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "name": self.name,
            "department": self.department,
            "designation": self.designation,
            "opd_room": self.opd_room,
            "contact_number": self.contact_number,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=True)
    dob = Column(String(20), nullable=True)
    gender = Column(String(20), nullable=True)
    contact_number = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    medical_history = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    consultations = relationship("Consultation", back_populates="patient")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "full_name": self.full_name,
            "age": self.age,
            "dob": self.dob,
            "gender": self.gender,
            "contact_number": self.contact_number,
            "address": self.address,
            "medical_history": self.medical_history,
            "allergies": self.allergies,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False)
    doctor_id = Column(String(50), ForeignKey("doctors.doctor_id"), nullable=False)
    
    date_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Original raw speech transcript (NEVER overwritten when doctor updates notes)
    transcript_original = Column(Text, nullable=False)
    language = Column(String(20), default="en", nullable=False)
    
    # Draft extracted notes by local NLP (JSON string)
    clinical_notes_draft = Column(Text, nullable=True)
    
    # Doctor reviewed & verified notes (JSON string)
    clinical_notes_verified = Column(Text, nullable=True)
    
    # Doctor free text notes or prescription comments
    doctor_notes_text = Column(Text, nullable=True)
    
    # Status: draft, verified, completed
    status = Column(String(30), default="draft", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    doctor = relationship("Doctor", back_populates="consultations")
    patient = relationship("Patient", back_populates="consultations")

    def to_dict(self):
        return {
            "id": self.id,
            "consultation_id": self.consultation_id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "date_time": self.date_time.isoformat() if self.date_time else None,
            "transcript_original": self.transcript_original,
            "language": self.language,
            "clinical_notes_draft": self.clinical_notes_draft,
            "clinical_notes_verified": self.clinical_notes_verified,
            "doctor_notes_text": self.doctor_notes_text,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
