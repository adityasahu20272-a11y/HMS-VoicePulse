import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# SQLite connection args for multi-threaded FastAPI workers
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables without deleting existing data."""
    from . import models
    settings.ensure_directories()
    Base.metadata.create_all(bind=engine)
    
    # Check if we should insert an initial sample doctor if table is empty
    db = SessionLocal()
    try:
        doctor_count = db.query(models.Doctor).count()
        if doctor_count == 0:
            sample_doctor = models.Doctor(
                doctor_id="DOC-101",
                name="Dr. Sarah Mitchell",
                department="Internal Medicine",
                designation="Senior Physician",
                opd_room="OPD Room 3B",
                contact_number="+1-555-0142",
                email="s.mitchell@hospital.local"
            )
            db.add(sample_doctor)
            db.commit()
    except Exception as e:
        db.rollback()
        # Logging will capture errors
    finally:
        db.close()
