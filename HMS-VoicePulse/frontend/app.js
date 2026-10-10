/**
 * HMS VoicePulse - Main Application Frontend Controller
 * Manages State, Doctor & Patient CRUD, Consultations, and Audio Engine Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- App State ---
  const state = {
    doctors: [],
    patients: [],
    consultations: [],
    activeDoctor: null,
    selectedPatient: null,
    currentTranscript: '',
    extractedDraftNotes: null,
    audioEngine: null,
    isVerified: false
  };

  // --- DOM Elements ---
  const el = {
    // Nav
    tabs: document.querySelectorAll('.nav-tab'),
    panes: document.querySelectorAll('.tab-pane'),

    // Doctor in Header
    activeDoctorSelect: document.getElementById('activeDoctorSelect'),
    btnEditActiveDoctor: document.getElementById('btnEditActiveDoctor'),

    // Header Status
    serverStatusBadge: document.getElementById('serverStatusBadge'),
    serverStatusText: document.getElementById('serverStatusText'),
    micStatusBadge: document.getElementById('micStatusBadge'),
    micStatusText: document.getElementById('micStatusText'),

    // Consultation Patient Selection
    consultationPatientSelect: document.getElementById('consultationPatientSelect'),
    selectedPatientSummary: document.getElementById('selectedPatientSummary'),
    spId: document.getElementById('spId'),
    spName: document.getElementById('spName'),
    spAgeGender: document.getElementById('spAgeGender'),
    spAllergies: document.getElementById('spAllergies'),
    btnQuickAddPatient: document.getElementById('btnQuickAddPatient'),

    // Recording Deck
    micOrb: document.getElementById('micOrb'),
    recordingDeckCard: document.querySelector('.recording-deck-card'),
    recordingStateLabel: document.getElementById('recordingStateLabel'),
    recordingTimer: document.getElementById('recordingTimer'),
    btnStartRecord: document.getElementById('btnStartRecord'),
    btnPauseRecord: document.getElementById('btnPauseRecord'),
    btnStopRecord: document.getElementById('btnStopRecord'),
    micErrorNotice: document.getElementById('micErrorNotice'),
    micErrorText: document.getElementById('micErrorText'),
    speechLangBadge: document.getElementById('speechLangBadge'),

    // Transcript
    transcriptBox: document.getElementById('transcriptBox'),
    btnExtractNLP: document.getElementById('btnExtractNLP'),
    btnClearTranscript: document.getElementById('btnClearTranscript'),

    // Clinical Notes Form
    clinicalNotesForm: document.getElementById('clinicalNotesForm'),
    verificationStatusBadge: document.getElementById('verificationStatusBadge'),
    cnChiefComplaint: document.getElementById('cnChiefComplaint'),
    cnSymptoms: document.getElementById('cnSymptoms'),
    cnDuration: document.getElementById('cnDuration'),
    cnTemperature: document.getElementById('cnTemperature'),
    cnObservations: document.getElementById('cnObservations'),
    cnNegations: document.getElementById('cnNegations'),
    cnMedicines: document.getElementById('cnMedicines'),
    cnDosage: document.getElementById('cnDosage'),
    cnFrequency: document.getElementById('cnFrequency'),
    cnMedicalHistory: document.getElementById('cnMedicalHistory'),
    cnAllergies: document.getElementById('cnAllergies'),
    cnDoctorNotes: document.getElementById('cnDoctorNotes'),
    chkDoctorVerify: document.getElementById('chkDoctorVerify'),
    btnSaveConsultation: document.getElementById('btnSaveConsultation'),
    btnResetConsultationForm: document.getElementById('btnResetConsultationForm'),
    saveSuccessNotice: document.getElementById('saveSuccessNotice'),
    saveSuccessText: document.getElementById('saveSuccessText'),

    // Patients Tab
    patientSearchInput: document.getElementById('patientSearchInput'),
    btnOpenNewPatientModal: document.getElementById('btnOpenNewPatientModal'),
    patientCountBadge: document.getElementById('patientCountBadge'),
    patientsTableBody: document.getElementById('patientsTableBody'),

    // Doctors Tab
    btnOpenNewDoctorModal: document.getElementById('btnOpenNewDoctorModal'),
    doctorCountBadge: document.getElementById('doctorCountBadge'),
    doctorsTableBody: document.getElementById('doctorsTableBody'),

    // History Tab
    historySearchInput: document.getElementById('historySearchInput'),
    historyStatusFilter: document.getElementById('historyStatusFilter'),
    btnRefreshHistory: document.getElementById('btnRefreshHistory'),
    historyCountBadge: document.getElementById('historyCountBadge'),
    historyTableBody: document.getElementById('historyTableBody'),

    // Diagnostics Tab
    diagHost: document.getElementById('diagHost'),
    diagDbPath: document.getElementById('diagDbPath'),
    diagLogPath: document.getElementById('diagLogPath'),
    diagWhisperModel: document.getElementById('diagWhisperModel'),

    // Modals
    patientModal: document.getElementById('patientModal'),
    patientModalTitle: document.getElementById('patientModalTitle'),
    btnClosePatientModal: document.getElementById('btnClosePatientModal'),
    btnCancelPatientModal: document.getElementById('btnCancelPatientModal'),
    btnSavePatientModal: document.getElementById('btnSavePatientModal'),
    patientForm: document.getElementById('patientForm'),
    pmIsEdit: document.getElementById('pmIsEdit'),
    pmPatientId: document.getElementById('pmPatientId'),
    pmFullName: document.getElementById('pmFullName'),
    pmAge: document.getElementById('pmAge'),
    pmGender: document.getElementById('pmGender'),
    pmContact: document.getElementById('pmContact'),
    pmAllergies: document.getElementById('pmAllergies'),
    pmMedicalHistory: document.getElementById('pmMedicalHistory'),
    pmAddress: document.getElementById('pmAddress'),

    doctorModal: document.getElementById('doctorModal'),
    doctorModalTitle: document.getElementById('doctorModalTitle'),
    btnCloseDoctorModal: document.getElementById('btnCloseDoctorModal'),
    btnCancelDoctorModal: document.getElementById('btnCancelDoctorModal'),
    btnSaveDoctorModal: document.getElementById('btnSaveDoctorModal'),
    doctorForm: document.getElementById('doctorForm'),
    dmIsEdit: document.getElementById('dmIsEdit'),
    dmDoctorId: document.getElementById('dmDoctorId'),
    dmName: document.getElementById('dmName'),
    dmDepartment: document.getElementById('dmDepartment'),
    dmDesignation: document.getElementById('dmDesignation'),
    dmOpdRoom: document.getElementById('dmOpdRoom'),
    dmContact: document.getElementById('dmContact'),
    dmEmail: document.getElementById('dmEmail'),

    viewConsultationModal: document.getElementById('viewConsultationModal'),
    btnCloseViewModal: document.getElementById('btnCloseViewModal'),
    btnCloseViewModalBtn: document.getElementById('btnCloseViewModalBtn'),
    vcId: document.getElementById('vcId'),
    vcDate: document.getElementById('vcDate'),
    vcPatient: document.getElementById('vcPatient'),
    vcDoctor: document.getElementById('vcDoctor'),
    vcStatus: document.getElementById('vcStatus'),
    vcTranscript: document.getElementById('vcTranscript'),
    vcVerifiedNotes: document.getElementById('vcVerifiedNotes'),
    vcDoctorNotes: document.getElementById('vcDoctorNotes'),
    vcDoctorNotesWrap: document.getElementById('vcDoctorNotesWrap')
  };

  // --- Audio Engine Setup ---
  state.audioEngine = new window.VoicePulseAudioEngine({
    onInterimTranscript: (text, lang) => {
      if (text) {
        updateLiveTranscript(text, false, lang);
      }
    },
    onFinalTranscript: (text, lang, draftNotes) => {
      if (text) {
        updateLiveTranscript(text, true, lang);
      }
      if (draftNotes) {
        populateExtractedNotes(draftNotes);
      }
    },
    onStatusChange: (status, message) => {
      handleAudioStatusChange(status, message);
    },
    onError: (errorMessage) => {
      showMicError(errorMessage);
    }
  });

  function handleAudioStatusChange(status, message) {
    if (el.recordingStateLabel) el.recordingStateLabel.textContent = message;

    // Reset visual classes
    if (el.recordingDeckCard) el.recordingDeckCard.classList.remove('is-recording');
    if (el.micOrb) {
      el.micOrb.className = 'mic-orb';
    }

    if (status === 'listening') {
      if (el.micOrb) el.micOrb.classList.add('state-recording');
      if (el.recordingDeckCard) el.recordingDeckCard.classList.add('is-recording');
      el.btnStartRecord.disabled = true;
      el.btnPauseRecord.disabled = false;
      el.btnStopRecord.disabled = false;
      setMicStatusBadge('recording', 'Mic: Listening (Live)');
      hideMicError();
    } else if (status === 'paused') {
      if (el.micOrb) el.micOrb.classList.add('state-idle');
      el.btnPauseRecord.textContent = 'Resume';
      setMicStatusBadge('idle', 'Mic: Paused');
    } else if (status === 'stopped' || status === 'idle') {
      if (el.micOrb) el.micOrb.classList.add('state-idle');
      el.btnStartRecord.disabled = false;
      el.btnPauseRecord.disabled = true;
      el.btnPauseRecord.textContent = 'Pause';
      el.btnStopRecord.disabled = true;
      setMicStatusBadge('idle', 'Mic: Ready');
    } else if (status === 'mic_error') {
      if (el.micOrb) el.micOrb.classList.add('state-idle');
      el.btnStartRecord.disabled = false;
      el.btnPauseRecord.disabled = true;
      el.btnStopRecord.disabled = true;
      setMicStatusBadge('idle', 'Mic: Error');
    }
  }

  function setMicStatusBadge(type, text) {
    if (!el.micStatusBadge || !el.micStatusText) return;
    const dot = el.micStatusBadge.querySelector('.status-dot');
    if (dot) dot.className = `status-dot ${type}`;
    el.micStatusText.textContent = text;
  }

  function showMicError(msg) {
    if (el.micErrorNotice && el.micErrorText) {
      el.micErrorText.textContent = msg;
      el.micErrorNotice.classList.remove('hidden');
    }
  }

  function hideMicError() {
    if (el.micErrorNotice) el.micErrorNotice.classList.add('hidden');
  }

  function updateLiveTranscript(text, isFinal, lang) {
    if (lang && el.speechLangBadge) {
      el.speechLangBadge.textContent = lang.toUpperCase();
    }

    if (isFinal) {
      state.currentTranscript = text;
      el.transcriptBox.textContent = text;
      el.btnExtractNLP.disabled = false;
    } else {
      // Show interim live text
      const full = state.currentTranscript ? `${state.currentTranscript} [live: ${text}]` : `[live: ${text}]`;
      el.transcriptBox.textContent = full;
    }
  }

  // --- API Calls ---
  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        el.serverStatusBadge.querySelector('.status-dot').className = 'status-dot online';
        el.serverStatusText.textContent = `Server: ${data.status} (v${data.version})`;
        if (el.diagWhisperModel) el.diagWhisperModel.textContent = `${data.whisper_model} (${data.compute_type}, ${data.device})`;
      } else {
        el.serverStatusBadge.querySelector('.status-dot').className = 'status-dot';
        el.serverStatusText.textContent = 'Server: Degraded';
      }
    } catch (err) {
      el.serverStatusBadge.querySelector('.status-dot').className = 'status-dot';
      el.serverStatusText.textContent = 'Server: Offline';
    }
  }

  async function loadDoctors() {
    try {
      const res = await fetch('/api/doctors');
      if (!res.ok) throw new Error('Failed to load doctors');
      state.doctors = await res.json();
      renderDoctorsSelect();
      renderDoctorsTable();
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPatients() {
    try {
      const query = el.patientSearchInput ? el.patientSearchInput.value : '';
      const url = query ? `/api/patients?q=${encodeURIComponent(query)}` : '/api/patients';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load patients');
      state.patients = await res.json();
      renderPatientsSelect();
      renderPatientsTable();
    } catch (err) {
      console.error(err);
    }
  }

  async function loadConsultations() {
    try {
      const search = el.historySearchInput ? el.historySearchInput.value : '';
      const statusFilter = el.historyStatusFilter ? el.historyStatusFilter.value : '';
      let url = '/api/consultations';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('patient_id', search);
      if ([...params].length > 0) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load consultations');
      state.consultations = await res.json();
      renderHistoryTable();
    } catch (err) {
      console.error(err);
    }
  }

  // --- Render Functions ---
  function renderDoctorsSelect() {
    el.activeDoctorSelect.innerHTML = '';
    if (state.doctors.length === 0) {
      el.activeDoctorSelect.innerHTML = '<option value="">No doctors registered</option>';
      state.activeDoctor = null;
      return;
    }

    state.doctors.forEach((doc, idx) => {
      const opt = document.createElement('option');
      opt.value = doc.doctor_id;
      opt.textContent = `${doc.name} (${doc.department})`;
      el.activeDoctorSelect.appendChild(opt);
    });

    if (!state.activeDoctor && state.doctors.length > 0) {
      state.activeDoctor = state.doctors[0];
      el.activeDoctorSelect.value = state.doctors[0].doctor_id;
    }
  }

  function renderDoctorsTable() {
    el.doctorCountBadge.textContent = `${state.doctors.length} Doctors`;
    if (state.doctors.length === 0) {
      el.doctorsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No doctors registered.</td></tr>';
      return;
    }

    el.doctorsTableBody.innerHTML = state.doctors.map(doc => `
      <tr>
        <td><strong>${escapeHtml(doc.doctor_id)}</strong></td>
        <td>${escapeHtml(doc.name)}</td>
        <td>${escapeHtml(doc.department)}</td>
        <td>${escapeHtml(doc.designation || '-')}</td>
        <td>${escapeHtml(doc.opd_room || '-')}</td>
        <td>${escapeHtml(doc.contact_number || '-')}</td>
        <td><span class="badge">${doc.doctor_id === (state.activeDoctor ? state.activeDoctor.doctor_id : '') ? 'Active' : 'Staff'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.editDoctor('${escapeHtml(doc.doctor_id)}')">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  function renderPatientsSelect() {
    el.consultationPatientSelect.innerHTML = '<option value="">-- Choose Registered Patient --</option>';
    state.patients.forEach(pat => {
      const opt = document.createElement('option');
      opt.value = pat.patient_id;
      opt.textContent = `${pat.full_name} (${pat.patient_id})`;
      el.consultationPatientSelect.appendChild(opt);
    });

    if (state.selectedPatient) {
      el.consultationPatientSelect.value = state.selectedPatient.patient_id;
    }
  }

  function renderPatientsTable() {
    el.patientCountBadge.textContent = `${state.patients.length} Patients`;
    if (state.patients.length === 0) {
      el.patientsTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No patients found.</td></tr>';
      return;
    }

    el.patientsTableBody.innerHTML = state.patients.map(pat => `
      <tr>
        <td><strong>${escapeHtml(pat.patient_id)}</strong></td>
        <td>${escapeHtml(pat.full_name)}</td>
        <td>${pat.age ? pat.age + ' yrs' : '-'} / ${escapeHtml(pat.gender || '-')}</td>
        <td>${escapeHtml(pat.contact_number || '-')}</td>
        <td><span class="${pat.allergies ? 'text-danger font-bold' : 'text-muted'}">${escapeHtml(pat.allergies || 'None')}</span></td>
        <td>${escapeHtml(pat.medical_history || '-')}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="window.selectPatientForConsultation('${escapeHtml(pat.patient_id)}')">Consult</button>
          <button class="btn btn-secondary btn-sm" onclick="window.editPatient('${escapeHtml(pat.patient_id)}')">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  function renderHistoryTable() {
    el.historyCountBadge.textContent = `${state.consultations.length} Records`;
    if (state.consultations.length === 0) {
      el.historyTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No saved consultations found.</td></tr>';
      return;
    }

    el.historyTableBody.innerHTML = state.consultations.map(c => {
      let draftObj = {};
      try {
        if (c.clinical_notes_verified) draftObj = JSON.parse(c.clinical_notes_verified);
        else if (c.clinical_notes_draft) draftObj = JSON.parse(c.clinical_notes_draft);
      } catch (e) {}

      const cc = draftObj.chief_complaint || 'General Checkup';
      const dt = new Date(c.date_time).toLocaleString();

      return `
        <tr>
          <td><strong>${escapeHtml(c.consultation_id)}</strong></td>
          <td>${escapeHtml(dt)}</td>
          <td>${escapeHtml(c.patient_id)}</td>
          <td>${escapeHtml(c.doctor_id)}</td>
          <td>${escapeHtml(cc)}</td>
          <td><span class="badge ${c.status === 'verified' ? 'status-verified' : ''}">${escapeHtml(c.status)}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.viewConsultationRecord('${escapeHtml(c.consultation_id)}')">View</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function populateExtractedNotes(notes) {
    state.extractedDraftNotes = notes;
    el.cnChiefComplaint.value = notes.chief_complaint || '';
    el.cnSymptoms.value = (notes.symptoms || []).join(', ');
    el.cnDuration.value = notes.symptom_duration || '';
    el.cnTemperature.value = notes.temperature || '';
    el.cnObservations.value = (notes.observations || []).join(', ');
    el.cnNegations.value = (notes.negations_recorded || []).join(', ');
    el.cnMedicines.value = (notes.medicines_mentioned || []).join(', ');
    el.cnDosage.value = notes.dosage || '';
    el.cnFrequency.value = notes.frequency || '';
    el.cnMedicalHistory.value = notes.medical_history || '';
    el.cnAllergies.value = notes.allergies || '';

    // Mark as unverified draft
    el.verificationStatusBadge.textContent = 'Draft (Unverified)';
    el.verificationStatusBadge.className = 'verification-badge status-draft';
    el.chkDoctorVerify.checked = false;
    el.btnSaveConsultation.disabled = true;
  }

  // --- Event Listeners ---

  // Tabs switching
  el.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      el.tabs.forEach(t => t.classList.remove('active'));
      el.panes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-history') loadConsultations();
      if (targetId === 'tab-patients') loadPatients();
      if (targetId === 'tab-doctors') loadDoctors();
    });
  });

  // Doctor Select in header
  el.activeDoctorSelect.addEventListener('change', (e) => {
    const selected = state.doctors.find(d => d.doctor_id === e.target.value);
    if (selected) state.activeDoctor = selected;
  });

  // Edit Active Doctor
  el.btnEditActiveDoctor.addEventListener('click', () => {
    if (state.activeDoctor) {
      window.editDoctor(state.activeDoctor.doctor_id);
    }
  });

  // Consultation Patient Selector
  el.consultationPatientSelect.addEventListener('change', (e) => {
    const pat = state.patients.find(p => p.patient_id === e.target.value);
    state.selectedPatient = pat || null;
    updatePatientSummaryBanner();
  });

  function updatePatientSummaryBanner() {
    if (!state.selectedPatient) {
      el.selectedPatientSummary.classList.add('hidden');
      return;
    }
    el.spId.textContent = state.selectedPatient.patient_id;
    el.spName.textContent = state.selectedPatient.full_name;
    el.spAgeGender.textContent = `${state.selectedPatient.age || '-'} yrs / ${state.selectedPatient.gender || '-'}`;
    el.spAllergies.textContent = state.selectedPatient.allergies || 'No known allergies reported';
    el.selectedPatientSummary.classList.remove('hidden');

    // Pre-fill patient's medical history or allergies into clinical note if present
    if (state.selectedPatient.medical_history && !el.cnMedicalHistory.value) {
      el.cnMedicalHistory.value = state.selectedPatient.medical_history;
    }
    if (state.selectedPatient.allergies && !el.cnAllergies.value) {
      el.cnAllergies.value = state.selectedPatient.allergies;
    }
  }

  // Start Recording
  el.btnStartRecord.addEventListener('click', () => {
    if (!state.selectedPatient) {
      alert('Please select or create a patient first before beginning voice documentation.');
      return;
    }
    state.audioEngine.start();
  });

  // Pause Recording
  el.btnPauseRecord.addEventListener('click', () => {
    state.audioEngine.pause();
  });

  // Stop Recording
  el.btnStopRecord.addEventListener('click', () => {
    state.audioEngine.stop();
  });

  // Extract NLP button
  el.btnExtractNLP.addEventListener('click', async () => {
    const transcript = state.currentTranscript || el.transcriptBox.textContent;
    if (!transcript.trim()) return;

    try {
      const res = await fetch('/api/consultations/extract-nlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript })
      });
      if (res.ok) {
        const data = await res.json();
        populateExtractedNotes(data.extracted_data);
      }
    } catch (err) {
      console.error('NLP Extraction error:', err);
    }
  });

  // Clear Transcript
  el.btnClearTranscript.addEventListener('click', () => {
    state.currentTranscript = '';
    el.transcriptBox.innerHTML = '<span class="transcript-placeholder">Spoken clinical words will appear here continuously as you talk...</span>';
    el.btnExtractNLP.disabled = true;
  });

  // Doctor Verification Checkbox
  el.chkDoctorVerify.addEventListener('change', (e) => {
    state.isVerified = e.target.checked;
    if (e.target.checked) {
      el.verificationStatusBadge.textContent = 'Doctor Verified';
      el.verificationStatusBadge.className = 'verification-badge status-verified';
      el.btnSaveConsultation.disabled = false;
    } else {
      el.verificationStatusBadge.textContent = 'Draft (Unverified)';
      el.verificationStatusBadge.className = 'verification-badge status-draft';
      el.btnSaveConsultation.disabled = true;
    }
  });

  // Save Consultation
  el.btnSaveConsultation.addEventListener('click', async () => {
    if (!state.selectedPatient) {
      alert('Please select a patient.');
      return;
    }
    if (!state.activeDoctor) {
      alert('Please select an active doctor.');
      return;
    }

    const verifiedNotes = {
      chief_complaint: el.cnChiefComplaint.value.trim() || null,
      symptoms: el.cnSymptoms.value.split(',').map(s => s.trim()).filter(Boolean),
      symptom_duration: el.cnDuration.value.trim() || null,
      temperature: el.cnTemperature.value.trim() || null,
      observations: el.cnObservations.value.split(',').map(s => s.trim()).filter(Boolean),
      negations_recorded: el.cnNegations.value.split(',').map(s => s.trim()).filter(Boolean),
      medicines_mentioned: el.cnMedicines.value.split(',').map(s => s.trim()).filter(Boolean),
      dosage: el.cnDosage.value.trim() || null,
      frequency: el.cnFrequency.value.trim() || null,
      medical_history: el.cnMedicalHistory.value.trim() || null,
      allergies: el.cnAllergies.value.trim() || null,
      verified_by_doctor_id: state.activeDoctor.doctor_id,
      verification_timestamp: new Date().toISOString()
    };

    const payload = {
      patient_id: state.selectedPatient.patient_id,
      doctor_id: state.activeDoctor.doctor_id,
      transcript_original: state.currentTranscript || el.transcriptBox.textContent || 'No speech recorded',
      language: 'en',
      clinical_notes_draft: state.extractedDraftNotes || verifiedNotes,
      doctor_notes_text: el.cnDoctorNotes.value.trim() || null
    };

    try {
      // 1. Create consultation
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Error saving consultation: ' + (err.detail || 'Unknown error'));
        return;
      }

      const savedCon = await res.json();

      // 2. Mark as verified
      await fetch(`/api/consultations/${savedCon.consultation_id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinical_notes_verified: verifiedNotes,
          doctor_notes_text: el.cnDoctorNotes.value.trim(),
          status: 'verified'
        })
      });

      // Show success
      el.saveSuccessText.textContent = `Consultation #${savedCon.consultation_id} successfully saved to local SQLite database with doctor verification signature.`;
      el.saveSuccessNotice.classList.remove('hidden');

      setTimeout(() => {
        el.saveSuccessNotice.classList.add('hidden');
      }, 6000);

      loadConsultations();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend.');
    }
  });

  // Reset form
  el.btnResetConsultationForm.addEventListener('click', () => {
    el.clinicalNotesForm.reset();
    el.verificationStatusBadge.textContent = 'Draft (Unverified)';
    el.verificationStatusBadge.className = 'verification-badge status-draft';
    el.btnSaveConsultation.disabled = true;
    state.extractedDraftNotes = null;
    state.isVerified = false;
  });

  // --- Modal Logic (Patients) ---
  el.btnQuickAddPatient.addEventListener('click', () => openPatientModal());
  el.btnOpenNewPatientModal.addEventListener('click', () => openPatientModal());
  el.btnClosePatientModal.addEventListener('click', () => el.patientModal.classList.add('hidden'));
  el.btnCancelPatientModal.addEventListener('click', () => el.patientModal.classList.add('hidden'));

  function openPatientModal(editPatientObj = null) {
    el.patientForm.reset();
    if (editPatientObj) {
      el.patientModalTitle.textContent = 'Edit Patient Record';
      el.pmIsEdit.value = 'true';
      el.pmPatientId.value = editPatientObj.patient_id;
      el.pmPatientId.disabled = true;
      el.pmFullName.value = editPatientObj.full_name;
      el.pmAge.value = editPatientObj.age || '';
      el.pmGender.value = editPatientObj.gender || '';
      el.pmContact.value = editPatientObj.contact_number || '';
      el.pmAllergies.value = editPatientObj.allergies || '';
      el.pmMedicalHistory.value = editPatientObj.medical_history || '';
      el.pmAddress.value = editPatientObj.address || '';
    } else {
      el.patientModalTitle.textContent = 'Register New Patient';
      el.pmIsEdit.value = 'false';
      el.pmPatientId.disabled = false;
      const yr = new Date().getFullYear();
      const randNum = Math.floor(100 + Math.random() * 900);
      el.pmPatientId.value = `PAT-${yr}-${randNum}`;
    }
    el.patientModal.classList.remove('hidden');
  }

  el.btnSavePatientModal.addEventListener('click', async () => {
    const isEdit = el.pmIsEdit.value === 'true';
    const patientId = el.pmPatientId.value.trim();
    const fullName = el.pmFullName.value.trim();

    if (!patientId || !fullName) {
      alert('Patient ID and Full Name are required.');
      return;
    }

    const payload = {
      patient_id: patientId,
      full_name: fullName,
      age: el.pmAge.value ? parseInt(el.pmAge.value) : null,
      gender: el.pmGender.value || null,
      contact_number: el.pmContact.value.trim() || null,
      allergies: el.pmAllergies.value.trim() || null,
      medical_history: el.pmMedicalHistory.value.trim() || null,
      address: el.pmAddress.value.trim() || null
    };

    try {
      const url = isEdit ? `/api/patients/${patientId}` : '/api/patients';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.detail || 'Could not save patient'));
        return;
      }

      const saved = await res.json();
      el.patientModal.classList.add('hidden');
      await loadPatients();
      state.selectedPatient = saved;
      el.consultationPatientSelect.value = saved.patient_id;
      updatePatientSummaryBanner();
    } catch (err) {
      console.error(err);
      alert('Failed to save patient.');
    }
  });

  // --- Modal Logic (Doctors) ---
  el.btnOpenNewDoctorModal.addEventListener('click', () => openDoctorModal());
  el.btnCloseDoctorModal.addEventListener('click', () => el.doctorModal.classList.add('hidden'));
  el.btnCancelDoctorModal.addEventListener('click', () => el.doctorModal.classList.add('hidden'));

  function openDoctorModal(editDocObj = null) {
    el.doctorForm.reset();
    if (editDocObj) {
      el.doctorModalTitle.textContent = 'Edit Doctor Profile';
      el.dmIsEdit.value = 'true';
      el.dmDoctorId.value = editDocObj.doctor_id;
      el.dmDoctorId.disabled = true;
      el.dmName.value = editDocObj.name;
      el.dmDepartment.value = editDocObj.department;
      el.dmDesignation.value = editDocObj.designation || '';
      el.dmOpdRoom.value = editDocObj.opd_room || '';
      el.dmContact.value = editDocObj.contact_number || '';
      el.dmEmail.value = editDocObj.email || '';
    } else {
      el.doctorModalTitle.textContent = 'Register Doctor Profile';
      el.dmIsEdit.value = 'false';
      el.dmDoctorId.disabled = false;
      const randNum = Math.floor(100 + Math.random() * 900);
      el.dmDoctorId.value = `DOC-${randNum}`;
    }
    el.doctorModal.classList.remove('hidden');
  }

  el.btnSaveDoctorModal.addEventListener('click', async () => {
    const isEdit = el.dmIsEdit.value === 'true';
    const doctorId = el.dmDoctorId.value.trim();
    const name = el.dmName.value.trim();
    const dept = el.dmDepartment.value.trim();

    if (!doctorId || !name || !dept) {
      alert('Doctor ID, Name, and Department are required.');
      return;
    }

    const payload = {
      doctor_id: doctorId,
      name: name,
      department: dept,
      designation: el.dmDesignation.value.trim() || null,
      opd_room: el.dmOpdRoom.value.trim() || null,
      contact_number: el.dmContact.value.trim() || null,
      email: el.dmEmail.value.trim() || null
    };

    try {
      const url = isEdit ? `/api/doctors/${doctorId}` : '/api/doctors';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Error: ' + (err.detail || 'Could not save doctor profile'));
        return;
      }

      const saved = await res.json();
      el.doctorModal.classList.add('hidden');
      await loadDoctors();
      state.activeDoctor = saved;
      el.activeDoctorSelect.value = saved.doctor_id;
    } catch (err) {
      console.error(err);
      alert('Failed to save doctor.');
    }
  });

  // --- Modal Logic (View Consultation) ---
  el.btnCloseViewModal.addEventListener('click', () => el.viewConsultationModal.classList.add('hidden'));
  el.btnCloseViewModalBtn.addEventListener('click', () => el.viewConsultationModal.classList.add('hidden'));

  window.viewConsultationRecord = async (consultationId) => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`);
      if (!res.ok) throw new Error('Consultation not found');
      const c = await res.json();

      el.vcId.textContent = c.consultation_id;
      el.vcDate.textContent = new Date(c.date_time).toLocaleString();
      el.vcPatient.textContent = c.patient_id;
      el.vcDoctor.textContent = c.doctor_id;
      el.vcStatus.textContent = c.status;
      el.vcTranscript.textContent = c.transcript_original;

      const notesToShow = c.clinical_notes_verified || c.clinical_notes_draft || '{}';
      try {
        const parsed = JSON.parse(notesToShow);
        el.vcVerifiedNotes.textContent = JSON.stringify(parsed, null, 2);
      } catch (e) {
        el.vcVerifiedNotes.textContent = notesToShow;
      }

      if (c.doctor_notes_text) {
        el.vcDoctorNotes.textContent = c.doctor_notes_text;
        el.vcDoctorNotesWrap.classList.remove('hidden');
      } else {
        el.vcDoctorNotesWrap.classList.add('hidden');
      }

      el.viewConsultationModal.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      alert('Could not load consultation record.');
    }
  };

  window.selectPatientForConsultation = (patientId) => {
    const pat = state.patients.find(p => p.patient_id === patientId);
    if (pat) {
      state.selectedPatient = pat;
      el.consultationPatientSelect.value = pat.patient_id;
      updatePatientSummaryBanner();
      // Switch to consultation tab
      document.querySelector('[data-tab="tab-consultation"]').click();
    }
  };

  window.editPatient = (patientId) => {
    const pat = state.patients.find(p => p.patient_id === patientId);
    if (pat) openPatientModal(pat);
  };

  window.editDoctor = (doctorId) => {
    const doc = state.doctors.find(d => d.doctor_id === doctorId);
    if (doc) openDoctorModal(doc);
  };

  // Helper escape
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Boot
  fetchHealth();
  loadDoctors();
  loadPatients();
  loadConsultations();
  setInterval(fetchHealth, 15000);
});
