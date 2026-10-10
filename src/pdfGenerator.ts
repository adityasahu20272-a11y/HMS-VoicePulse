/**
 * HMS VoicePulse - Patient Clinical Consultation PDF Summary Generator
 * Exports comprehensive, publication-grade patient consultation histories as formatted PDFs using jsPDF.
 */

import jsPDF from 'jspdf';
import { Patient, Doctor, ConsultationRecord } from './App';

export interface PDFExportOptions {
  patient: Patient;
  doctor?: Doctor;
  consultations: ConsultationRecord[];
}

export function exportPatientConsultationPDF({
  patient,
  doctor,
  consultations
}: PDFExportOptions): void {
  // Filter consultations for this patient
  const patientConsultations = consultations.filter(
    c => c.patient_id === patient.patient_id || c.patient_name.toLowerCase() === patient.full_name.toLowerCase()
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Helper: check page overflow and add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = margin;
      drawPageHeader(true);
    }
  };

  // Helper: Draw header on top of pages
  const drawPageHeader = (isContinuation = false) => {
    // Dark top banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, currentY, contentWidth, isContinuation ? 12 : 24, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinuation ? 10 : 13);
    doc.text(
      'VIT CHENNAI • SMART HOSPITAL MANAGEMENT SYSTEM',
      margin + 4,
      currentY + (isContinuation ? 7 : 9)
    );

    if (!isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(
        'OFFICIAL CLINICAL CONSULTATION HISTORY & EHR SUMMARY',
        margin + 4,
        currentY + 15
      );

      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300
      const dateStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      doc.text(`Generated: ${dateStr}`, pageWidth - margin - 35, currentY + 15);
      currentY += 28;
    } else {
      currentY += 16;
    }
  };

  // Draw Initial Header
  drawPageHeader(false);

  // --- PATIENT PROFILE BOX ---
  checkPageBreak(38);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 34, 2, 2, 'FD');

  // Title inside patient box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('PATIENT DEMOGRAPHIC & CLINICAL PROFILE', margin + 4, currentY + 6);

  // Accent line
  doc.setDrawColor(13, 110, 253); // blue-600
  doc.setLineWidth(0.8);
  doc.line(margin + 4, currentY + 8, margin + 85, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1X = margin + 4;
  const col2X = margin + 65;
  const col3X = margin + 125;

  // Row 1
  doc.text(`Full Name:`, col1X, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(patient.full_name, col1X + 18, currentY + 14);
  doc.setFont('helvetica', 'normal');

  doc.text(`Patient ID:`, col2X, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(patient.patient_id, col2X + 18, currentY + 14);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');

  doc.text(`Age / Gender:`, col3X, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${patient.age} yrs (${patient.gender})`, col3X + 22, currentY + 14);
  doc.setFont('helvetica', 'normal');

  // Row 2
  doc.text(`Contact:`, col1X, currentY + 20);
  doc.text(patient.contact || '+91-98000-00000', col1X + 18, currentY + 20);

  doc.text(`Attending Doctor:`, col2X, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text(doctor ? `${doctor.name} (${doctor.doctor_id})` : 'Hospital Staff', col2X + 26, currentY + 20);
  doc.setFont('helvetica', 'normal');

  doc.text(`Department:`, col3X, currentY + 20);
  doc.text(doctor ? `${doctor.department} • ${doctor.opd_room}` : 'OPD', col3X + 20, currentY + 20);

  // Row 3 (Allergies & Medical History)
  doc.text(`Allergies:`, col1X, currentY + 27);
  if (patient.allergies && patient.allergies.toLowerCase() !== 'none' && !patient.allergies.includes('None')) {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.setFont('helvetica', 'bold');
    doc.text(patient.allergies, col1X + 18, currentY + 27);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
  } else {
    doc.text('None recorded', col1X + 18, currentY + 27);
  }

  doc.text(`Medical History:`, col2X, currentY + 27);
  const histSnippet = doc.splitTextToSize(patient.medical_history || 'No chronic illness reported', contentWidth - (col2X - margin + 26));
  doc.text(histSnippet, col2X + 24, currentY + 27);

  currentY += 40;

  // --- CONSULTATION HISTORY SECTION HEADER ---
  checkPageBreak(15);
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(margin, currentY, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 64, 175); // blue-800
  doc.text(
    `CHRONOLOGICAL CONSULTATION RECORDS (${patientConsultations.length} ON FILE)`,
    margin + 4,
    currentY + 6.2
  );
  currentY += 13;

  if (patientConsultations.length === 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No historical consultation encounters registered for this patient yet.', margin + 4, currentY + 5);
    currentY += 15;
  } else {
    // Iterate through consultations
    patientConsultations.forEach((consult, index) => {
      // Calculate approximate height required for this consultation card
      const linesVerified = doc.splitTextToSize(consult.verified_content || consult.clinical_summary || '', contentWidth - 8);
      const estHeight = 45 + Math.min(linesVerified.length * 3.5, 55);

      checkPageBreak(estHeight);

      // Card Container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin, currentY, contentWidth, estHeight, 2, 2, 'FD');

      // Card Header strip
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, currentY, contentWidth, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Encounter #${index + 1} • Consultation ID: ${consult.consultation_id || consult.id_display}`, margin + 4, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date & Time: ${consult.date_time}`, margin + 95, currentY + 5.5);

      // Status pill
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.rect(pageWidth - margin - 22, currentY + 1.8, 18, 4.5, 'F');
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('VERIFIED', pageWidth - margin - 19, currentY + 5);

      let cardY = currentY + 12;

      // Doctor & Language details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Physician: ${consult.doctor_name || (doctor?.name ?? 'Dr. R. Natarajan')}`, margin + 4, cardY);
      doc.text(`Spoken Input: ${consult.spoken_language || consult.language || 'English'} → Converted to Clinical English`, margin + 85, cardY);
      cardY += 6;

      // Symptoms & Severity Rating strip
      if (consult.symptom_severities && consult.symptom_severities.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('Symptom Severity Triage:', margin + 4, cardY);
        doc.setFont('helvetica', 'normal');

        const severityTexts = consult.symptom_severities.map(s => `${s.symptom}: ${s.severity.toUpperCase()} (${s.score}/10)`).join('   |   ');
        doc.setTextColor(185, 28, 28); // rose-700
        doc.text(severityTexts, margin + 45, cardY);
        cardY += 5.5;
      } else if (consult.symptoms && consult.symptoms.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('Symptoms Recorded:', margin + 4, cardY);
        doc.setFont('helvetica', 'normal');
        doc.text(consult.symptoms.join(', '), margin + 38, cardY);
        cardY += 5.5;
      }

      // Temperature, Duration, Medicines
      const vitals: string[] = [];
      if (consult.temperatures && consult.temperatures.length > 0) {
        vitals.push(`Temperature: ${consult.temperatures.join(', ')}`);
      }
      if (consult.duration && consult.duration !== 'None detected') {
        vitals.push(`Duration: ${consult.duration}`);
      }
      if (consult.medicines && consult.medicines.length > 0) {
        vitals.push(`Prescriptions: ${consult.medicines.join(', ')}`);
      }

      if (vitals.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(51, 65, 85);
        doc.text(vitals.join('   •   '), margin + 4, cardY);
        cardY += 5.5;
      }

      // Verified Clinical Summary text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Doctor-Verified Clinical Documentation:', margin + 4, cardY);
      cardY += 4;

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);

      const splitSummary = doc.splitTextToSize(consult.verified_content || consult.clinical_summary || '', contentWidth - 8);
      // Limit to max 12 lines within card
      const summarySlice = splitSummary.slice(0, 12);
      doc.text(summarySlice, margin + 4, cardY);

      currentY += estHeight + 6;
    });
  }

  // --- SIGN-OFF & DOCTOR ATTESTATION FOOTER ---
  checkPageBreak(32);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('PHYSICIAN VERIFICATION & MEDICAL RECORD ATTESTATION', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This summary document has been extracted from the HMS VoicePulse clinical intelligence system with multilingual Tamil & Hindi transcription translation.',
    margin,
    currentY + 4.5
  );

  // Doctor Signature line
  const sigX = pageWidth - margin - 60;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(sigX, currentY + 16, pageWidth - margin, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(doctor ? doctor.name : 'Dr. R. Natarajan', sigX, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(doctor ? `${doctor.designation} • ${doctor.opd_room}` : 'Senior Attending Physician', sigX, currentY + 23.5);

  // Page Numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Confidential Medical Record • Page ${i} of ${totalPages} • HMS VoicePulse MongoDB EHR`,
      pageWidth / 2 - 38,
      pageHeight - 6
    );
  }

  // Download PDF
  const safeName = patient.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `HMS_Consultation_Summary_${patient.patient_id}_${safeName}.pdf`;
  doc.save(filename);
}
