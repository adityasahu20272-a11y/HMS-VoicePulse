"""
HMS VoicePulse - Medical NLP Processor
Extracts structured clinical information strictly from explicit speech transcripts.
Adheres to strict clinical safety rules:
- No fabricated symptoms, diagnoses, or prescriptions
- Preserves explicit negations ('no fever', 'denies chest pain')
- Preserves clinical uncertainty ('suspected', 'possibly')
- Flags drafts for mandatory doctor verification
"""

import re
from typing import Dict, Any, List, Optional

# Standard symptom terms to detect without hallucination
COMMON_SYMPTOMS = [
    "fever", "high temperature", "chills", "headache", "migraine", "dizziness", 
    "lightheadedness", "vertigo", "fatigue", "weakness", "lethargy", "nausea", 
    "vomiting", "abdominal pain", "stomach ache", "cramps", "diarrhea", 
    "constipation", "cough", "dry cough", "productive cough", "sore throat", 
    "pharyngitis", "shortness of breath", "dyspnea", "breathlessness", "chest pain", 
    "chest tightness", "palpitations", "wheezing", "rash", "itching", "swelling", 
    "edema", "joint pain", "back pain", "body ache", "body pain", "myalgia", "insomnia", 
    "loss of appetite", "weight loss", "sneezing", "runny nose", "congestion"
]

# Multilingual dictionary mapping for Tamil and Hindi terms to English
MULTILINGUAL_DICTIONARY = {
    # Hindi to English
    "बुखार": "fever", "bukhar": "fever", "तेज़ बुखार": "high fever", "tez bukhar": "high fever",
    "बदन दर्द": "body pain", "badan dard": "body pain", "दर्द": "pain", "dard": "pain",
    "सिरदर्द": "headache", "sirdard": "headache", "sir dard": "headache",
    "खांसी": "cough", "khansi": "cough", "सूखी खांसी": "dry cough",
    "जुकाम": "cold", "jukam": "cold", "zukam": "cold",
    "गले में दर्द": "sore throat", "gale me dard": "sore throat", "gale me kharash": "sore throat",
    "छाती में दर्द": "chest pain", "seene me dard": "chest pain",
    "सांस लेने में तकलीफ": "shortness of breath", "saans lene me takleef": "shortness of breath",
    "उल्टी": "vomiting", "ulti": "vomiting", "जी मिचलाना": "nausea",
    "चक्कर": "dizziness", "chakkar": "dizziness",
    "कमजोरी": "weakness", "kamzori": "weakness",
    "पेट दर्द": "abdominal pain", "pet dard": "abdominal pain",
    "दस्त": "diarrhea", "dast": "diarrhea",
    # Tamil to English
    "காய்ச்சல்": "fever", "kaichal": "fever", "juram": "fever", "கொதிக்கும் காய்ச்சல்": "high fever",
    "உடல் வலி": "body pain", "udal vali": "body pain", "வலி": "pain", "vali": "pain",
    "தலைவலி": "headache", "thalai vali": "headache", "thalaivali": "headache",
    "இருமல்": "cough", "irumal": "cough", "வறட்டு இருமல்": "dry cough",
    "சளி": "cold", "sali": "cold",
    "தொண்டை வலி": "sore throat", "thondai vali": "sore throat",
    "நெஞ்சு வலி": "chest pain", "nenju vali": "chest pain",
    "மூச்சுத் திணறல்": "shortness of breath", "moochu thinaral": "shortness of breath",
    "வாந்தி": "vomiting", "vaanthi": "vomiting",
    "மயக்கம்": "dizziness", "mayakkam": "dizziness",
    "சோர்வு": "fatigue", "sorvu": "fatigue",
    "வயிற்று வலி": "abdominal pain", "vayitru vali": "abdominal pain"
}

def translate_multilingual_transcript(text: str) -> Dict[str, Any]:
    """
    Translates spoken Tamil, Hindi or Hinglish/Tanglish terms into English.
    Returns: {"original_text": text, "translated_text": translated, "detected_language": lang}
    """
    if not text:
        return {"original_text": "", "translated_text": "", "detected_language": "en"}
    
    detected = "en"
    # Check for Tamil or Hindi unicode script or Romanized terms
    if re.search(r'[\u0B80-\u0BFF]', text) or any(t in text.lower() for t in ["kaichal", "udal vali", "thalai vali", "irumal"]):
        detected = "ta"
    elif re.search(r'[\u0900-\u097F]', text) or any(t in text.lower() for t in ["bukhar", "badan dard", "sirdard", "khansi"]):
        detected = "hi"
        
    translated = text
    for vernacular, eng in MULTILINGUAL_DICTIONARY.items():
        translated = re.sub(re.escape(vernacular), eng, translated, flags=re.IGNORECASE)
        
    return {
        "original_text": text,
        "translated_text": translated,
        "detected_language": detected
    }

def calculate_symptom_severity(transcript: str, symptoms: List[str], temperature: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Evaluates clinical severity for each symptom (Severe, Moderate, Mild).
    Rates each symptom on a 1-10 clinical triage scale so physicians can identify acute complaints.
    """
    lower = transcript.lower()
    severity_results = []
    
    # Severity indicator cues
    severe_cues = ["severe", "acute", "high", "extreme", "unbearable", "intense", "sharp", "கடுமையான", "ரொம்ப", "बहुत तेज़", "गंभीर", "असहनीय"]
    moderate_cues = ["moderate", "persistent", "medium", "considerable", "நடுத்தர", "मध्यम", "काफी"]
    mild_cues = ["mild", "slight", "low", "minimal", "bearable", "light", "லேசான", "थोड़ा", "हल्का"]
    
    # Check temperature impact
    temp_is_high = False
    if temperature:
        t_match = re.search(r'(\d+(?:\.\d+)?)', temperature)
        if t_match and float(t_match.group(1)) >= 102.0:
            temp_is_high = True

    for s in symptoms:
        s_lower = s.lower()
        score = 5 # Default moderate
        level = "Moderate"
        cues_found = []
        
        # Proximity search: 6 words around the symptom
        window_match = re.search(r'(?:\w+\s+){0,4}' + re.escape(s_lower) + r'(?:\s+\w+){0,4}', lower)
        context = window_match.group(0) if window_match else lower
        
        if any(c in context for c in severe_cues) or ("fever" in s_lower and temp_is_high) or "chest pain" in s_lower:
            score = 9 if ("chest pain" in s_lower or temp_is_high) else 8
            level = "Severe"
            cues_found.append("High acute intensity" if not temp_is_high else f"High grade ({temperature})")
        elif any(c in context for c in mild_cues):
            score = 3
            level = "Mild"
            cues_found.append("Low intensity / manageable")
        elif any(c in context for c in moderate_cues):
            score = 6
            level = "Moderate"
            cues_found.append("Persistent discomfort")
        else:
            # Baseline symptom clinical weight
            if "chest" in s_lower or "breath" in s_lower:
                score = 8
                level = "Severe"
            elif "fever" in s_lower:
                score = 7
                level = "Moderate"
            else:
                score = 5
                level = "Moderate"
                
        severity_results.append({
            "symptom": s,
            "severity_level": level,
            "severity_score": score,
            "note": ", ".join(cues_found) if cues_found else "Standard presentation"
        })
        
    # Sort from most severe (highest score) to least severe
    severity_results.sort(key=lambda x: x["severity_score"], reverse=True)
    return severity_results

# Common medications explicitly mentioned by patient/doctor
COMMON_MEDICATIONS = [
    "paracetamol", "acetaminophen", "ibuprofen", "advil", "tylenol", "aspirin",
    "amoxicillin", "augmentin", "azithromycin", "ciprofloxacin", "metformin",
    "lisinopril", "amlodipine", "losartan", "atorvastatin", "omeprazole",
    "pantoprazole", "cetirizine", "loratadine", "albuterol", "salbutamol",
    "prednisone", "doxycycline", "insulin", "antacid", "cough syrup"
]

# Negation prefixes
NEGATION_PATTERNS = [
    r"\bno\s+([a-zA-Z\s]+)",
    r"\bnot\s+experiencing\s+([a-zA-Z\s]+)",
    r"\bnot\s+having\s+([a-zA-Z\s]+)",
    r"\bdenies\s+([a-zA-Z\s]+)",
    r"\bwithout\s+([a-zA-Z\s]+)",
    r"\bnegative\s+for\s+([a-zA-Z\s]+)",
    r"\brules?\s+out\s+([a-zA-Z\s]+)",
    r"\bneither\s+([a-zA-Z\s]+)\s+nor\s+([a-zA-Z\s]+)"
]

def split_into_clauses(text: str) -> List[str]:
    """Split transcript into manageable clauses preserving context."""
    # Split on periods, semicolons, conjunctions like but, however, and comma
    clauses = re.split(r'[,;.\n]|(?:\s+(?:but|however|and|yet)\s+)', text, flags=re.IGNORECASE)
    return [c.strip() for c in clauses if c.strip()]

def extract_negations(text: str) -> List[str]:
    """Identify explicit negative findings to avoid counting them as symptoms."""
    negations = []
    lower_text = text.lower()
    
    # Specific targeted regexes
    patterns = [
        r'\b(?:no|denies|denied|without|negative for)\s+([a-zA-Z\s]{3,30}?)(?=[,.;]|\band\b|\bbut\b|$)',
        r'\b(?:no signs of|free of)\s+([a-zA-Z\s]{3,30}?)(?=[,.;]|\band\b|$)'
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, lower_text)
        for m in matches:
            negated_phrase = m.group(1).strip()
            # Clean up trailing words
            negated_phrase = re.sub(r'\s+(?:since|for|or|with).*$', '', negated_phrase).strip()
            if negated_phrase and len(negated_phrase) > 2:
                negations.append(f"No {negated_phrase}")
                
    return list(dict.fromkeys(negations))

def is_phrase_negated(phrase: str, full_text: str) -> bool:
    """Check if a specific symptom or term is inside a negated clause."""
    lower_text = full_text.lower()
    phrase_lower = phrase.lower()
    
    # Check window of 6 words before the phrase
    escaped = re.escape(phrase_lower)
    neg_check = re.search(r'\b(?:no|not|denies|denied|without|never|negative for)\s+(?:\w+\s+){0,3}' + escaped, lower_text)
    return neg_check is not None

def extract_temperature(text: str) -> Optional[str]:
    """Extract strictly stated body temperature."""
    # Example: 101.4 F, 99 degrees, temp is 102, 38.5 C
    patterns = [
        r'\b(?:temp(?:erature)?(?:\s+(?:is|was|recorded|of))?\s*)(\d{2,3}(?:\.\d)?)\s*(?:°?\s*[fFcC]|degrees|fahrenheit|celsius)?\b',
        r'\b(\d{2,3}(?:\.\d)?)\s*(?:°?\s*[fF]|degrees\s+fahrenheit|deg\s*f)\b',
        r'\b(3[6-9](?:\.\d)?|4[0-1](?:\.\d)?)\s*(?:°?\s*[cC]|degrees\s+celsius|deg\s*c)\b'
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            val = m.group(1)
            # Sanity check: fever range
            try:
                num = float(val)
                if 95.0 <= num <= 107.0:
                    return f"{num}°F"
                elif 35.0 <= num <= 42.0:
                    return f"{num}°C"
            except ValueError:
                pass
    return None

def extract_duration(text: str) -> Optional[str]:
    """Extract explicit symptom duration."""
    patterns = [
        r'\b(?:for|since|lasting|past|over the last|over the past)\s+(\d+\s*(?:days?|weeks?|months?|hours?)|yesterday|last night|several days|a few days|this morning|two days|three days)\b',
        r'\b(\d+\s*(?:day|week|month|hour)\s+history)\b',
        r'\bstarted\s+(yesterday|last night|this morning|\d+\s*(?:days?|weeks?)\s+ago)\b'
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None

def extract_observations(text: str) -> List[str]:
    """Extract explicitly stated vitals or physical examination findings."""
    observations = []
    
    # Blood Pressure (BP)
    bp_match = re.search(r'\b(?:bp|blood pressure)(?:\s+(?:is|was|of))?\s*(\d{2,3}\s*\/\s*\d{2,3})\b', text, re.IGNORECASE)
    if bp_match:
        observations.append(f"Blood Pressure: {bp_match.group(1).replace(' ', '')} mmHg")
        
    # Pulse / Heart Rate
    pulse_match = re.search(r'\b(?:pulse|heart rate|hr)(?:\s+(?:is|was|of))?\s*(\d{2,3})\s*(?:bpm|beats per minute)?\b', text, re.IGNORECASE)
    if pulse_match:
        observations.append(f"Pulse: {pulse_match.group(1)} bpm")
        
    # SpO2
    spo2_match = re.search(r'\b(?:spo2|oxygen saturation|o2 sat)(?:\s+(?:is|was|of))?\s*(\d{2,3})\s*%', text, re.IGNORECASE)
    if spo2_match:
        observations.append(f"SpO2: {spo2_match.group(1)}%")
        
    return observations

def extract_dosage_and_frequency(text: str) -> (Optional[str], Optional[str]):
    """Extract explicitly stated dosage and frequency."""
    dosage = None
    frequency = None
    
    # Dosage: 500 mg, 10 ml, 2 tablets, 1 g
    dose_match = re.search(r'\b(\d+(?:\.\d+)?\s*(?:mg|milligrams?|g|grams?|mcg|ml|tablets?|capsules?|puffs?))\b', text, re.IGNORECASE)
    if dose_match:
        dosage = dose_match.group(1)
        
    # Frequency: twice daily, once a day, every 8 hours, TDS, BD, PRN
    freq_patterns = [
        r'\b(twice\s+(?:a|per)\s+day|two\s+times\s+a\s+day|bid)\b',
        r'\b(once\s+(?:a|per)\s+day|one\s+time\s+a\s+day|daily|od)\b',
        r'\b(three\s+times\s+a\s+day|thrice\s+daily|tid)\b',
        r'\b(every\s+\d+\s+hours?)\b',
        r'\b(as\s+needed|prn|when\s+required)\b',
        r'\b(before\s+meals|after\s+meals|at\s+bedtime)\b'
    ]
    for pattern in freq_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            frequency = m.group(1).strip()
            break
            
    return dosage, frequency

def extract_medical_history(text: str) -> Optional[str]:
    """Extract explicitly mentioned past medical history."""
    patterns = [
        r'\b(?:history of|past medical history of|known case of|has|suffers from)\s+([a-zA-Z\s]{3,40}?)(?=[,.;]|\band\b|$)',
        r'\b(?:diabetic|hypertensive|asthmatic)\b'
    ]
    matches = []
    for pattern in patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            match_str = m.group(0).strip()
            matches.append(match_str)
    if matches:
        return ", ".join(dict.fromkeys(matches))
    return None

def extract_allergies(text: str) -> Optional[str]:
    """Extract allergies or explicit denial of allergies."""
    if re.search(r'\b(?:no known (?:drug )?allergies|nkda|denies allergies|no allergies)\b', text, re.IGNORECASE):
        return "No known drug allergies (NKDA)"
        
    m = re.search(r'\b(?:allergic to|allergy to)\s+([a-zA-Z\s]{3,30}?)(?=[,.;]|$)', text, re.IGNORECASE)
    if m:
        return f"Allergic to {m.group(1).strip()}"
        
    return None

def extract_clinical_notes(transcript: str) -> Dict[str, Any]:
    """
    Main extraction pipeline.
    Parses speech transcript into structured clinical schema.
    Guarantees no hallucination or unmentioned assumptions.
    """
    if not transcript or not transcript.strip():
        return {
            "chief_complaint": None,
            "symptoms": [],
            "symptom_duration": None,
            "temperature": None,
            "observations": [],
            "medicines_mentioned": [],
            "dosage": None,
            "frequency": None,
            "medical_history": None,
            "allergies": None,
            "negations_recorded": [],
            "additional_details": [],
            "needs_doctor_verification": True
        }

    raw_text = transcript.strip()
    lower_text = raw_text.lower()
    
    # 1. Negations extraction
    negations = extract_negations(raw_text)
    
    # 2. Symptoms extraction (excluding any that are explicitly negated)
    detected_symptoms = []
    for symptom in COMMON_SYMPTOMS:
        if re.search(r'\b' + re.escape(symptom) + r'\b', lower_text):
            if not is_phrase_negated(symptom, raw_text):
                detected_symptoms.append(symptom.capitalize())
    detected_symptoms = list(dict.fromkeys(detected_symptoms))
    
    # 3. Chief Complaint (derived from primary symptom or explicit complaint sentence)
    chief_complaint = None
    cc_match = re.search(r'\b(?:complaining of|came in for|reports?|presents? with|chief complaint(?: is)?)\s+([a-zA-Z\s]{3,40}?)(?=[,.;]|\bfor\b|\bsince\b|$)', raw_text, re.IGNORECASE)
    if cc_match:
        chief_complaint = cc_match.group(1).strip().capitalize()
    elif detected_symptoms:
        chief_complaint = detected_symptoms[0]
        
    # 4. Duration
    duration = extract_duration(raw_text)
    
    # 5. Temperature
    temperature = extract_temperature(raw_text)
    
    # 6. Observations (BP, Pulse, SpO2)
    observations = extract_observations(raw_text)
    
    # 7. Medicines mentioned
    medicines = []
    for med in COMMON_MEDICATIONS:
        if re.search(r'\b' + re.escape(med) + r'\b', lower_text):
            medicines.append(med.capitalize())
    medicines = list(dict.fromkeys(medicines))
    
    # 8. Dosage and frequency
    dosage, frequency = extract_dosage_and_frequency(raw_text)
    
    # 9. Past Medical History
    med_history = extract_medical_history(raw_text)
    
    # 10. Allergies
    allergies = extract_allergies(raw_text)
    
    # 11. Uncertainty and additional flags
    additional_details = []
    uncertainty_matches = re.findall(r'\b(?:suspected|possibly|likely|patient thinks|uncertain|doubtful|probable)\s+[a-zA-Z\s]{3,30}', raw_text, re.IGNORECASE)
    for u in uncertainty_matches:
        additional_details.append(f"Uncertainty noted: '{u.strip()}'")

    return {
        "chief_complaint": chief_complaint,
        "symptoms": detected_symptoms,
        "symptom_duration": duration,
        "temperature": temperature,
        "observations": observations,
        "medicines_mentioned": medicines,
        "dosage": dosage,
        "frequency": frequency,
        "medical_history": med_history,
        "allergies": allergies,
        "negations_recorded": negations,
        "additional_details": additional_details,
        "needs_doctor_verification": True
    }
