import unittest
import sys
import os
import sqlite3
import tempfile
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Check if SQLAlchemy is installed
try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from backend.models import Base, Doctor, Patient, Consultation
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False

class TestDatabaseModels(unittest.TestCase):
    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_path = self.temp_db.name

        if HAS_SQLALCHEMY:
            self.db_url = f"sqlite:///{self.db_path}"
            self.engine = create_engine(self.db_url, connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=self.engine)
            self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            self.db = self.Session()
        else:
            # Fallback direct SQLite schema test
            self.conn = sqlite3.connect(self.db_path)
            self.conn.execute("PRAGMA foreign_keys = ON;")
            cursor = self.conn.cursor()
            cursor.execute("""
                CREATE TABLE doctors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctor_id VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    department VARCHAR(100) NOT NULL,
                    designation VARCHAR(100),
                    opd_room VARCHAR(50),
                    contact_number VARCHAR(50),
                    email VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id VARCHAR(50) UNIQUE NOT NULL,
                    full_name VARCHAR(100) NOT NULL,
                    age INTEGER,
                    dob VARCHAR(20),
                    gender VARCHAR(20),
                    contact_number VARCHAR(50),
                    address TEXT,
                    medical_history TEXT,
                    allergies TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE consultations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    consultation_id VARCHAR(50) UNIQUE NOT NULL,
                    patient_id VARCHAR(50) NOT NULL,
                    doctor_id VARCHAR(50) NOT NULL,
                    date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    transcript_original TEXT NOT NULL,
                    language VARCHAR(20) DEFAULT 'en',
                    clinical_notes_draft TEXT,
                    clinical_notes_verified TEXT,
                    doctor_notes_text TEXT,
                    status VARCHAR(30) DEFAULT 'draft',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
                    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
                );
            """)
            self.conn.commit()

    def tearDown(self):
        if HAS_SQLALCHEMY:
            self.db.close()
            self.engine.dispose()
        else:
            self.conn.close()

        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def test_doctor_creation_and_unique_constraint(self):
        """Test doctor creation and unique doctor_id constraint."""
        if HAS_SQLALCHEMY:
            doc1 = Doctor(doctor_id="DOC-901", name="Dr. Gregory House", department="Diagnostics")
            self.db.add(doc1)
            self.db.commit()

            queried = self.db.query(Doctor).filter(Doctor.doctor_id == "DOC-901").first()
            self.assertIsNotNone(queried)
            self.assertEqual(queried.name, "Dr. Gregory House")

            doc_dup = Doctor(doctor_id="DOC-901", name="Dr. Duplicate", department="General")
            self.db.add(doc_dup)
            with self.assertRaises(Exception):
                self.db.commit()
            self.db.rollback()
        else:
            cur = self.conn.cursor()
            cur.execute("INSERT INTO doctors (doctor_id, name, department) VALUES (?, ?, ?)", ("DOC-901", "Dr. Gregory House", "Diagnostics"))
            self.conn.commit()

            cur.execute("SELECT name FROM doctors WHERE doctor_id = ?", ("DOC-901",))
            row = cur.fetchone()
            self.assertEqual(row[0], "Dr. Gregory House")

            # Duplicate doctor_id must trigger IntegrityError
            with self.assertRaises(sqlite3.IntegrityError):
                cur.execute("INSERT INTO doctors (doctor_id, name, department) VALUES (?, ?, ?)", ("DOC-901", "Dr. Duplicate", "General"))
                self.conn.commit()

    def test_patient_creation_and_unique_constraint(self):
        """Test patient creation and unique patient_id constraint."""
        if HAS_SQLALCHEMY:
            pat1 = Patient(patient_id="PAT-2026-001", full_name="Alice Smith", allergies="Penicillin")
            self.db.add(pat1)
            self.db.commit()

            queried = self.db.query(Patient).filter(Patient.patient_id == "PAT-2026-001").first()
            self.assertIsNotNone(queried)
            self.assertEqual(queried.full_name, "Alice Smith")

            pat_dup = Patient(patient_id="PAT-2026-001", full_name="Duplicate Patient")
            self.db.add(pat_dup)
            with self.assertRaises(Exception):
                self.db.commit()
            self.db.rollback()
        else:
            cur = self.conn.cursor()
            cur.execute("INSERT INTO patients (patient_id, full_name, allergies) VALUES (?, ?, ?)", ("PAT-2026-001", "Alice Smith", "Penicillin"))
            self.conn.commit()

            cur.execute("SELECT full_name, allergies FROM patients WHERE patient_id = ?", ("PAT-2026-001",))
            row = cur.fetchone()
            self.assertEqual(row[0], "Alice Smith")
            self.assertEqual(row[1], "Penicillin")

            with self.assertRaises(sqlite3.IntegrityError):
                cur.execute("INSERT INTO patients (patient_id, full_name) VALUES (?, ?)", ("PAT-2026-001", "Duplicate"))
                self.conn.commit()

    def test_consultation_creation_and_transcript_integrity(self):
        """Test consultation relationship and that original transcript is never overwritten."""
        original_speech = "Patient has severe throat pain and mild fever since yesterday."
        draft_json = json.dumps({"chief_complaint": "Throat pain", "symptoms": ["Fever"]})
        verified_json = json.dumps({"chief_complaint": "Acute Pharyngitis", "symptoms": ["Throat pain", "Fever"]})

        if HAS_SQLALCHEMY:
            doc = Doctor(doctor_id="DOC-902", name="Dr. Allison Cameron", department="Immunology")
            pat = Patient(patient_id="PAT-2026-002", full_name="Bob Jones", age=45)
            self.db.add_all([doc, pat])
            self.db.commit()

            con = Consultation(
                consultation_id="CON-20260101-0001",
                patient_id="PAT-2026-002",
                doctor_id="DOC-902",
                transcript_original=original_speech,
                clinical_notes_draft=draft_json,
                status="draft"
            )
            self.db.add(con)
            self.db.commit()

            # Doctor verifies notes
            con.clinical_notes_verified = verified_json
            con.status = "verified"
            con.doctor_notes_text = "Rest, warm saline gargle."
            self.db.commit()

            saved_con = self.db.query(Consultation).filter(Consultation.consultation_id == "CON-20260101-0001").first()
            self.assertEqual(saved_con.status, "verified")
            self.assertEqual(saved_con.transcript_original, original_speech)
        else:
            cur = self.conn.cursor()
            cur.execute("INSERT INTO doctors (doctor_id, name, department) VALUES (?, ?, ?)", ("DOC-902", "Dr. Allison Cameron", "Immunology"))
            cur.execute("INSERT INTO patients (patient_id, full_name) VALUES (?, ?)", ("PAT-2026-002", "Bob Jones"))
            cur.execute("""
                INSERT INTO consultations (consultation_id, patient_id, doctor_id, transcript_original, clinical_notes_draft, status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, ("CON-20260101-0001", "PAT-2026-002", "DOC-902", original_speech, draft_json, "draft"))
            self.conn.commit()

            # Doctor updates verified notes
            cur.execute("""
                UPDATE consultations
                SET clinical_notes_verified = ?, status = 'verified', doctor_notes_text = 'Rest, warm saline gargle.'
                WHERE consultation_id = ?
            """, (verified_json, "CON-20260101-0001"))
            self.conn.commit()

            cur.execute("SELECT status, transcript_original, clinical_notes_verified FROM consultations WHERE consultation_id = ?", ("CON-20260101-0001",))
            row = cur.fetchone()
            self.assertEqual(row[0], "verified")
            # Raw transcript MUST remain untouched
            self.assertEqual(row[1], original_speech)
            self.assertIn("Acute Pharyngitis", row[2])

if __name__ == "__main__":
    unittest.main()
