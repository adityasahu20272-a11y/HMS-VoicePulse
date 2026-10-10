import unittest
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.nlp_processor import extract_clinical_notes

class TestMedicalNLPProcessor(unittest.TestCase):
    def test_empty_transcript_handling(self):
        """Empty transcript must return clean un-hallucinated schema."""
        notes = extract_clinical_notes("")
        self.assertIsNone(notes["chief_complaint"])
        self.assertEqual(notes["symptoms"], [])
        self.assertIsNone(notes["temperature"])
        self.assertIsNone(notes["symptom_duration"])
        self.assertEqual(notes["medicines_mentioned"], [])
        self.assertTrue(notes["needs_doctor_verification"])

    def test_symptoms_and_duration_extraction(self):
        """Extract stated symptoms and duration without inventing extra terms."""
        text = "Patient presents with severe headache and fever for 3 days."
        notes = extract_clinical_notes(text)

        self.assertIn("Headache", notes["symptoms"])
        self.assertIn("Fever", notes["symptoms"])
        self.assertIn("3 days", notes["symptom_duration"])
        self.assertTrue(notes["needs_doctor_verification"])

    def test_strict_negation_preservation(self):
        """Negated symptoms must NEVER be added as positive symptoms."""
        text = "Patient complains of fatigue and cough, but has no fever and denies chest pain."
        notes = extract_clinical_notes(text)

        # Positive symptoms
        self.assertIn("Fatigue", notes["symptoms"])
        self.assertIn("Cough", notes["symptoms"])

        # Negated symptoms MUST NOT be in symptoms list
        self.assertNotIn("Fever", notes["symptoms"])
        self.assertNotIn("Chest pain", notes["symptoms"])

        # Negations must be recorded in negations_recorded
        neg_text = " ".join(notes["negations_recorded"]).lower()
        self.assertTrue("fever" in neg_text or "chest pain" in neg_text)

    def test_temperature_extraction(self):
        """Body temperature must be extracted accurately if explicitly stated."""
        text = "Spoke with patient. Recorded body temperature is 101.5 F and pulse is 88 bpm."
        notes = extract_clinical_notes(text)

        self.assertEqual(notes["temperature"], "101.5°F")
        self.assertTrue(any("Pulse: 88" in obs for obs in notes["observations"]))

    def test_medication_dosage_frequency(self):
        """Extract explicit medicines, dosages, and frequencies."""
        text = "Taking paracetamol 500 mg twice a day after meals."
        notes = extract_clinical_notes(text)

        self.assertIn("Paracetamol", notes["medicines_mentioned"])
        self.assertEqual(notes["dosage"], "500 mg")
        self.assertTrue("twice a day" in notes["frequency"].lower())

    def test_allergies_and_nkda(self):
        """Test allergies vs explicit negation of allergies."""
        text1 = "Patient reports history of asthma and is allergic to penicillin."
        notes1 = extract_clinical_notes(text1)
        self.assertIn("Allergic to penicillin", notes1["allergies"])

        text2 = "Patient has no known drug allergies and denies nausea."
        notes2 = extract_clinical_notes(text2)
        self.assertEqual(notes2["allergies"], "No known drug allergies (NKDA)")

    def test_uncertainty_preservation(self):
        """Uncertain clinical expressions must be flagged."""
        text = "Patient has mild cough, suspected bronchitis, patient is unsure about chills."
        notes = extract_clinical_notes(text)
        self.assertTrue(len(notes["additional_details"]) > 0)
        self.assertTrue(any("suspected" in detail.lower() for detail in notes["additional_details"]))

if __name__ == "__main__":
    unittest.main()
