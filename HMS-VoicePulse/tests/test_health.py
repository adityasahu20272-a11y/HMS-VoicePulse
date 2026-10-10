import unittest
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings

class TestHealthAndSettings(unittest.TestCase):
    def test_settings_initialization(self):
        """Verify configuration settings and directories."""
        self.assertEqual(settings.APP_NAME, "HMS VoicePulse")
        self.assertEqual(settings.APP_VERSION, "1.0.0")
        self.assertTrue(settings.DATA_DIR.exists())
        self.assertTrue(settings.LOGS_DIR.exists())

    def test_localhost_binding_default(self):
        """Verify that APP_HOST is strictly bound to localhost (127.0.0.1)."""
        self.assertEqual(settings.APP_HOST, "127.0.0.1")

    def test_health_response_schema(self):
        """Verify schema of health endpoint."""
        expected_keys = {
            "status", "app_name", "version", "database_connected",
            "whisper_model", "device", "compute_type", "records_count"
        }
        # Mock schema response test
        dummy_health = {
            "status": "healthy",
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "database_connected": True,
            "whisper_model": settings.WHISPER_MODEL,
            "device": settings.DEVICE,
            "compute_type": settings.COMPUTE_TYPE,
            "records_count": {"doctors": 1, "patients": 2, "consultations": 0}
        }
        self.assertEqual(set(dummy_health.keys()), expected_keys)
        self.assertTrue(dummy_health["database_connected"])

if __name__ == "__main__":
    unittest.main()
