import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..config import settings
from ..whisper_engine import whisper_engine
from .. import models, schemas

router = APIRouter(prefix="/api", tags=["Settings & Diagnostics"])

@router.get("/health", response_model=schemas.HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Health endpoint returning server and component status."""
    db_connected = False
    doc_count = 0
    pat_count = 0
    con_count = 0

    try:
        db.execute(text("SELECT 1"))
        db_connected = True
        doc_count = db.query(models.Doctor).count()
        pat_count = db.query(models.Patient).count()
        con_count = db.query(models.Consultation).count()
    except Exception:
        db_connected = False

    return {
        "status": "healthy" if db_connected else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database_connected": db_connected,
        "whisper_model": settings.WHISPER_MODEL,
        "device": settings.DEVICE,
        "compute_type": settings.COMPUTE_TYPE,
        "records_count": {
            "doctors": doc_count,
            "patients": pat_count,
            "consultations": con_count
        }
    }

@router.get("/settings/diagnostics")
def get_diagnostics():
    """Return local macOS environment diagnostic info."""
    db_exists = settings.DATABASE_PATH.exists()
    db_size_bytes = settings.DATABASE_PATH.stat().st_size if db_exists else 0
    whisper_status = whisper_engine.get_status()

    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "host": settings.APP_HOST,
        "port": settings.APP_PORT,
        "database": {
            "path": str(settings.DATABASE_PATH),
            "exists": db_exists,
            "size_kb": round(db_size_bytes / 1024, 2)
        },
        "whisper": whisper_status,
        "directories": {
            "data_dir": str(settings.DATA_DIR),
            "logs_dir": str(settings.LOGS_DIR),
            "models_dir": str(settings.MODELS_DIR)
        }
    }
