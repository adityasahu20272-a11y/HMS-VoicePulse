# HMS VoicePulse — AI-Powered Smart Hospital Management System
### Voice Documentation & Clinical Entity Extraction (Local macOS Application)

> **Speak. Capture. Understand.**  
> A privacy-first, locally-hosted hospital voice documentation application built for MacBook deployment. Transcribes physician-patient conversations offline via `faster-whisper`, extracts structured clinical notes deterministically, and preserves permanent patient records in a local SQLite database without sending health data to third-party cloud services.

---

## Table of Contents
1. [Overview & Capabilities](#overview--capabilities)
2. [Architecture & Target Directory](#architecture--target-directory)
3. [macOS System Requirements & Prerequisites](#macos-system-requirements--prerequisites)
4. [First-Time Installation](#first-time-installation)
5. [How to Launch & Run](#how-to-launch--run)
   - [One-Click Desktop Launcher (.command)](#one-click-desktop-launcher-command)
   - [Terminal Scripts (start / stop / restart / status)](#terminal-scripts)
6. [Automatic Startup at macOS Login (Optional LaunchAgent)](#automatic-startup-at-macos-login-optional-launchagent)
7. [Microphone Permissions & Troubleshooting](#microphone-permissions--troubleshooting)
8. [Clinical NLP & Verification Safety Rules](#clinical-nlp--verification-safety-rules)
9. [Database Storage, Backups & Privacy](#database-storage-backups--privacy)
10. [Running Automated Tests](#running-automated-tests)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Known Limitations & College Project Notes](#known-limitations--college-project-notes)

---

## 1. Overview & Capabilities

**HMS VoicePulse** is designed for clinical consultation workflows:
- **Continuous Local Speech Recognition:** Microphone audio streams in real-time from the browser to a local FastAPI backend through WebSockets, transcribing speech using `faster-whisper` (cached locally).
- **Audio Amplitude Visualizer:** Live waveform derived from genuine microphone amplitude (Web Audio API `AnalyserNode`).
- **Deterministic Medical NLP Extraction:** Extracts chief complaint, symptoms, durations, vitals (BP, Pulse, SpO2), temperature, mentioned medications, dosage, frequency, and medical history.
- **Strict Clinical Negation Handling:** Explicit denials (e.g. *"no fever"*, *"denies chest pain"*) are categorized as negative findings and never falsely counted as positive symptoms.
- **Permanent Raw Transcripts:** The original spoken text is stored intact and never overwritten when a physician edits clinical notes.
- **Doctor & Patient Management:** Full CRUD management for doctors and patients with unique ID validation.
- **Strict Localhost Binding:** The server binds strictly to `127.0.0.1:8000` to prevent exposure over local networks.

---

## 2. Architecture & Target Directory

The application lives at:
`~/Projects/HMS-VoicePulse/`

```text
HMS-VoicePulse/
├── backend/
│   ├── __init__.py            # Backend package initialization
│   ├── main.py                # FastAPI application, static routes & WebSocket endpoint
│   ├── config.py              # Path resolver & environment settings
│   ├── database.py            # SQLite engine, sessions, schema migration & seeds
│   ├── models.py              # SQLAlchemy models: Doctor, Patient, Consultation
│   ├── schemas.py             # Pydantic request & response validation schemas
│   ├── nlp_processor.py       # Deterministic medical NLP entity extractor
│   ├── audio_processor.py     # 16kHz PCM buffer, RMS calculation & sliding windows
│   ├── whisper_engine.py      # faster-whisper wrapper with local model caching
│   ├── websocket_manager.py   # WebSocket audio stream session manager
│   └── routes/
│       ├── __init__.py
│       ├── doctors.py         # Physician CRUD endpoints
│       ├── patients.py        # Patient CRUD & search endpoints
│       ├── consultations.py   # Consultation workflow & verification endpoints
│       └── settings.py        # System health & diagnostics endpoints
├── frontend/
│   ├── index.html             # Hospital UI, consultation deck, tables & modals
│   ├── style.css              # Hospital blue theme, layout & audio visualizer styles
│   ├── app.js                 # State controller, API integrations & UI handlers
│   └── voicepulse.js          # Web Audio API microphone stream & WebSocket client
├── scripts/
│   ├── install.sh             # Initial setup script (venv, packages, DB)
│   ├── start.sh               # Background server launcher with PID tracking
│   ├── stop.sh                # Clean server termination script
│   ├── restart.sh             # Safe reload script
│   └── status.sh              # Inspection & health reporting script
├── launchers/
│   └── HMS-VoicePulse.command # Double-clickable macOS Finder desktop launcher
├── macos/
│   └── com.hms.voicepulse.plist # User LaunchAgent for auto-startup at login
├── data/
│   ├── .gitkeep
│   ├── hospital.db            # SQLite persistent database (created on first run)
│   └── models/                # Local cache directory for faster-whisper models
├── logs/
│   ├── .gitkeep
│   ├── voicepulse.log         # Application activity & diagnostic logs
│   └── voicepulse.pid         # Process ID file for safe lifecycle management
├── tests/
│   ├── __init__.py
│   ├── test_health.py         # Configuration & health schema tests
│   ├── test_database.py       # Model relationships & transcript preservation tests
│   ├── test_nlp.py            # Negation & entity extraction tests
│   └── test_websocket.py      # Audio buffer & sliding window tests
├── .env                       # Local environment variables
├── .env.example               # Template environment configuration
├── .gitignore                 # Excludes venv, sqlite db, models & log files
├── requirements.txt           # Python dependencies
└── README.md                  # Complete documentation
```

---

## 3. macOS System Requirements & Prerequisites

- **macOS Version:** macOS 12 (Monterey), macOS 13 (Ventura), macOS 14 (Sonoma), or macOS 15 (Sequoia).
- **Hardware Architecture:** Supported on both **Apple Silicon** (M1 / M2 / M3 / M4) and **Intel** Macs.
- **Python Version:** Python 3.9, 3.10, 3.11, or 3.12.
- **Browser:** Google Chrome (recommended for full Web Audio API support) or Apple Safari.

To check your Python version on macOS:
```bash
python3 --version
```
If Python 3 is not installed, install it via Homebrew:
```bash
brew install python
```

---

## 4. First-Time Installation

1. Open **Terminal** on your Mac.
2. Navigate to your project folder:
   ```bash
   cd ~/Projects/HMS-VoicePulse
   ```
3. Make the scripts executable:
   ```bash
   chmod +x scripts/*.sh launchers/*.command
   ```
4. Run the installer:
   ```bash
   ./scripts/install.sh
   ```
The installer automatically:
- Creates a virtual environment in `venv/`.
- Installs dependencies from `requirements.txt`.
- Generates `.env` from `.env.example` if not already present.
- Creates `data/` and `logs/` directories.
- Initializes the SQLite database tables and default sample physician.

---

## 5. How to Launch & Run

### One-Click Desktop Launcher (.command)
Double-click `launchers/HMS-VoicePulse.command` in macOS Finder.
- If prompted about permission on first launch, run:
  ```bash
  chmod +x ~/Projects/HMS-VoicePulse/launchers/HMS-VoicePulse.command
  ```
- The launcher starts the server, verifies health at `http://127.0.0.1:8000/api/health`, and automatically opens your default browser at `http://127.0.0.1:8000`.

### Terminal Scripts

To start the server in the background:
```bash
./scripts/start.sh
```

To check whether the server and database are healthy:
```bash
./scripts/status.sh
```

To stop the server safely:
```bash
./scripts/stop.sh
```

To restart the server:
```bash
./scripts/restart.sh
```

---

## 6. Automatic Startup at macOS Login (Optional LaunchAgent)

If you would like the HMS VoicePulse backend to start automatically whenever you log in to your Mac:

1. Edit `macos/com.hms.voicepulse.plist` and replace `YOUR_USERNAME` with your macOS username (check with `whoami`):
   ```bash
   sed -i '' "s/YOUR_USERNAME/$(whoami)/g" macos/com.hms.voicepulse.plist
   ```
2. Copy the plist file into your user LaunchAgents directory:
   ```bash
   cp macos/com.hms.voicepulse.plist ~/Library/LaunchAgents/
   ```
3. Load the LaunchAgent:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.hms.voicepulse.plist
   ```

### To Disable / Uninstall Automatic Startup:
```bash
launchctl unload ~/Library/LaunchAgents/com.hms.voicepulse.plist
rm ~/Library/LaunchAgents/com.hms.voicepulse.plist
```
*(Your patient database in `data/hospital.db` is never affected by removing the LaunchAgent).*

> **Important Limitation:** The application cannot operate while your Mac is shut down or in deep system sleep. When you wake up and log in, the LaunchAgent ensures the server is ready.

---

## 7. Microphone Permissions & Troubleshooting

When capturing voice in Google Chrome:
1. When you click **"Start Listening"**, Chrome will display: *"127.0.0.1 wants to Use your microphone"*. Click **Allow**.
2. If access is blocked:
   - Click the **Tune / Settings** icon to the left of `http://127.0.0.1:8000` in Chrome's URL bar.
   - Set **Microphone** to **Allow**.
3. macOS System Permissions:
   - Go to **System Settings** → **Privacy & Security** → **Microphone**.
   - Ensure **Google Chrome** is toggled **ON**.
4. Audio Input Device:
   - Go to **System Settings** → **Sound** → **Input**.
   - Verify that your MacBook Microphone or headset is selected and that the input volume level bar moves when speaking.

---

## 8. Clinical NLP & Verification Safety Rules

The extraction module strictly follows patient safety rules:
1. **No Hallucinated Data:** Only symptoms and details explicitly spoken in the transcript are extracted.
2. **Explicit Negation Preservation:** Phrases such as *"no fever"*, *"denies vomiting"*, or *"negative for chest pain"* are preserved in the **Negative Findings** section and never classified as symptoms.
3. **Draft State Labeling:** All machine-extracted notes are marked **Draft (Unverified)** until an attending physician reviews, edits, and checks the verification box.
4. **Preserved Raw Transcripts:** The raw audio transcript is permanently saved and cannot be overwritten when the doctor edits the clinical note fields.

---

## 9. Database Storage, Backups & Privacy

- **Database Location:** `data/hospital.db`
- **Data Privacy:** All records remain 100% on your local MacBook storage. No audio or medical records are transmitted across the internet.

### How to Back Up the Database:
Simply copy the SQLite database file:
```bash
cp data/hospital.db data/hospital_backup_$(date +%Y%m%d).db
```

### To Restore from a Backup:
```bash
./scripts/stop.sh
cp data/hospital_backup_YYYYMMDD.db data/hospital.db
./scripts/start.sh
```

---

## 10. Running Automated Tests

Run the complete automated test suite (16 tests covering health checks, database constraints, medical NLP negation, and audio buffers):

```bash
# Using Python unittest standard library:
python3 -m unittest discover tests

# Or with pytest inside the virtual environment:
source venv/bin/activate
pytest tests/
```

All 16 tests pass deterministically.

---

## 11. Troubleshooting Guide

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| `ERR_CONNECTION_REFUSED` | Server is not running | Run `./scripts/start.sh` or double-click `launchers/HMS-VoicePulse.command`. |
| Port 8000 conflict | Another program is using port 8000 | In `.env`, change `APP_PORT=8001`, or stop the other process using `lsof -i :8000`. |
| Microphone permission denied | Browser or macOS blocked mic | Check Chrome Site Settings and macOS *System Settings > Privacy & Security > Microphone*. |
| Speech model downloading slowly | Initial download of `small` model | In `.env`, set `WHISPER_MODEL=base` or `tiny` for a faster initial download. |
| Stale PID file | Server was forcefully killed | Run `./scripts/stop.sh` to clean up the PID, then `./scripts/start.sh`. |

---

## 12. Known Limitations & College Project Notes

- **Acoustic Noise:** Faster-whisper performance depends on microphone clarity. A quiet environment or directional headset yields the highest clinical transcription accuracy.
- **Accent & Medical Vocabulary:** Generic speech recognition models may occasionally misspell uncommon pharmaceutical brand names. The system provides immediate manual editing in the UI before doctor verification.
- **Student Project Notice:** This application is developed as an academic project demonstrating local voice documentation and hospital management. It is not a certified electronic health record system.
