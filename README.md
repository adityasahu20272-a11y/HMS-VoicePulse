# 🏥 HMS VoicePulse — AI-Powered Smart Hospital Management System

**Multilingual Clinical Voice Documentation&#x20;**

HMS VoicePulse is an AI-assisted clinical documentation system designed to help healthcare professionals convert spoken patient information into structured clinical notes. It aims to simplify consultation documentation, support multilingual communication, and assist doctors in assessing symptom severity.

## ✨ Features

- **Multilingual Voice Interface:** Designed for English, Hindi, and Tamil clinical input.
- **Clinical Transcription:** Converts spoken input into editable text.
- **Translation:** Supports converting multilingual input into English clinical text.
- **Structured Clinical Notes:** Organizes patient symptoms and other extracted clinical information.
- **Symptom Severity & Triage Support:** Assists in organizing symptoms by severity for clinical review.
- **Patient Records:** Provides a dashboard for patient information and consultation history.
- **Clinical Note Review:** Requires healthcare professional verification before notes are saved to the medical record.
- **Demo Scenarios:** Supports demonstration using sample clinical cases.

## 🖥️ Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI
- **Database:** MongoDB integration and/or local storage, depending on configuration
- **AI and Speech Processing:** Depends on the configured transcription, translation, and language-processing services

## 🏗️ System Overview

1. The healthcare professional selects or registers a patient.
2. The patient’s symptoms are entered through voice input or a supported demo scenario.
3. The system transcribes the spoken input and prepares an English clinical transcript.
4. Clinical information is organized into structured notes.
5. The system presents symptom severity and triage support for review.
6. A qualified healthcare professional reviews and verifies the information before it is saved.

## 🚀 Getting Started

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/) and npm
- [Python](https://www.python.org/) 3.10 or a version supported by the backend dependencies
- Git
- MongoDB, if required by your selected database configuration

### 1. Clone the repository

```bash
git clone https://github.com/adityasahu20272-a11y/HMS-VoicePulse.git
cd HMS-VoicePulse
```

### 2. Set up the frontend

Install the frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed in the terminal. With Vite, this is commonly `http://localhost:5173`, but use the exact URL shown by your terminal.

### 3. Configure the backend

If the repository includes the Python backend, create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

If the project provides an example environment file, copy it:

```bash
cp .env.example .env
```

Edit `.env` and configure the required settings. Use valid credentials for any external AI services or databases the application requires. Never commit `.env` or API keys to GitHub.

### 4. Start the backend

If the backend entry point is `backend.main:app`, run:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

If startup succeeds, API documentation may be available at:

`http://127.0.0.1:8000/docs`

**Note:** The exact startup command and environment variables depend on the files included in the repository. Verify the backend structure and configuration before running it.

## 🔐 Privacy and Clinical Safety

- Use synthetic or de-identified patient information for demonstrations.
- Do not upload real patient records, passwords, database credentials, or API keys to a public repository.
- AI-generated transcripts and clinical notes may contain errors and must be reviewed by a qualified healthcare professional.
- Severity ratings and triage suggestions are intended as decision-support features, not a substitute for professional medical judgment.
- This project should not be treated as a clinically validated diagnostic system unless it has undergone the required validation and approvals.

## 🎓 Academic Project

**Project:** AI-Powered Smart Hospital Management System — HMS VoicePulse
**Institution:** VIT Chennai
**Domain:** Artificial Intelligence, Healthcare Technology, Speech Processing, and Clinical Documentation

## 🛠️ Future Enhancements

- Improve transcription accuracy for regional accents and medical terminology.
- Expand multilingual support.
- Strengthen integration between patient records and clinical documentation.
- Add role-based access control and secure audit logs.
- Evaluate transcription and clinical information extraction with appropriate test datasets.
- Improve accessibility and usability for healthcare professionals.

## 📄 License

A license has not yet been specified. Add an appropriate license before allowing others to reuse or distribute this project.

---

*HMS VoicePulse is an academic prototype intended to support clinical documentation workflows. All generated clinical information requires professional review.*
