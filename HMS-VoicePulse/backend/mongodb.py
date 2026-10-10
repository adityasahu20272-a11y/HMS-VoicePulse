"""
HMS VoicePulse - MongoDB Database Integration
Provides asynchronous and synchronous MongoDB connection,
collection management, and schema helpers for Patients, Doctors, and Consultations.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("hms.mongodb")

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
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
        """Connect to local or remote MongoDB instance."""
        if not HAS_PYMONGO:
            logger.warning("pymongo is not installed. Run: pip install pymongo")
            return False

        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=2000)
            # Verify server is responding
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.is_connected = True
            logger.info(f"Connected to MongoDB database '{self.db_name}' at {self.uri}")
            self.ensure_indexes()
            return True
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.warning(f"Could not connect to MongoDB ({e}). Falling back to local SQLite.")
            self.is_connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected MongoDB connection error: {e}")
            self.is_connected = False
            return False

    def ensure_indexes(self):
        """Create unique indexes for patients, doctors, and consultations."""
        if not self.is_connected or self.db is None:
            return
        try:
            self.db.patients.create_index("patient_id", unique=True)
            self.db.doctors.create_index("doctor_id", unique=True)
            self.db.consultations.create_index("consultation_id", unique=True)
            self.db.consultations.create_index("patient_id")
            self.db.consultations.create_index("doctor_id")
        except Exception as e:
            logger.warning(f"Failed to create MongoDB indexes: {e}")

    # Patient CRUD
    def insert_patient(self, patient_data: Dict[str, Any]) -> bool:
        if not self.is_connected:
            return False
        try:
            doc = {**patient_data, "updated_at": datetime.utcnow()}
            if "created_at" not in doc:
                doc["created_at"] = datetime.utcnow()
            self.db.patients.update_one({"patient_id": doc["patient_id"]}, {"$set": doc}, upsert=True)
            return True
        except Exception as e:
            logger.error(f"MongoDB insert_patient error: {e}")
            return False

    def get_patients(self, query_str: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        try:
            filt = {}
            if query_str:
                filt = {
                    "$or": [
                        {"patient_id": {"$regex": query_str, "$options": "i"}},
                        {"full_name": {"$regex": query_str, "$options": "i"}}
                    ]
                }
            cursor = self.db.patients.find(filt, {"_id": 0}).sort("created_at", -1)
            return list(cursor)
        except Exception as e:
            logger.error(f"MongoDB get_patients error: {e}")
            return []

    # Doctor CRUD
    def insert_doctor(self, doctor_data: Dict[str, Any]) -> bool:
        if not self.is_connected:
            return False
        try:
            doc = {**doctor_data, "updated_at": datetime.utcnow()}
            if "created_at" not in doc:
                doc["created_at"] = datetime.utcnow()
            self.db.doctors.update_one({"doctor_id": doc["doctor_id"]}, {"$set": doc}, upsert=True)
            return True
        except Exception as e:
            logger.error(f"MongoDB insert_doctor error: {e}")
            return False

    def get_doctors(self) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        try:
            cursor = self.db.doctors.find({}, {"_id": 0}).sort("name", 1)
            return list(cursor)
        except Exception as e:
            logger.error(f"MongoDB get_doctors error: {e}")
            return []

    # Consultation History
    def insert_consultation(self, con_data: Dict[str, Any]) -> bool:
        if not self.is_connected:
            return False
        try:
            doc = {**con_data, "saved_at": datetime.utcnow()}
            self.db.consultations.update_one({"consultation_id": doc["consultation_id"]}, {"$set": doc}, upsert=True)
            return True
        except Exception as e:
            logger.error(f"MongoDB insert_consultation error: {e}")
            return False

    def get_consultations(self, patient_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.is_connected:
            return []
        try:
            filt = {"patient_id": patient_id} if patient_id else {}
            cursor = self.db.consultations.find(filt, {"_id": 0}).sort("date_time", -1)
            return list(cursor)
        except Exception as e:
            logger.error(f"MongoDB get_consultations error: {e}")
            return []

    def get_status(self) -> Dict[str, Any]:
        """Diagnostic stats for MongoDB connection."""
        if not self.is_connected or self.db is None:
            return {
                "connected": False,
                "uri": self.uri,
                "database": self.db_name,
                "status": "Offline / Using SQLite fallback"
            }
        try:
            return {
                "connected": True,
                "uri": self.uri,
                "database": self.db_name,
                "status": "Connected",
                "counts": {
                    "patients": self.db.patients.count_documents({}),
                    "doctors": self.db.doctors.count_documents({}),
                    "consultations": self.db.consultations.count_documents({})
                }
            }
        except Exception:
            return {"connected": False, "uri": self.uri, "database": self.db_name, "status": "Error"}

mongo_manager = MongoDBManager()
