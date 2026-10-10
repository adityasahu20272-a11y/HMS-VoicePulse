import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  Mic,
  MicOff,
  Download,
  Terminal,
  FileCode,
  UserCheck,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Stethoscope,
  Sparkles,
  Database,
  BarChart3,
  X,
  Plus,
  Play,
  Square,
  Clock,
  Save,
  Edit3,
  Share2,
  Trash2,
  Server,
  RefreshCw,
  Languages,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  Activity,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { PROJECT_MANIFEST } from './projectFiles';
import {
  translateToEnglishAsync,
  translateToEnglishSync,
  translateToEnglish,
  calculateSymptomSeverities,
  detectLanguage,
  DEMO_PRESETS,
  SymptomSeverity,
  DemoPreset
} from './translator';
import EnterpriseHMSPortal from './EnterpriseHMSPortal';
import { exportPatientConsultationPDF } from './pdfGenerator';

// --- Types ---
export interface Doctor {
  _id?: string;
  doctor_id: string;
  name: string;
  department: string;
  designation: string;
  opd_room: string;
  contact: string;
}

export interface Patient {
  _id?: string;
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  contact: string;
  allergies: string;
  medical_history: string;
}

export interface ConsultationRecord {
  _id?: string;
  id_display: string; // e.g. #1, #2, #3
  consultation_id: string;
  patient_id: string;
  patient_name: string;
  patient_age: number;
  doctor_id: string;
  doctor_name: string;
  date_time: string;
  raw_transcript: string; // Spoken transcript (Hindi/Tamil/English)
  spoken_language?: 'English' | 'Hindi' | 'Tamil';
  english_translation?: string; // Converted English transcript
  symptoms: string[];
  symptom_severities?: SymptomSeverity[];
  duration: string;
  temperatures: string[];
  medicines: string[];
  clinical_summary: string;
  verified_content: string;
  language: string;
  status: 'verified' | 'draft';
  saved_to_mongo: boolean;
}

// Initial Doctors
const INITIAL_DOCTORS: Doctor[] = [
  {
    _id: '6706e1a1b8912d001',
    doctor_id: 'DR-101',
    name: 'Dr. R. Natarajan',
    department: 'General Medicine',
    designation: 'Senior Physician & Professor',
    opd_room: 'OPD 3',
    contact: '+91-98401-22345'
  },
  {
    _id: '6706e1a1b8912d002',
    doctor_id: 'DR-102',
    name: 'Dr. Sarah Mitchell',
    department: 'Internal Medicine',
    designation: 'Consultant Physician',
    opd_room: 'OPD 1',
    contact: '+91-98401-88712'
  },
  {
    _id: '6706e1a1b8912d003',
    doctor_id: 'DR-103',
    name: 'Dr. Rajesh Patel',
    department: 'Cardiology',
    designation: 'Consultant Cardiologist',
    opd_room: 'OPD 4B',
    contact: '+91-98401-55421'
  }
];

// Initial Patients
const INITIAL_PATIENTS: Patient[] = [
  {
    _id: '6706e2a1c8912d001',
    patient_id: 'PAT-0006',
    full_name: 'garv Nijhawan',
    age: 19,
    gender: 'Male',
    contact: '+91-98112-34567',
    allergies: 'None recorded',
    medical_history: 'No chronic illness reported'
  },
  {
    _id: '6706e2a1c8912d002',
    patient_id: 'PAT-0001',
    full_name: 'Aarav Sharma',
    age: 34,
    gender: 'Male',
    contact: '+91-98234-56789',
    allergies: 'Penicillin',
    medical_history: 'Mild asthma'
  },
  {
    _id: '6706e2a1c8912d003',
    patient_id: 'PAT-0002',
    full_name: 'Ananya Roy',
    age: 27,
    gender: 'Female',
    contact: '+91-98345-67890',
    allergies: 'Sulfa drugs',
    medical_history: 'Seasonal allergic rhinitis'
  },
  {
    _id: '6706e2a1c8912d004',
    patient_id: 'PAT-0003',
    full_name: 'K. Ramesh',
    age: 58,
    gender: 'Male',
    contact: '+91-98456-78901',
    allergies: 'None',
    medical_history: 'Type 2 Diabetes, Hypertension'
  },
  {
    _id: '6706e2a1c8912d005',
    patient_id: 'PAT-0004',
    full_name: 'Priya Sundaram',
    age: 14,
    gender: 'Female',
    contact: '+91-98567-89012',
    allergies: 'Peanuts',
    medical_history: 'Pediatric checkup'
  },
  {
    _id: '6706e2a1c8912d006',
    patient_id: 'PAT-0005',
    full_name: 'Major S. Venkat',
    age: 72,
    gender: 'Male',
    contact: '+91-98678-90123',
    allergies: 'None recorded',
    medical_history: 'Osteoarthritis, benign prostatic hyperplasia'
  }
];

// Initial Consultations
const INITIAL_CONSULTATIONS: ConsultationRecord[] = [
  {
    _id: '6706e3a1d8912d003',
    id_display: '#3',
    consultation_id: 'CON-20261009-0003',
    patient_id: 'PAT-0006',
    patient_name: 'garv Nijhawan',
    patient_age: 19,
    doctor_id: 'DR-101',
    doctor_name: 'Dr. R. Natarajan',
    date_time: '09/10/2026, 12:47:36',
    raw_transcript: 'A patient have fever and body pain. Also the body temperature is 103 Fahrenheit.',
    spoken_language: 'English',
    english_translation: 'Patient presents with fever and severe body pain. Recorded body temperature is 103 Fahrenheit.',
    symptoms: ['Fever', 'Body pain'],
    symptom_severities: [
      { symptom: 'Fever', severity: 'Severe', score: 9, detectedCue: '103°F febrile threshold' },
      { symptom: 'Body pain', severity: 'Moderate', score: 7, detectedCue: 'Systemic discomfort' }
    ],
    duration: 'None detected',
    temperatures: ['103 Fahrenheit', '103°F'],
    medicines: [],
    clinical_summary: 'CLINICAL NOTES (AI-EXTRACTED)\n========================================\nSymptoms & Severity:\n• Fever: SEVERE (9/10)\n• Body pain: MODERATE (7/10)\nTemperature:\n• 103 Fahrenheit\n• 103°F',
    verified_content: 'Temperature:\n• 103 Fahrenheit\n• 103°F\n\nSymptoms & Severity Assessment (Ranked by Intensity):\n• Fever: SEVERE (9/10) [Primary concern]\n• Body pain: MODERATE (7/10)\n\n------------------------------------\nVERIFICATION NOTICE:\nPlease verify all extracted fields above prior to saving to patient record.',
    language: 'English',
    status: 'verified',
    saved_to_mongo: true
  },
  {
    _id: '6706e3a1d8912d002',
    id_display: '#2',
    consultation_id: 'CON-20261009-0002',
    patient_id: 'PAT-0006',
    patient_name: 'garv Nijhawan',
    patient_age: 19,
    doctor_id: 'DR-101',
    doctor_name: 'Dr. R. Natarajan',
    date_time: '09/10/2026, 12:47:01',
    raw_transcript: 'मरीज को 2 दिन से तेज बुखार और सिरदर्द है। पैरासिटामोल 650mg दें।',
    spoken_language: 'Hindi',
    english_translation: 'Patient has severe fever and headache for 2 days. Prescribe Paracetamol 650mg.',
    symptoms: ['Fever', 'Headache'],
    symptom_severities: [
      { symptom: 'Fever', severity: 'Severe', score: 9, detectedCue: 'High-grade fever (तेज बुखार)' },
      { symptom: 'Headache', severity: 'Moderate', score: 6, detectedCue: 'Secondary presentation' }
    ],
    duration: '2 days',
    temperatures: ['101°F'],
    medicines: ['Paracetamol 650mg'],
    clinical_summary: 'CLINICAL NOTES (AI-EXTRACTED)\n========================================\nLanguage Converted: Hindi -> English\nSymptoms:\n• Fever: SEVERE (9/10)\n• Headache: MODERATE (6/10)\nPrescription:\n• Paracetamol 650mg',
    verified_content: 'Spoken Language: Hindi (Converted to English)\nTemperature: 101°F\nSymptoms: Fever (Severe), Headache (Moderate)\nDuration: 2 days\nMedicines: Paracetamol 650mg',
    language: 'Hindi',
    status: 'verified',
    saved_to_mongo: true
  },
  {
    _id: '6706e3a1d8912d001',
    id_display: '#1',
    consultation_id: 'CON-20261007-0001',
    patient_id: 'PAT-0001',
    patient_name: 'Aarav Sharma',
    patient_age: 34,
    doctor_id: 'DR-101',
    doctor_name: 'Dr. R. Natarajan',
    date_time: '07/10/2026, 14:28:40',
    raw_transcript: 'Patient has mild throat pain, dry cough, and headache for 2 days. No fever reported.',
    spoken_language: 'English',
    english_translation: 'Patient has mild throat pain, dry cough, and headache for 2 days. No fever reported.',
    symptoms: ['Throat pain', 'Cough', 'Headache'],
    symptom_severities: [
      { symptom: 'Headache', severity: 'Moderate', score: 6, detectedCue: 'Persistent tension' },
      { symptom: 'Cough', severity: 'Mild', score: 3, detectedCue: 'Upper respiratory' },
      { symptom: 'Throat pain', severity: 'Mild', score: 3, detectedCue: 'Mild pharyngitis' }
    ],
    duration: '2 days',
    temperatures: [],
    medicines: ['Cetirizine'],
    clinical_summary: 'CLINICAL NOTES (AI-EXTRACTED)\n========================================\nSymptoms:\n• Headache: MODERATE (6/10)\n• Cough: MILD (3/10)\n• Throat pain: MILD (3/10)',
    verified_content: 'Symptoms: Throat pain, Cough, Headache\nDuration: 2 days\nAllergies noted: Penicillin\nAdvice: Warm gargle and hydration',
    language: 'English',
    status: 'verified',
    saved_to_mongo: true
  }
];

export default function App() {
  // Top-level View Mode: 'voicepulse' (current interface) or 'enterprise_portal' (image-inspired portal)
  const [viewMode, setViewMode] = useState<'voicepulse' | 'enterprise_portal'>('voicepulse');

  // Navigation tabs in VoicePulse
  const [activeTab, setActiveTab] = useState<'consultation' | 'patients' | 'doctors' | 'history'>('consultation');

  // Local state with localStorage persistence (MongoDB Mirror)
  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = localStorage.getItem('hms_doctors');
    return saved ? JSON.parse(saved) : INITIAL_DOCTORS;
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('hms_patients');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [consultations, setConsultations] = useState<ConsultationRecord[]>(() => {
    const saved = localStorage.getItem('hms_consultations');
    return saved ? JSON.parse(saved) : INITIAL_CONSULTATIONS;
  });

  const [activeDoctorId, setActiveDoctorId] = useState<string>('DR-101');
  const [activePatientId, setActivePatientId] = useState<string>('PAT-0006');
  
  // Spoken Language Selector (English, Hindi, Tamil, Telugu, Bengali, Auto Detect)
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Auto Detect'>('English');

  // Spoken Transcript (Original Language)
  const [transcript, setTranscript] = useState<string>('A patient have fever and body pain. Also the body temperature is 103 Fahrenheit.');
  
  // English Translated Transcript
  const [englishTranscript, setEnglishTranscript] = useState<string>('Patient presents with fever and body pain. Recorded body temperature is 103 Fahrenheit.');
  const [detectedSpokenLang, setDetectedSpokenLang] = useState<string>('English');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [micState, setMicState] = useState<'idle' | 'listening' | 'unavailable'>('idle');
  const [wordsCount, setWordsCount] = useState<number>(14);
  const [isNotesVerified, setIsNotesVerified] = useState<boolean>(false);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [micToastMessage, setMicToastMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Structured Notes State & Severity
  const [symptoms, setSymptoms] = useState<string[]>(['Fever', 'Body pain']);
  const [symptomSeverities, setSymptomSeverities] = useState<SymptomSeverity[]>([
    { symptom: 'Fever', severity: 'Severe', score: 9, detectedCue: '103°F febrile threshold' },
    { symptom: 'Body pain', severity: 'Moderate', score: 7, detectedCue: 'Systemic discomfort' }
  ]);
  const [duration, setDuration] = useState<string>('');
  const [temperatures, setTemperatures] = useState<string[]>(['103 Fahrenheit', '103°F']);
  const [medicines, setMedicines] = useState<string[]>([]);
  const [verifiedContent, setVerifiedContent] = useState<string>(
    `Temperature:\n• 103 Fahrenheit\n• 103°F\n\nSymptoms & Severity Assessment (Ranked by Intensity):\n• Fever: SEVERE (Score 9/10) [Primary concern]\n• Body pain: MODERATE (Score 7/10)\n\n------------------------------------\nVERIFICATION NOTICE:\nPlease verify all extracted fields above prior to saving to patient record.`
  );

  // Modals State
  const [showConsultationsModal, setShowConsultationsModal] = useState<boolean>(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [showNewDoctorModal, setShowNewDoctorModal] = useState<boolean>(false);
  const [showMongoModal, setShowMongoModal] = useState<boolean>(false);
  const [showAgeChartModal, setShowAgeChartModal] = useState<boolean>(false);

  // New Patient Form
  const [newPatientId, setNewPatientId] = useState<string>('');
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientAge, setNewPatientAge] = useState<number>(25);
  const [newPatientGender, setNewPatientGender] = useState<string>('Male');
  const [newPatientContact, setNewPatientContact] = useState<string>('');
  const [newPatientAllergies, setNewPatientAllergies] = useState<string>('None');
  const [newPatientHistory, setNewPatientHistory] = useState<string>('None');

  // New Doctor Form
  const [newDoctorId, setNewDoctorId] = useState<string>('');
  const [newDoctorName, setNewDoctorName] = useState<string>('');
  const [newDoctorDept, setNewDoctorDept] = useState<string>('General Medicine');
  const [newDoctorDesignation, setNewDoctorDesignation] = useState<string>('Physician');
  const [newDoctorOpd, setNewDoctorOpd] = useState<string>('OPD 2');
  const [newDoctorContact, setNewDoctorContact] = useState<string>('');

  // Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Save changes to localStorage (MongoDB mirror)
  useEffect(() => {
    localStorage.setItem('hms_doctors', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('hms_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('hms_consultations', JSON.stringify(consultations));
  }, [consultations]);

  // Active Doctor & Patient
  const activeDoctor = doctors.find(d => d.doctor_id === activeDoctorId) || doctors[0];
  const activePatient = patients.find(p => p.patient_id === activePatientId) || patients[0];

  // Update words count
  useEffect(() => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      setWordsCount(0);
    } else {
      setWordsCount(trimmed.split(/\s+/).length);
    }
  }, [transcript]);

  // Real-time automatic translation when transcript or language changes
  useEffect(() => {
    if (!transcript.trim()) {
      setEnglishTranscript('');
      setIsTranslating(false);
      return;
    }

    // 1. Instant sync dictionary translation for immediate UI feedback
    const syncRes = translateToEnglishSync(transcript, selectedLanguage);
    setEnglishTranscript(syncRes.translatedText);
    setDetectedSpokenLang(syncRes.detectedLang);

    // 2. If it is Hindi, Tamil, Telugu, Bengali, or non-English, trigger Neural async translation with debounce
    if (syncRes.detectedLang !== 'English' || selectedLanguage !== 'English') {
      setIsTranslating(true);
      const timer = setTimeout(async () => {
        try {
          const asyncRes = await translateToEnglishAsync(transcript, selectedLanguage);
          if (asyncRes.translatedText) {
            setEnglishTranscript(asyncRes.translatedText);
            setDetectedSpokenLang(asyncRes.detectedLang);
          }
        } catch (e) {
          console.warn('Async translation error:', e);
        } finally {
          setIsTranslating(false);
        }
      }, 250);

      return () => clearTimeout(timer);
    } else {
      setIsTranslating(false);
    }
  }, [transcript, selectedLanguage]);

  // Audio Visualizer Loop
  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (micState === 'listening' && analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    } else {
      // Baseline flat line
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawVisualizer();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [micState]);

  // Microphone Activation with Language Support (English, Hindi, Tamil)
  const startListening = async () => {
    setMicToastMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // Web Speech API for speech-to-text with Tamil, Hindi, and English
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;

        if (selectedLanguage === 'Hindi') {
          rec.lang = 'hi-IN';
        } else if (selectedLanguage === 'Tamil') {
          rec.lang = 'ta-IN';
        } else if (selectedLanguage === 'Telugu') {
          rec.lang = 'te-IN';
        } else if (selectedLanguage === 'Bengali') {
          rec.lang = 'bn-IN';
        } else {
          rec.lang = 'en-IN';
        }

        rec.onresult = (e: any) => {
          let current = '';
          for (let i = 0; i < e.results.length; i++) {
            current += e.results[i][0].transcript + ' ';
          }
          if (current.trim()) {
            setTranscript(current.trim());
          }
        };

        rec.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err.error);
        };

        rec.start();
        speechRecognitionRef.current = rec;
      }

      setIsRecording(true);
      setMicState('listening');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setMicState('unavailable');
      setIsRecording(false);
      setMicToastMessage('Microphone access denied or audio device not found.');
      setTimeout(() => setMicToastMessage(null), 5000);
    }
  };

  const stopListening = () => {
    setIsRecording(false);
    setMicState('idle');

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  // Load a demo preset (Hindi, Tamil, Telugu, English)
  const loadDemoPreset = async (preset: DemoPreset) => {
    setTranscript(preset.spokenTranscript);
    setSelectedLanguage(preset.lang as any);
    const syncRes = translateToEnglishSync(preset.spokenTranscript, preset.lang as any);
    setEnglishTranscript(syncRes.translatedText);
    setDetectedSpokenLang(preset.lang);

    setIsTranslating(true);
    try {
      const asyncRes = await translateToEnglishAsync(preset.spokenTranscript, preset.lang as any);
      setEnglishTranscript(asyncRes.translatedText);
      setDetectedSpokenLang(asyncRes.detectedLang);
    } catch (e) {
      console.warn('Demo translation error:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Manual Trigger for Translation to English
  const triggerManualTranslation = async () => {
    if (!transcript.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateToEnglishAsync(transcript, selectedLanguage);
      setEnglishTranscript(res.translatedText);
      setDetectedSpokenLang(res.detectedLang);
    } catch (e) {
      console.warn('Manual translation failed:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Generate Clinical Notes (With Translation to English and Symptom Severity Rating)
  const generateClinicalNotes = async () => {
    let textInEnglish = englishTranscript;
    if (!textInEnglish || textInEnglish.trim() === '' || isTranslating) {
      setIsTranslating(true);
      const translation = await translateToEnglishAsync(transcript, selectedLanguage);
      textInEnglish = translation.translatedText || transcript;
      setEnglishTranscript(textInEnglish);
      setIsTranslating(false);
    }
    const raw = textInEnglish.toLowerCase();

    // Detect Symptoms
    const symptomKeywords: { [key: string]: string } = {
      'body pain': 'Body pain',
      'body ache': 'Body pain',
      'myalgia': 'Body pain',
      'fever': 'Fever',
      'headache': 'Headache',
      'chills': 'Chills',
      'cough': 'Cough',
      'cold': 'Cold',
      'throat pain': 'Sore throat',
      'sore throat': 'Sore throat',
      'nausea': 'Nausea',
      'vomiting': 'Vomiting',
      'chest pain': 'Chest pain',
      'dizziness': 'Dizziness',
      'vertigo': 'Dizziness',
      'abdominal pain': 'Abdominal pain',
      'stomach pain': 'Abdominal pain',
      'shortness of breath': 'Shortness of breath',
      'dyspnea': 'Shortness of breath',
      'fatigue': 'Fatigue / Weakness',
      'weakness': 'Fatigue / Weakness',
      'diarrhea': 'Diarrhea / Loose stools',
      'loose stools': 'Diarrhea / Loose stools'
    };

    const foundSymptoms: string[] = [];
    Object.keys(symptomKeywords).forEach(k => {
      if (raw.includes(k) && !foundSymptoms.includes(symptomKeywords[k])) {
        foundSymptoms.push(symptomKeywords[k]);
      }
    });

    const finalSymptoms = foundSymptoms.length > 0 ? foundSymptoms : ['None detected'];
    setSymptoms(finalSymptoms);

    // Compute Symptom Severity Rating ("who is more or less")
    const severities = calculateSymptomSeverities(finalSymptoms, textInEnglish);
    setSymptomSeverities(severities);

    // Detect Temperature
    const temps: string[] = [];
    const tempFahr = (transcript + ' ' + textInEnglish).match(/\b(?:10[0-6]|9[6-9])(?:\.\d)?\s*(?:fahrenheit|f|°f|degrees)?\b/gi);
    if (tempFahr) {
      tempFahr.forEach(t => {
        const clean = t.trim();
        if (!temps.includes(clean)) temps.push(clean);
        const num = clean.match(/\d+(\.\d+)?/);
        if (num && !temps.includes(`${num[0]}°F`)) {
          temps.push(`${num[0]}°F`);
        }
      });
    }
    setTemperatures(temps);

    // Detect Duration
    let dur = '';
    const durMatch = raw.match(/\b(?:for|since|past)\s+(\d+\s*(?:days?|weeks?|months?|hours?)|yesterday|last night)\b/i);
    if (durMatch) dur = durMatch[1];
    setDuration(dur || 'None detected');

    // Detect Medicines & Prescriptions
    const medDict = [
      'paracetamol', 'crocin', 'dolo', 'ibuprofen', 'amoxicillin',
      'azithromycin', 'cetirizine', 'pantoprazole', 'ors'
    ];
    const foundMeds: string[] = [];
    medDict.forEach(m => {
      if (raw.includes(m)) {
        const doseRegex = new RegExp(`(${m}(?:\\s*\\d+(?:mg)?)?(?:\\s*[^,\\.\\n]{0,35})?)`, 'i');
        const match = textInEnglish.match(doseRegex);
        if (match && match[1]) {
          const cap = match[1].charAt(0).toUpperCase() + match[1].slice(1).trim();
          if (!foundMeds.includes(cap)) foundMeds.push(cap);
        } else {
          const simpleCap = m.charAt(0).toUpperCase() + m.slice(1);
          if (!foundMeds.includes(simpleCap)) foundMeds.push(simpleCap);
        }
      }
    });

    const syncRes = translateToEnglishSync(textInEnglish, selectedLanguage);
    if (syncRes.prescriptions && syncRes.prescriptions.length > 0) {
      syncRes.prescriptions.forEach((p: string) => {
        if (!foundMeds.includes(p)) foundMeds.push(p);
      });
    }
    setMedicines(foundMeds);

    // Formatted Verified Note Content
    let content = '';
    if (detectedSpokenLang !== 'English' || transcript.trim() !== textInEnglish.trim()) {
      content += `ORIGINAL SPOKEN LANGUAGE: ${detectedSpokenLang}\n`;
      content += `ORIGINAL TRANSCRIPT: "${transcript}"\n`;
      content += `CONVERTED CLINICAL ENGLISH: "${textInEnglish}"\n\n`;
    }

    if (temps.length > 0) {
      content += 'Temperature:\n' + temps.map(t => `• ${t}`).join('\n') + '\n\n';
    }

    if (severities.length > 0) {
      content += 'Symptoms & Severity Assessment (Ranked by Intensity):\n';
      severities.forEach((s, idx) => {
        const rankLabel = idx === 0 ? ' [Primary concern / Highest severity]' : '';
        content += `• #${idx + 1} ${s.symptom}: ${s.severity.toUpperCase()} (Score ${s.score}/10)${rankLabel} — ${s.detectedCue}\n`;
      });
      content += '\n';
    } else if (foundSymptoms.length > 0) {
      content += 'Symptoms:\n' + foundSymptoms.map(s => `• ${s}`).join('\n') + '\n\n';
    }

    if (dur) {
      content += `Duration:\n• ${dur}\n\n`;
    }

    if (foundMeds.length > 0) {
      content += 'Prescriptions / Medicines Stated:\n' + foundMeds.map(m => `• ${m}`).join('\n') + '\n\n';
    }

    content += '------------------------------------\nVERIFICATION NOTICE:\nPlease verify all extracted fields above prior to saving to patient record.';
    setVerifiedContent(content);
    setIsNotesVerified(false);
  };

  // Update a symptom's severity level interactively (doctor override)
  const updateSymptomSeverityLevel = (symptomName: string, newLevel: 'Severe' | 'Moderate' | 'Mild') => {
    const updated = symptomSeverities.map(s => {
      if (s.symptom === symptomName) {
        const newScore = newLevel === 'Severe' ? 9 : newLevel === 'Moderate' ? 6 : 3;
        return { ...s, severity: newLevel, score: newScore, detectedCue: 'Doctor adjusted' };
      }
      return s;
    }).sort((a, b) => b.score - a.score);

    setSymptomSeverities(updated);

    let updatedText = verifiedContent;
    updated.forEach((s, idx) => {
      const reg = new RegExp(`• (?:#\\d+ )?${s.symptom}: [^\\n]+`, 'i');
      const rankLabel = idx === 0 ? ' [Primary concern / Highest severity]' : '';
      const replacement = `• #${idx + 1} ${s.symptom}: ${s.severity.toUpperCase()} (Score ${s.score}/10)${rankLabel} — ${s.detectedCue}`;
      if (reg.test(updatedText)) {
        updatedText = updatedText.replace(reg, replacement);
      }
    });
    setVerifiedContent(updatedText);
  };

  // Save to MongoDB & State
  const saveClinicalNotesToDatabase = () => {
    if (!isNotesVerified) {
      alert('Please check the verification box before saving to the medical record.');
      return;
    }

    const nextIdNum = consultations.length + 1;
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newRecord: ConsultationRecord = {
      _id: `6706e3a1d8912d00${nextIdNum}`,
      id_display: `#${nextIdNum}`,
      consultation_id: `CON-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(nextIdNum).padStart(4, '0')}`,
      patient_id: activePatient.patient_id,
      patient_name: activePatient.full_name,
      patient_age: activePatient.age,
      doctor_id: activeDoctor.doctor_id,
      doctor_name: activeDoctor.name,
      date_time: dateFormatted,
      raw_transcript: transcript,
      spoken_language: (selectedLanguage === 'Auto Detect' ? detectedSpokenLang : selectedLanguage) as any,
      english_translation: englishTranscript,
      symptoms: symptoms.filter(s => s !== 'None detected'),
      symptom_severities: symptomSeverities,
      duration: duration !== 'None detected' ? duration : '',
      temperatures: temperatures,
      medicines: medicines,
      clinical_summary: `CLINICAL NOTES (AI-EXTRACTED)\n========================================\nLanguage: ${selectedLanguage}\nSymptoms & Severity:\n${symptomSeverities.map(s => `• ${s.symptom}: ${s.severity} (${s.score}/10)`).join('\n')}\nPrescriptions:\n${medicines.length > 0 ? medicines.map(m => `• ${m}`).join('\n') : '• None'}`,
      verified_content: verifiedContent,
      language: selectedLanguage,
      status: 'verified',
      saved_to_mongo: true
    };

    setConsultations([newRecord, ...consultations]);
    alert(`Clinical consultation #${nextIdNum} successfully saved to MongoDB database under collection 'consultations'.`);
  };

  // Add New Patient Handler
  const handleAddNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      alert('Patient full name is required.');
      return;
    }

    const finalPatientId = newPatientId.trim() || `PAT-${String(patients.length + 1).padStart(4, '0')}`;
    const newPat: Patient = {
      _id: `6706e2a1c8912d00${patients.length + 1}`,
      patient_id: finalPatientId,
      full_name: newPatientName.trim(),
      age: Number(newPatientAge) || 20,
      gender: newPatientGender,
      contact: newPatientContact.trim() || '+91-98000-00000',
      allergies: newPatientAllergies.trim() || 'None',
      medical_history: newPatientHistory.trim() || 'None'
    };

    setPatients([newPat, ...patients]);
    setActivePatientId(finalPatientId);
    setShowNewPatientModal(false);

    // Reset Form
    setNewPatientId('');
    setNewPatientName('');
    setNewPatientAge(25);
    setNewPatientContact('');
    setNewPatientAllergies('None');
    setNewPatientHistory('None');
  };

  // Add New Doctor Handler
  const handleAddNewDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName.trim()) {
      alert('Doctor full name is required.');
      return;
    }

    const finalDocId = newDoctorId.trim() || `DR-${String(doctors.length + 101)}`;
    const newDoc: Doctor = {
      _id: `6706e1a1b8912d00${doctors.length + 1}`,
      doctor_id: finalDocId,
      name: newDoctorName.startsWith('Dr.') ? newDoctorName.trim() : `Dr. ${newDoctorName.trim()}`,
      department: newDoctorDept.trim(),
      designation: newDoctorDesignation.trim(),
      opd_room: newDoctorOpd.trim(),
      contact: newDoctorContact.trim() || '+91-98000-11111'
    };

    setDoctors([...doctors, newDoc]);
    setActiveDoctorId(finalDocId);
    setShowNewDoctorModal(false);

    // Reset Form
    setNewDoctorId('');
    setNewDoctorName('');
    setNewDoctorDept('General Medicine');
    setNewDoctorDesignation('Physician');
    setNewDoctorOpd('OPD 2');
    setNewDoctorContact('');
  };

  // Copy transcript
  const copyTranscript = () => {
    navigator.clipboard.writeText(englishTranscript || transcript);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Download Patients list to CSV (User Request)
  const downloadPatientsCSV = () => {
    if (!patients || patients.length === 0) {
      alert('No patient records found in MongoDB.');
      return;
    }

    const headers = ['Patient ID', 'Full Name', 'Age', 'Gender', 'Contact', 'Allergies', 'Medical History'];
    const rows = patients.map(p => [
      `"${(p.patient_id || '').replace(/"/g, '""')}"`,
      `"${(p.full_name || '').replace(/"/g, '""')}"`,
      p.age ?? '',
      `"${(p.gender || '').replace(/"/g, '""')}"`,
      `"${(p.contact || '').replace(/"/g, '""')}"`,
      `"${(p.allergies || '').replace(/"/g, '""')}"`,
      `"${(p.medical_history || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hms_patients_mongodb_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Complete Project ZIP
  const exportProjectZip = async () => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('HMS-VoicePulse');
      PROJECT_MANIFEST.forEach(f => {
        folder?.file(f.path, f.content);
      });
      folder?.file('data/.gitkeep', '');
      folder?.file('logs/.gitkeep', '');

      const mongoExport = {
        database: 'hms_voicepulse',
        exported_at: new Date().toISOString(),
        collections: {
          patients,
          doctors,
          consultations
        }
      };
      folder?.file('data/mongodb_seed.json', JSON.stringify(mongoExport, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'HMS-VoicePulse-MongoDB.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate project archive.');
    }
  };

  // Export raw MongoDB JSON file
  const exportMongoJSON = () => {
    const mongoData = {
      database: 'hms_voicepulse',
      connection_uri: 'mongodb://127.0.0.1:27017/hms_voicepulse',
      collections: {
        patients,
        doctors,
        consultations
      }
    };
    const blob = new Blob([JSON.stringify(mongoData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hms_voicepulse_mongodb_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Recharts Age Distribution Data
  const ageDistributionData = [
    { range: '0–17', cohort: 'Pediatric', count: 0, color: '#38bdf8' },
    { range: '18–35', cohort: 'Young Adult', count: 0, color: '#0284c7' },
    { range: '36–50', cohort: 'Adult', count: 0, color: '#0369a1' },
    { range: '51–65', cohort: 'Middle-Aged', count: 0, color: '#075985' },
    { range: '66+', cohort: 'Senior / Geriatric', count: 0, color: '#0c4a6e' }
  ];

  patients.forEach(p => {
    const a = p.age ?? 0;
    if (a <= 17) ageDistributionData[0].count++;
    else if (a <= 35) ageDistributionData[1].count++;
    else if (a <= 50) ageDistributionData[2].count++;
    else if (a <= 65) ageDistributionData[3].count++;
    else ageDistributionData[4].count++;
  });

  const avgAge = patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + (p.age || 0), 0) / patients.length) : 0;

  // If user selected Enterprise Portal View, render EnterpriseHMSPortal
  if (viewMode === 'enterprise_portal') {
    return (
      <EnterpriseHMSPortal
        patients={patients}
        doctors={doctors}
        consultations={consultations}
        activeDoctorId={activeDoctorId}
        activePatientId={activePatientId}
        onSelectPatient={(pid) => setActivePatientId(pid)}
        onSelectDoctor={(did) => setActiveDoctorId(did)}
        onOpenNewPatient={() => setShowNewPatientModal(true)}
        onOpenVoiceConsultation={(pid) => {
          if (pid) setActivePatientId(pid);
          setViewMode('voicepulse');
          setActiveTab('consultation');
        }}
        onBackToVoicePulse={() => setViewMode('voicepulse')}
        onDownloadCSV={downloadPatientsCSV}
        onExportPatientPDF={(pat) => exportPatientConsultationPDF({ patient: pat, doctor: activeDoctor, consultations })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-16 flex flex-col justify-between">
      
      <div>
        {/* ========================================================= */}
        {/* TOP HEADER */}
        {/* ========================================================= */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            
            {/* Left Title */}
            <div>
              <div className="text-[11px] font-bold tracking-wider text-sky-600 uppercase mb-0.5 flex items-center gap-1.5">
                <span>VIT CHENNAI • SMART HMS</span>
                <span className="px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded text-[9px] font-bold">MULTILINGUAL</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                <span>HMS VoicePulse</span>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200 hidden md:inline-flex items-center gap-1">
                  <Languages className="w-3 h-3 text-blue-600" />
                  EN • हिन्दी • தமிழ்
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Multilingual Clinical Voice Intelligence — Auto Tamil & Hindi to English Translation & Clinical Severity
              </p>
            </div>

            {/* Right Header Navigation & Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Active Doctor Pill */}
              <div 
                onClick={() => setShowNewDoctorModal(true)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-2xs"
                title="Click to view or switch Attending Doctor"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  Dr
                </div>
                <div className="text-left pr-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <span>{activeDoctor.name}</span>
                    <span className="text-[10px] text-blue-600 font-normal">({activeDoctor.doctor_id})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                    {activeDoctor.department} • {activeDoctor.opd_room}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'consultation' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Consultation</span>
                </button>
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'patients' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Patient Records & Age Distribution Bar Chart"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Patient Records</span>
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                    {patients.length}
                  </span>
                </button>
                <button
                  onClick={() => setShowConsultationsModal(true)}
                  className="px-3 py-1.5 font-bold text-slate-600 hover:text-slate-900 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                  title="View Consultation Records"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>History ({consultations.length})</span>
                </button>
              </div>

              {/* Enterprise Portal Switch Button in Header */}
              <button
                onClick={() => setViewMode('enterprise_portal')}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                title="Open Enterprise Hospital Portal & Ward Operations"
              >
                <Layers className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Enterprise Portal</span>
              </button>

              {/* MongoDB Database Status Pill */}
              <button
                onClick={() => setShowMongoModal(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="MongoDB Persistent Storage: patients, doctors, consultations"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">MongoDB</span>
              </button>

              {/* Export Complete Local Project ZIP */}
              <button
                onClick={exportProjectZip}
                className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Download full project source code as ZIP"
              >
                <Download className="w-4 h-4" />
              </button>

            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* VIEW 1: CONSULTATION & MULTILINGUAL VOICE INTERFACE */}
        {/* Note: Cluttered Instant Demo Presets bar removed per user brief! */}
        {/* Demo scenarios cleanly moved into compact dropdown inside documentation panel. */}
        {/* ========================================================= */}
        {activeTab === 'consultation' && (
          <main className="max-w-[1440px] mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ======================================================= */}
              {/* LEFT COLUMN: Active Patient, Voice Interface, Tech Status */}
              {/* ======================================================= */}
              <div className="lg:col-span-4 space-y-5">
                
                {/* 1. ACTIVE PATIENT CARD */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      ACTIVE PATIENT
                    </span>
                    <button
                      onClick={() => setShowNewPatientModal(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + New Patient
                    </button>
                  </div>

                  {/* Patient Dropdown */}
                  <div className="relative mb-3">
                    <select
                      value={activePatientId}
                      onChange={e => setActivePatientId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white cursor-pointer appearance-none pr-8"
                    >
                      {patients.map(p => (
                        <option key={p.patient_id} value={p.patient_id}>
                          {p.full_name} ({p.age}y, {p.gender}) — {p.patient_id}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>

                  {/* Patient Detail Strip */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <div className="text-slate-600 font-medium">
                      Age: {activePatient.age} | Gender: {activePatient.gender}
                    </div>
                    <div className="font-mono font-bold text-blue-600 text-xs">
                      ID: {activePatient.patient_id}
                    </div>
                  </div>

                  {/* USER REQUEST: Export Individual Patient's Full Consultation History as Formatted PDF */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => exportPatientConsultationPDF({ patient: activePatient, doctor: activeDoctor, consultations })}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title={`Export full consultation history for ${activePatient.full_name} as a formatted PDF summary`}
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Export Patient History (PDF)</span>
                      <span className="ml-1 px-1.5 py-0.2 bg-rose-200/80 text-rose-900 rounded-full text-[10px] font-bold">
                        {consultations.filter(c => c.patient_id === activePatient.patient_id).length} consults
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. VOICE INTERFACE CARD WITH MULTILINGUAL TRANSLATION (Tamil & Hindi) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-center">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      VOICE INTERFACE
                    </span>

                    {/* Language Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                      <Languages className="w-3.5 h-3.5 text-blue-600" />
                      <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value as any)}
                        className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        <option value="English">🇬🇧 English</option>
                        <option value="Hindi">🇮🇳 हिन्दी (Hindi)</option>
                        <option value="Tamil">🇮🇳 தமிழ் (Tamil)</option>
                        <option value="Telugu">🇮🇳 తెలుగు (Telugu)</option>
                        <option value="Bengali">🇮🇳 বাংলা (Bengali)</option>
                        <option value="Auto Detect">🌐 Auto Detect</option>
                      </select>
                    </div>
                  </div>

                  {/* Translation Mode Pill */}
                  <div className="mb-2 px-3 py-1 bg-sky-50 border border-sky-100 rounded-lg text-[11px] text-sky-800 font-medium flex items-center justify-between">
                    <span>Input Speech: <strong>{selectedLanguage}</strong></span>
                    <span className="flex items-center gap-1 text-sky-600 font-bold">
                      <ArrowRight className="w-3 h-3" /> Auto English
                    </span>
                  </div>

                  {/* Concentric Dots Microphone Orb */}
                  <div className="flex flex-col items-center justify-center my-2">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-24 h-24" viewBox="0 0 100 100">
                        {/* Outer circle track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="32"
                          fill="none"
                          stroke={micState === 'listening' ? '#93c5fd' : micState === 'unavailable' ? '#fca5a5' : '#e2e8f0'}
                          strokeWidth="1"
                          strokeDasharray="2 6"
                        />
                        {/* Surrounding dots */}
                        {Array.from({ length: 8 }).map((_, i) => {
                          const angle = (i * 45 * Math.PI) / 180;
                          const x = 50 + 32 * Math.cos(angle);
                          const y = 50 + 32 * Math.sin(angle);
                          const dotColor = micState === 'listening' ? '#2563eb' : micState === 'unavailable' ? '#ef4444' : '#94a3b8';
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="2.5"
                              fill={dotColor}
                              className={micState === 'listening' ? 'animate-pulse' : ''}
                            />
                          );
                        })}
                        {/* Inner Center Dot */}
                        <circle
                          cx="50"
                          cy="50"
                          r="7.5"
                          fill={micState === 'listening' ? '#2563eb' : micState === 'unavailable' ? '#ef4444' : '#1e293b'}
                          className={micState === 'listening' ? 'animate-ping origin-center' : ''}
                          opacity={micState === 'listening' ? 0.3 : 0}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="6.5"
                          fill={micState === 'listening' ? '#2563eb' : micState === 'unavailable' ? '#ef4444' : '#1e293b'}
                        />
                      </svg>
                    </div>

                    {/* State Label & Subtitle */}
                    {micState === 'listening' ? (
                      <>
                        <h3 className="text-sm font-bold text-blue-600 mt-1">Listening in {selectedLanguage}...</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Doctor speaking prescription & observations</p>
                      </>
                    ) : micState === 'unavailable' ? (
                      <>
                        <h3 className="text-sm font-bold text-red-600 mt-1 flex items-center gap-1 justify-center">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Microphone unavailable
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Access denied or device not found. You can paste text or use simulated scenarios.</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">VoicePulse Ready</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Click 'Start Listening' to speak in Tamil, Hindi or English</p>
                      </>
                    )}
                  </div>

                  {/* Live Waveform Canvas */}
                  <div className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 my-3">
                    <canvas ref={canvasRef} width={340} height={32} className="w-full h-8 block" />
                    <div className="text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase mt-1">
                      LIVE AUDIO INPUT
                    </div>
                  </div>

                  {/* Start & Stop Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={startListening}
                      disabled={isRecording}
                      className="w-full py-2.5 px-3 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Listening</span>
                    </button>
                    <button
                      onClick={stopListening}
                      disabled={!isRecording}
                      className="w-full py-2.5 px-3 bg-[#ef4444] hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop</span>
                    </button>
                  </div>
                </div>

                {/* 3. VOICEPULSE TECHNICAL STATUS CARD */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      VOICEPULSE TECHNICAL STATUS
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">MICROPHONE</div>
                      <div className={`font-bold mt-0.5 ${micState === 'listening' ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {micState === 'listening' ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">TRANSLATOR</div>
                      <div className="font-bold text-sky-700 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                        <span>TA / HI → EN Active</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">SPEECH ENGINE</div>
                      <div className="font-bold text-slate-700 mt-0.5">faster-whisper (base)</div>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">SEVERITY ENGINE</div>
                      <div className="font-bold text-purple-700 mt-0.5">Symptom Triage (1-10)</div>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">ACTIVE LANGUAGE</div>
                      <div className="font-bold text-slate-700 mt-0.5">{selectedLanguage}</div>
                    </div>

                    <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">DATABASE (MONGODB)</div>
                      <div className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>hms_voicepulse</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ======================================================= */}
              {/* RIGHT COLUMN: Live Transcription, Translation & Clinical Notes */}
              {/* ======================================================= */}
              <div className="lg:col-span-8 space-y-5">
                
                {/* 1. DUAL LIVE TRANSCRIPTION CARD: ORIGINAL SPOKEN + CONVERTED ENGLISH */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  
                  {/* Header with language tags, simulated scenario selector & actions */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        CLINICAL TRANSCRIPTION & TRANSLATION
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isRecording ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isRecording ? 'Streaming' : 'Ready'}
                      </span>
                      {/* Live Translation Status Badge */}
                      {isTranslating ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1.5 animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          <span>Translating to English...</span>
                        </span>
                      ) : detectedSpokenLang !== 'English' && englishTranscript ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Converted {detectedSpokenLang} → English</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      
                      {/* Manual Translate Button */}
                      <button
                        onClick={triggerManualTranslation}
                        disabled={isTranslating || !transcript.trim()}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 rounded-md cursor-pointer transition-colors flex items-center gap-1"
                        title="Convert spoken native transcript to English"
                      >
                        <Languages className="w-3 h-3 text-blue-600" />
                        <span>Translate to English</span>
                      </button>

                      {/* USER REQUEST: Compact "Load Demo Scenario" dropdown inside panel */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const p = DEMO_PRESETS.find(item => item.id === e.target.value);
                            if (p) loadDemoPreset(p);
                            e.target.value = '';
                          }}
                          defaultValue=""
                          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md px-2.5 py-1 font-semibold outline-none cursor-pointer shadow-2xs"
                          title="Load Simulated Clinical Consultation for testing"
                        >
                          <option value="" disabled>⚡ Load Demo Scenario (Simulated)...</option>
                          <option value="hi-1">[Simulated] 🇮🇳 Hindi: Acute Fever & Rx (तेज बुखार)</option>
                          <option value="hi-2">[Simulated] 🇮🇳 Hindi: Abdominal Pain (पेट दर्द & उल्टी)</option>
                          <option value="ta-1">[Simulated] 🇮🇳 Tamil: Severe Fever & Body Pain (காய்ச்சல்)</option>
                          <option value="ta-2">[Simulated] 🇮🇳 Tamil: Sore Throat & Cough (தொண்டை வலி)</option>
                          <option value="te-1">[Simulated] 🇮🇳 Telugu: Severe Fever (తీవ్రమైన జ్వరం)</option>
                          <option value="en-1">[Simulated] 🇬🇧 English: Febrile Illness & Triage</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          setTranscript('');
                          setEnglishTranscript('');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={copyTranscript}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer transition-colors flex items-center gap-1"
                      >
                        {copyFeedback ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copyFeedback ? 'Copied' : 'Copy English'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual Transcript Display: (A) Original Spoken Speech, (B) Converted English */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    
                    {/* (A) Original Spoken Input (Hindi / Tamil / English) */}
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Mic className="w-3 h-3 text-blue-600" />
                          Original Spoken Input ({selectedLanguage})
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Editable</span>
                      </div>
                      <textarea
                        rows={4}
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                        placeholder="Doctor speaks in Tamil, Hindi, or English. Spoken prescription and symptoms stream here..."
                        className="w-full bg-white border border-slate-200 rounded p-2.5 text-xs text-slate-800 leading-relaxed outline-none focus:border-blue-400 font-sans"
                      />
                    </div>

                    {/* (B) Converted English Transcript (Auto Translated for Clinical Notes) */}
                    <div className="border border-sky-200 rounded-lg p-3 bg-sky-50/40">
                      <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Languages className="w-3.5 h-3.5 text-sky-600" />
                          Converted English Transcript ({isTranslating ? 'Translating...' : 'Auto-Translated'})
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isTranslating ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isTranslating ? 'Converting...' : 'Standardized English'}
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={englishTranscript}
                        onChange={e => setEnglishTranscript(e.target.value)}
                        placeholder="Spoken Hindi, Tamil or Telugu is translated to standardized medical English here..."
                        className="w-full bg-white border border-sky-300 rounded p-2.5 text-xs text-slate-900 leading-relaxed outline-none focus:border-sky-500 font-sans font-medium"
                      />
                    </div>

                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{wordsCount} words captured</span>
                      <span>•</span>
                      <span className="text-sky-700">Ready for clinical note extraction</span>
                    </div>

                    <button
                      onClick={generateClinicalNotes}
                      className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Clinical Notes & Severity</span>
                    </button>
                  </div>
                </div>

                {/* 2. STRUCTURED CLINICAL NOTES CARD WITH SYMPTOM SEVERITY SECTION */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        STRUCTURED CLINICAL NOTES
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                        REVIEW REQUIRED
                      </span>
                    </div>

                    <button
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingNotes ? 'Finish Editing' : 'Edit Notes'}</span>
                    </button>
                  </div>

                  {/* Doctor Verification Required Warning Alert */}
                  <div className="bg-[#fffbeb] border-l-4 border-amber-500 p-3 rounded-r-lg mb-4 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Doctor Verification Required:</strong> AI-generated transcription and extracted clinical notes must be reviewed and verified by a qualified healthcare professional before saving to the medical record.
                    </div>
                  </div>

                  {/* 4 BASIC CLINICAL ENTITIES STRIP */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
                    
                    {/* Symptoms */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                        SYMPTOMS ({symptoms.filter(s => s !== 'None detected').length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {symptoms.length > 0 && symptoms[0] !== 'None detected' ? (
                          symptoms.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-md">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                        DURATION
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        {duration || <span className="text-slate-400 italic font-normal">None detected</span>}
                      </div>
                    </div>

                    {/* Temperature */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                        TEMPERATURE
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {temperatures.length > 0 ? (
                          temperatures.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None detected</span>
                        )}
                      </div>
                    </div>

                    {/* Medicines / Prescriptions Stated */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                        MEDICINES STATED
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {medicines.length > 0 ? (
                          medicines.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-semibold rounded-md">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None detected</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* SYMPTOM SEVERITY & COMPARATIVE RATING SECTION */}
                  <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3.5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-rose-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Symptom Severity Rating & Triage (Ranked: More to Less Severe)
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Physician override enabled: click buttons below to adjust
                      </span>
                    </div>

                    {symptomSeverities.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {symptomSeverities.map((item, idx) => {
                          const isTop = idx === 0;
                          const barColor = item.severity === 'Severe'
                            ? 'bg-rose-500'
                            : item.severity === 'Moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';

                          return (
                            <div
                              key={item.symptom}
                              className={`p-2.5 rounded-lg border bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs ${
                                isTop ? 'ring-1 ring-rose-200 border-rose-300' : 'border-slate-200'
                              }`}
                            >
                              {/* Left: Symptom name & Rank */}
                              <div className="min-w-[170px]">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    isTop ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">{item.symptom}</span>
                                  {isTop && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                      Dominant Concern
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {item.detectedCue || 'Clinical presentation'}
                                </div>
                              </div>

                              {/* Middle: Visual Severity Meter ("who is more or less") */}
                              <div className="flex-1 w-full sm:w-auto px-2">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                                  <span>Severity Level: {item.severity}</span>
                                  <span className="font-mono">{item.score}/10 Intensity</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                    style={{ width: `${item.score * 10}%` }}
                                  />
                                </div>
                              </div>

                              {/* Right: Quick Severity Toggle Buttons for Doctor */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => updateSymptomSeverityLevel(item.symptom, 'Mild')}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                    item.severity === 'Mild'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Mild (1-4)
                                </button>
                                <button
                                  onClick={() => updateSymptomSeverityLevel(item.symptom, 'Moderate')}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                    item.severity === 'Moderate'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Moderate (5-7)
                                </button>
                                <button
                                  onClick={() => updateSymptomSeverityLevel(item.symptom, 'Severe')}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                                    item.severity === 'Severe'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  Severe (8-10)
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs text-slate-400 italic">
                        Click 'Generate Clinical Notes' to extract symptoms and compute relative severity ratings.
                      </div>
                    )}
                  </div>

                  {/* Verified Clinical Note Content */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Verified Clinical Note Content (Standardized English):
                    </label>
                    <textarea
                      rows={9}
                      value={verifiedContent}
                      onChange={e => setVerifiedContent(e.target.value)}
                      readOnly={!isEditingNotes}
                      className={`w-full p-3 rounded-lg border text-xs font-mono leading-relaxed outline-none transition-colors ${
                        isEditingNotes
                          ? 'bg-white border-blue-500 shadow-xs text-slate-900'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Verification Consent Checkbox & Save Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 select-none">
                      <input
                        type="checkbox"
                        checked={isNotesVerified}
                        onChange={e => setIsNotesVerified(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>I have verified these clinical notes and symptom severities for accuracy.</span>
                    </label>

                    <button
                      onClick={saveClinicalNotesToDatabase}
                      disabled={!isNotesVerified}
                      className="px-4 py-2.5 bg-[#10b981] hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save to MongoDB Record</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </main>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: PATIENT RECORDS TAB WITH RECHARTS BAR CHART & DOWNLOAD CSV BUTTON */}
        {/* ========================================================= */}
        {activeTab === 'patients' && (
          <main className="max-w-[1440px] mx-auto px-6 py-6">
            <div className="space-y-6">
              
              {/* Top Bar with 'Download CSV' and '+ Register New Patient' */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Patient Records & Demographic Intelligence</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Registered hospital patients stored in MongoDB (Collection: <code>patients</code>) with Recharts demographic analysis
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* USER REQUESTED: 'Download CSV' Button */}
                  <button
                    onClick={downloadPatientsCSV}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Export all registered patients mirrored from MongoDB to a CSV file"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download CSV</span>
                  </button>

                  {/* USER REQUESTED: Export Active Patient Consultation History as PDF */}
                  <button
                    onClick={() => exportPatientConsultationPDF({ patient: activePatient, doctor: activeDoctor, consultations })}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Export active patient (${activePatient.full_name}) full consultation history as a formatted PDF summary`}
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export Active Patient PDF</span>
                  </button>

                  <button
                    onClick={() => setShowNewPatientModal(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Register New Patient ID</span>
                  </button>
                </div>
              </div>

              {/* RECHARTS PATIENT AGE DISTRIBUTION BAR CHART CARD */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-sky-600" />
                      <span>Age Distribution of All Registered Patients (Recharts)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Visual cohort segmentation across pediatric, young adult, adult, middle-aged, and geriatric groups
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="text-slate-500 font-medium">Total Registered: </span>
                      <strong className="text-slate-900">{patients.length} patients</strong>
                    </div>
                    <div className="px-3 py-1 bg-sky-50 border border-sky-200 rounded-lg text-xs">
                      <span className="text-sky-700 font-medium">Average Cohort Age: </span>
                      <strong className="text-sky-900">{avgAge} years</strong>
                    </div>
                  </div>
                </div>

                {/* Recharts Bar Chart Container */}
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageDistributionData} margin={{ top: 10, right: 20, left: -10, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#475569' }} stroke="#cbd5e1" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const pct = Math.round((data.count / patients.length) * 100);
                            return (
                              <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-lg border border-slate-700">
                                <div className="font-bold text-sky-400">{data.range} years ({data.cohort})</div>
                                <div className="mt-1 font-semibold">Registered: {data.count} patients ({pct}%)</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56} name="Patients">
                        {ageDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Cohort Legend Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 mt-2 border-t border-slate-100 text-xs">
                  {ageDistributionData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-3.5 h-3.5 rounded-xs shrink-0" style={{ backgroundColor: d.color }} />
                      <div className="truncate">
                        <div className="font-bold text-slate-800">{d.range} yrs</div>
                        <div className="text-[11px] text-slate-500">{d.cohort}: <strong>{d.count}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* PATIENT DIRECTORY TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Hospital Patient Directory ({patients.length} Registered)
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadPatientsCSV}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <span className="text-xs text-slate-500 font-medium">
                      Active: <strong className="text-blue-600">{activePatient.full_name} ({activePatient.patient_id})</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">PATIENT ID</th>
                        <th className="py-3 px-4">FULL NAME</th>
                        <th className="py-3 px-4">AGE & GENDER</th>
                        <th className="py-3 px-4">CONTACT</th>
                        <th className="py-3 px-4">ALLERGIES</th>
                        <th className="py-3 px-4">MEDICAL HISTORY</th>
                        <th className="py-3 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map(p => {
                        const isActive = p.patient_id === activePatientId;
                        return (
                          <tr key={p.patient_id} className={`hover:bg-slate-50/70 transition-colors ${isActive ? 'bg-blue-50/40' : ''}`}>
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              {p.patient_id}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {p.full_name}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {p.age} yrs • {p.gender}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              {p.contact}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                p.allergies && p.allergies.toLowerCase() !== 'none' && !p.allergies.includes('None')
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {p.allergies || 'None'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                              {p.medical_history || 'No chronic illness reported'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => exportPatientConsultationPDF({ patient: p, doctor: activeDoctor, consultations })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title={`Export formatted consultation history PDF for ${p.full_name}`}
                                >
                                  <FileText className="w-3 h-3 text-rose-600" />
                                  <span>PDF Summary</span>
                                </button>
                                {isActive ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">
                                    Active
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActivePatientId(p.patient_id);
                                      setActiveTab('consultation');
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded transition-colors cursor-pointer"
                                  >
                                    Select & Consult
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </main>
        )}

      </div>

      {/* ========================================================= */}
      {/* USER REQUEST: BOTTOM OPTION TO OPEN THE NEW INTERFACE (ENTERPRISE HMS PORTAL) */}
      {/* ("when we click on the bottom then open another interface like this something like given in image but not as same") */}
      {/* ========================================================= */}
      <footer className="max-w-[1440px] w-full mx-auto px-6 mt-12">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg border border-sky-500/30 shrink-0 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-extrabold flex items-center gap-2 text-white">
                <span>Enterprise Hospital Management System (HMS Portal)</span>
                <span className="px-2 py-0.5 bg-sky-500 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wide">
                  Executive View
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Switch to Full Hospital Operations: Ward Beds, Patient Directory ({patients.length} Patients), Schedule Calendar & '+ Clinical' Dropdown Menu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={downloadPatientsCSV}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => setViewMode('enterprise_portal')}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 hover:shadow-sky-500/30"
            >
              <span>Open Enterprise Hospital Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL 1: HOSPITAL DATABASE — SAVED CONSULTATIONS */}
      {/* ========================================================= */}
      {showConsultationsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Hospital Database — Saved Consultations</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Persistent consultation records with Multilingual Transcription & Severity Ratings in MongoDB (Collection: <code>consultations</code>)
                </p>
              </div>
              <button
                onClick={() => setShowConsultationsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-4">PATIENT</th>
                    <th className="py-2.5 px-4">DOCTOR</th>
                    <th className="py-2.5 px-4">DATE & TIME</th>
                    <th className="py-2.5 px-4">CLINICAL SUMMARY & SEVERITY</th>
                    <th className="py-2.5 px-3">LANGUAGE</th>
                    <th className="py-2.5 px-3 text-right">PDF SUMMARY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultations.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-3 font-bold text-slate-900 text-sm">
                        {c.id_display}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div>{c.patient_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">({c.patient_age}y) • {c.patient_id}</div>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-700">
                        {c.doctor_id} ({c.doctor_name})
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {c.date_time}
                      </td>
                      <td className="py-4 px-4 max-w-sm">
                        <div className="font-mono text-[11px] text-slate-700 whitespace-pre-line bg-slate-50 p-2.5 rounded border border-slate-100 max-h-28 overflow-y-auto leading-relaxed">
                          {c.clinical_summary}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200">
                          {c.language}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <button
                          onClick={() => {
                            const pat = patients.find(p => p.patient_id === c.patient_id) || {
                              patient_id: c.patient_id,
                              full_name: c.patient_name,
                              age: c.patient_age,
                              gender: 'Male',
                              contact: '+91-98000-00000',
                              allergies: 'None recorded',
                              medical_history: 'None'
                            };
                            exportPatientConsultationPDF({ patient: pat, doctor: activeDoctor, consultations });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded flex items-center gap-1 cursor-pointer ml-auto"
                          title={`Export consultation history PDF for ${c.patient_name}`}
                        >
                          <FileText className="w-3 h-3 text-rose-600" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total consultations: <strong>{consultations.length}</strong> records stored in MongoDB
              </span>
              <button
                onClick={() => setShowConsultationsModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD NEW PATIENT (With Custom Patient ID) */}
      {/* ========================================================= */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Register New Patient ID (MongoDB)</span>
              </h2>
              <button onClick={() => setShowNewPatientModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewPatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient ID *
                  </label>
                  <input
                    type="text"
                    value={newPatientId}
                    onChange={e => setNewPatientId(e.target.value)}
                    placeholder={`e.g. PAT-${String(patients.length + 1).padStart(4, '0')}`}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-700 outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400">Leave blank to auto-generate</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={e => setNewPatientName(e.target.value)}
                    placeholder="e.g. garv Nijhawan"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={newPatientAge}
                    onChange={e => setNewPatientAge(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={e => setNewPatientGender(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact</label>
                  <input
                    type="text"
                    value={newPatientContact}
                    onChange={e => setNewPatientContact(e.target.value)}
                    placeholder="+91-98..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={newPatientAllergies}
                  onChange={e => setNewPatientAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts (or None)"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical History</label>
                <textarea
                  rows={2}
                  value={newPatientHistory}
                  onChange={e => setNewPatientHistory(e.target.value)}
                  placeholder="e.g. Hypertension, asthma, diabetes..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Save to MongoDB
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD NEW DOCTOR / PHYSICIAN STAFF */}
      {/* ========================================================= */}
      {showNewDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Physician Staff & Doctor Management</span>
                </h2>
                <p className="text-xs text-slate-500">Switch active physician or register new doctor to MongoDB</p>
              </div>
              <button onClick={() => setShowNewDoctorModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase">
                  Select Attending Physician:
                </label>
                <div className="space-y-2">
                  {doctors.map(d => (
                    <div
                      key={d.doctor_id}
                      onClick={() => {
                        setActiveDoctorId(d.doctor_id);
                        setShowNewDoctorModal(false);
                      }}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        d.doctor_id === activeDoctorId
                          ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          Dr
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{d.name} ({d.doctor_id})</div>
                          <div className="text-[11px] text-slate-500">{d.department} • {d.opd_room}</div>
                        </div>
                      </div>
                      {d.doctor_id === activeDoctorId && (
                        <span className="text-[11px] font-bold text-blue-600">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase">
                  + Add New Doctor or Physician Staff
                </h3>
                <form onSubmit={handleAddNewDoctor} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Doctor ID</label>
                      <input
                        type="text"
                        value={newDoctorId}
                        onChange={e => setNewDoctorId(e.target.value)}
                        placeholder={`e.g. DR-${doctors.length + 101}`}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold text-blue-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newDoctorName}
                        onChange={e => setNewDoctorName(e.target.value)}
                        placeholder="e.g. Dr. Ananya Sharma"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department</label>
                      <input
                        type="text"
                        value={newDoctorDept}
                        onChange={e => setNewDoctorDept(e.target.value)}
                        placeholder="Cardiology"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">OPD Room</label>
                      <input
                        type="text"
                        value={newDoctorOpd}
                        onChange={e => setNewDoctorOpd(e.target.value)}
                        placeholder="OPD 4"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Designation</label>
                      <input
                        type="text"
                        value={newDoctorDesignation}
                        onChange={e => setNewDoctorDesignation(e.target.value)}
                        placeholder="Physician"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                    >
                      Save Doctor to MongoDB
                    </button>
                  </div>
                </form>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: MONGODB STATUS & COLLECTIONS INSPECTOR */}
      {/* ========================================================= */}
      {showMongoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in-50 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  <span>MongoDB Storage & Database Diagnostics</span>
                </h2>
                <p className="text-xs text-slate-500">Live persistence for patient records, physician staff, and consultation history</p>
              </div>
              <button onClick={() => setShowMongoModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">DATABASE</div>
                  <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">hms_voicepulse</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">URI (DEFAULT)</div>
                  <div className="font-mono font-bold text-[11px] text-blue-700 mt-0.5 truncate">mongodb://127.0.0.1:27017</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">STATUS</div>
                  <div className="font-bold text-xs text-emerald-900 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Synchronized</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  MongoDB Collections:
                </h3>
                
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="font-bold text-slate-900">patients</div>
                    <div className="text-lg font-black text-blue-600 mt-1">{patients.length} docs</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Demographics & allergies</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="font-bold text-slate-900">doctors</div>
                    <div className="text-lg font-black text-blue-600 mt-1">{doctors.length} docs</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Physicians & OPD staff</div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="font-bold text-slate-900">consultations</div>
                    <div className="text-lg font-black text-emerald-600 mt-1">{consultations.length} docs</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Transcripts & severity ratings</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600">Sample MongoDB Document:</span>
                    <button
                      onClick={exportMongoJSON}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Collections (.JSON)
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-sky-300 p-3.5 rounded-lg text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed">
{JSON.stringify(consultations[0], null, 2)}
                  </pre>
                </div>
              </div>

            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowMongoModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Alert Popup for Mic Access Denied */}
      {micToastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e293b] text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{micToastMessage}</span>
        </div>
      )}

    </div>
  );
}
