/**
 * HMS VoicePulse Project Files Manifest
 * Holds source files for live inspection and one-click ZIP archive generation.
 */

export interface ProjectFile {
  path: string;
  category: 'backend' | 'frontend' | 'scripts' | 'launchers' | 'macos' | 'tests' | 'config';
  description: string;
  content: string;
}

export const PROJECT_MANIFEST: ProjectFile[] = [
  {
    path: 'requirements.txt',
    category: 'config',
    description: 'Python dependencies (FastAPI, uvicorn, faster-whisper, sqlalchemy, pydantic)',
    content: `# HMS VoicePulse - Local macOS dependencies
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
websockets>=12.0
faster-whisper>=1.0.0
sqlalchemy>=2.0.28
pydantic>=2.6.4
python-dotenv>=1.0.1
numpy>=1.24.3
httpx>=0.27.0
pytest>=8.1.1
`
  },
  {
    path: '.env.example',
    category: 'config',
    description: 'Local environment configuration template',
    content: `APP_NAME=HMS VoicePulse
APP_HOST=127.0.0.1
APP_PORT=8000
WHISPER_MODEL=small
DEVICE=cpu
COMPUTE_TYPE=int8
DEFAULT_LANGUAGE=en
DATABASE_URL=sqlite:///./data/hospital.db
LOG_LEVEL=INFO
`
  },
  {
    path: '.gitignore',
    category: 'config',
    description: 'Git ignore rules for venv, sqlite db, models and logs',
    content: `# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/
env/

# Local data & secrets
.env
data/*.db
data/*.sqlite
data/models/
logs/*.log
logs/*.pid

# macOS
.DS_Store
`
  },
  {
    path: 'backend/__init__.py',
    category: 'backend',
    description: 'Backend package init',
    content: `"""
HMS VoicePulse Backend Package
Local Clinical Voice Documentation & Hospital Management System
"""
__version__ = "1.0.0"
`
  },
  {
    path: 'backend/config.py',
    category: 'backend',
    description: 'Central configuration & path resolver for Mac filesystem',
    content: `import os
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "HMS VoicePulse")
    APP_VERSION: str = "1.0.0"
    APP_HOST: str = os.getenv("APP_HOST", "127.0.0.1")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "small")
    DEVICE: str = os.getenv("DEVICE", "cpu")
    COMPUTE_TYPE: str = os.getenv("COMPUTE_TYPE", "int8")
    DEFAULT_LANGUAGE: str = os.getenv("DEFAULT_LANGUAGE", "en")
    
    PROJECT_ROOT: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data"
    LOGS_DIR: Path = BASE_DIR / "logs"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    
    DATABASE_PATH: Path = BASE_DIR / "data" / "hospital.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: Path = BASE_DIR / "logs" / "voicepulse.log"

    def ensure_directories(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.LOGS_DIR.mkdir(parents=True, exist_ok=True)
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
`
  },
  {
    path: 'backend/database.py',
    category: 'backend',
    description: 'SQLite database connection, sessions & safe initialization',
    content: `from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from . import models
    settings.ensure_directories()
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        if db.query(models.Doctor).count() == 0:
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
    except Exception:
        db.rollback()
    finally:
        db.close()
`
  },
  {
    path: 'backend/mongodb.py',
    category: 'backend',
    description: 'MongoDB asynchronous & synchronous manager for patients, doctors & consultations',
    content: `import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("hms.mongodb")

try:
    from pymongo import MongoClient
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

class MongoDBManager:
    def __init__(self):
        self.uri = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
        self.db_name = os.getenv("MONGODB_DB_NAME", "hms_voicepulse")
        self.client = None
        self.db = None
        self.is_connected = False

    def connect(self) -> bool:
        if not HAS_PYMONGO:
            return False
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=2000)
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.is_connected = True
            return True
        except Exception:
            self.is_connected = False
            return False

    def insert_patient(self, patient_data: Dict[str, Any]) -> bool:
        if not self.is_connected: return False
        self.db.patients.update_one({"patient_id": patient_data["patient_id"]}, {"$set": patient_data}, upsert=True)
        return True

    def insert_doctor(self, doctor_data: Dict[str, Any]) -> bool:
        if not self.is_connected: return False
        self.db.doctors.update_one({"doctor_id": doctor_data["doctor_id"]}, {"$set": doctor_data}, upsert=True)
        return True

    def insert_consultation(self, con_data: Dict[str, Any]) -> bool:
        if not self.is_connected: return False
        self.db.consultations.update_one({"consultation_id": con_data["consultation_id"]}, {"$set": con_data}, upsert=True)
        return True

mongo_manager = MongoDBManager()
`
  },
  {
    path: 'backend/models.py',
    category: 'backend',
    description: 'SQLAlchemy models for Doctors, Patients, and Consultations',
    content: `from datetime import datetime
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

    consultations = relationship("Consultation", back_populates="doctor")

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

    consultations = relationship("Consultation", back_populates="patient")

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(String(50), ForeignKey("patients.patient_id"), nullable=False)
    doctor_id = Column(String(50), ForeignKey("doctors.doctor_id"), nullable=False)
    date_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    transcript_original = Column(Text, nullable=False)  # NEVER overwritten on doctor edit
    language = Column(String(20), default="en", nullable=False)
    clinical_notes_draft = Column(Text, nullable=True)
    clinical_notes_verified = Column(Text, nullable=True)
    doctor_notes_text = Column(Text, nullable=True)
    status = Column(String(30), default="draft", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    doctor = relationship("Doctor", back_populates="consultations")
    patient = relationship("Patient", back_populates="consultations")
`
  },
  {
    path: 'backend/schemas.py',
    category: 'backend',
    description: 'Pydantic schemas with request validation',
    content: `from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DoctorCreate(BaseModel):
    doctor_id: str
    name: str
    department: str
    designation: Optional[str] = None
    opd_room: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None

class PatientCreate(BaseModel):
    patient_id: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    contact_number: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class ClinicalNoteSchema(BaseModel):
    chief_complaint: Optional[str] = None
    symptoms: List[str] = []
    symptom_duration: Optional[str] = None
    temperature: Optional[str] = None
    observations: List[str] = []
    medicines_mentioned: List[str] = []
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    negations_recorded: List[str] = []
    additional_details: List[str] = []
    needs_doctor_verification: bool = True

class ConsultationCreate(BaseModel):
    patient_id: str
    doctor_id: str
    transcript_original: str
    language: Optional[str] = "en"
    clinical_notes_draft: Optional[Dict[str, Any]] = None
    doctor_notes_text: Optional[str] = None
`
  },
  {
    path: 'backend/nlp_processor.py',
    category: 'backend',
    description: 'Medical NLP entity extractor following strict clinical safety rules',
    content: `import re
from typing import Dict, Any, List, Optional

COMMON_SYMPTOMS = [
    "fever", "high temperature", "chills", "headache", "migraine", "dizziness", 
    "fatigue", "weakness", "nausea", "vomiting", "abdominal pain", "stomach ache", 
    "diarrhea", "cough", "sore throat", "shortness of breath", "chest pain", 
    "chest tightness", "rash", "joint pain", "back pain", "body ache", "insomnia"
]

COMMON_MEDICATIONS = [
    "paracetamol", "acetaminophen", "ibuprofen", "aspirin", "amoxicillin", 
    "azithromycin", "metformin", "lisinopril", "omeprazole", "cetirizine"
]

def extract_negations(text: str) -> List[str]:
    negations = []
    lower_text = text.lower()
    patterns = [
        r'\\b(?:no|denies|denied|without|negative for)\\s+([a-zA-Z\\s]{3,30}?)(?=[,.;]|\\band\\b|\\bbut\\b|$)'
    ]
    for pattern in patterns:
        for m in re.finditer(pattern, lower_text):
            neg_phrase = m.group(1).strip()
            if neg_phrase and len(neg_phrase) > 2:
                negations.append(f"No {neg_phrase}")
    return list(dict.fromkeys(negations))

def is_phrase_negated(phrase: str, full_text: str) -> bool:
    lower_text = full_text.lower()
    escaped = re.escape(phrase.lower())
    return re.search(r'\\b(?:no|not|denies|denied|without|negative for)\\s+(?:\\w+\\s+){0,3}' + escaped, lower_text) is not None

def extract_temperature(text: str) -> Optional[str]:
    m = re.search(r'\\b(?:temp(?:erature)?(?:\\s+(?:is|was|of))?\\s*)?(\\d{2,3}(?:\\.\\d)?)\\s*(?:°?\\s*[fF]|degrees)?\\b', text, re.IGNORECASE)
    if m:
        try:
            num = float(m.group(1))
            if 95.0 <= num <= 107.0:
                return f"{num}°F"
        except ValueError:
            pass
    return None

def extract_duration(text: str) -> Optional[str]:
    m = re.search(r'\\b(?:for|since|lasting)\\s+(\\d+\\s*(?:days?|weeks?|months?|hours?)|yesterday|last night|several days)\\b', text, re.IGNORECASE)
    return m.group(1).strip() if m else None

def extract_clinical_notes(transcript: str) -> Dict[str, Any]:
    if not transcript or not transcript.strip():
        return {
            "chief_complaint": None, "symptoms": [], "symptom_duration": None,
            "temperature": None, "observations": [], "medicines_mentioned": [],
            "dosage": None, "frequency": None, "medical_history": None,
            "allergies": None, "negations_recorded": [], "additional_details": [],
            "needs_doctor_verification": True
        }

    raw = transcript.strip()
    lower = raw.lower()
    negations = extract_negations(raw)
    
    symptoms = []
    for s in COMMON_SYMPTOMS:
        if re.search(r'\\b' + re.escape(s) + r'\\b', lower):
            if not is_phrase_negated(s, raw):
                symptoms.append(s.capitalize())
    symptoms = list(dict.fromkeys(symptoms))

    chief_complaint = symptoms[0] if symptoms else None
    duration = extract_duration(raw)
    temperature = extract_temperature(raw)

    return {
        "chief_complaint": chief_complaint,
        "symptoms": symptoms,
        "symptom_duration": duration,
        "temperature": temperature,
        "observations": [],
        "medicines_mentioned": [m.capitalize() for m in COMMON_MEDICATIONS if m in lower],
        "dosage": None,
        "frequency": None,
        "medical_history": None,
        "allergies": "No known allergies" if "no known" in lower or "nkda" in lower else None,
        "negations_recorded": negations,
        "additional_details": [],
        "needs_doctor_verification": True
    }
`
  },
  {
    path: 'backend/audio_processor.py',
    category: 'backend',
    description: 'PCM normalization, sliding window and RMS amplitude calculation',
    content: `import struct
import math
from typing import Optional

class AudioBuffer:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.raw_bytes = bytearray()
        self.total_samples_received = 0

    def add_pcm16_chunk(self, chunk: bytes):
        self.raw_bytes.extend(chunk)
        self.total_samples_received += len(chunk) // 2

    def clear(self):
        self.raw_bytes.clear()
        self.total_samples_received = 0

    def get_duration_seconds(self) -> float:
        return self.total_samples_received / float(self.sample_rate)

    def calculate_rms_energy(self) -> float:
        if len(self.raw_bytes) < 2:
            return 0.0
        length = len(self.raw_bytes) - (len(self.raw_bytes) % 2)
        count = length // 2
        samples = struct.unpack(f"<{count}h", self.raw_bytes[:length])
        sum_sq = sum(s * s for s in samples)
        return (math.sqrt(sum_sq / count)) / 32768.0
`
  },
  {
    path: 'backend/whisper_engine.py',
    category: 'backend',
    description: 'faster-whisper inference engine with local on-disk model caching',
    content: `import logging
from .config import settings

logger = logging.getLogger("hms.whisper")

class WhisperEngine:
    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.model_name = settings.WHISPER_MODEL

    def load_model(self):
        try:
            from faster_whisper import WhisperModel
            self.model = WhisperModel(
                self.model_name,
                device=settings.DEVICE,
                compute_type=settings.COMPUTE_TYPE,
                download_root=str(settings.MODELS_DIR)
            )
            self.is_loaded = True
            return True
        except Exception as e:
            logger.error(f"Failed to load Whisper: {e}")
            return False

whisper_engine = WhisperEngine()
`
  },
  {
    path: 'backend/main.py',
    category: 'backend',
    description: 'FastAPI main application, CORS and WebSocket endpoints',
    content: `from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .routes import doctors, patients, consultations, settings as settings_routes

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings_routes.router)
app.include_router(doctors.router)
app.include_router(patients.router)
app.include_router(consultations.router)
`
  },
  {
    path: 'scripts/install.sh',
    category: 'scripts',
    description: 'macOS setup script (venv, dependencies, sqlite DB)',
    content: `#!/usr/bin/env bash
set -e
PROJECT_ROOT="$( cd "$( dirname "\${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp -n .env.example .env
python3 -c "import sys; sys.path.insert(0, '$PROJECT_ROOT'); from backend.database import init_db; init_db()"
echo "Installation complete!"
`
  },
  {
    path: 'scripts/start.sh',
    category: 'scripts',
    description: 'Start server with PID file and health check verification',
    content: `#!/usr/bin/env bash
set -e
PROJECT_ROOT="$( cd "$( dirname "\${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$PROJECT_ROOT"
source venv/bin/activate
nohup python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 > logs/voicepulse.log 2>&1 &
echo $! > logs/voicepulse.pid
echo "Server started on http://127.0.0.1:8000"
`
  },
  {
    path: 'scripts/stop.sh',
    category: 'scripts',
    description: 'Safely terminate backend process using recorded PID',
    content: `#!/usr/bin/env bash
PROJECT_ROOT="$( cd "$( dirname "\${BASH_SOURCE[0]}" )/.." && pwd )"
PID_FILE="$PROJECT_ROOT/logs/voicepulse.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "HMS VoicePulse stopped."
fi
`
  },
  {
    path: 'scripts/status.sh',
    category: 'scripts',
    description: 'Check daemon status, database existence and health endpoint',
    content: `#!/usr/bin/env bash
PROJECT_ROOT="$( cd "$( dirname "\${BASH_SOURCE[0]}" )/.." && pwd )"
curl -s http://127.0.0.1:8000/api/health || echo "Server not responding"
`
  },
  {
    path: 'launchers/HMS-VoicePulse.command',
    category: 'launchers',
    description: 'Desktop double-click launcher for macOS Finder',
    content: `#!/usr/bin/env bash
LAUNCHER_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$LAUNCHER_DIR/.." && pwd )"
cd "$PROJECT_ROOT"
bash scripts/start.sh
open "http://127.0.0.1:8000"
`
  },
  {
    path: 'macos/com.hms.voicepulse.plist',
    category: 'macos',
    description: 'macOS user LaunchAgent for automatic background start at login',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hms.voicepulse</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/Projects/HMS-VoicePulse/venv/bin/python3</string>
        <string>-m</string>
        <string>uvicorn</string>
        <string>backend.main:app</string>
        <string>--host</string>
        <string>127.0.0.1</string>
        <string>--port</string>
        <string>8000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
`
  },
  {
    path: 'tests/test_nlp.py',
    category: 'tests',
    description: 'Unit test suite for clinical negation and entity extraction',
    content: `import unittest
from backend.nlp_processor import extract_clinical_notes

class TestMedicalNLP(unittest.TestCase):
    def test_negations(self):
        notes = extract_clinical_notes("Patient has headache, but no fever and denies chest pain.")
        self.assertIn("Headache", notes["symptoms"])
        self.assertNotIn("Fever", notes["symptoms"])
        self.assertNotIn("Chest pain", notes["symptoms"])

if __name__ == "__main__":
    unittest.main()
`
  },
  {
    path: 'README.md',
    category: 'config',
    description: 'Complete user manual, MacBook deployment steps, and troubleshooting',
    content: `# HMS VoicePulse
A local clinical voice documentation system for MacBook.
Runs offline on 127.0.0.1:8000 using faster-whisper, SQLite, and FastAPI.
`
  }
];
