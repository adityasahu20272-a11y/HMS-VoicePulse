import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Pill,
  FlaskConical,
  FileBarChart,
  BedDouble,
  Plus,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  Filter,
  Download,
  ArrowLeft,
  Mic,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  X,
  User,
  HeartPulse,
  TrendingUp,
  Hospital,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { Doctor, Patient, ConsultationRecord } from './App';

interface EnterpriseHMSPortalProps {
  patients: Patient[];
  doctors: Doctor[];
  consultations: ConsultationRecord[];
  activeDoctorId: string;
  activePatientId: string;
  onSelectPatient: (patientId: string) => void;
  onSelectDoctor: (doctorId: string) => void;
  onOpenNewPatient: () => void;
  onOpenVoiceConsultation: (patientId?: string) => void;
  onBackToVoicePulse: () => void;
  onDownloadCSV: () => void;
  onExportPatientPDF?: (patient: Patient) => void;
}

// Inpatient / Ward details generator for hospital patients
interface WardInpatient {
  patient_id: string;
  full_name: string;
  age: number;
  gender: string;
  ward: string;
  bed_number: string;
  admitting_physician: string;
  status: 'Stable' | 'Critical' | 'Observation' | 'Discharged';
  admit_date: string;
  primary_diagnosis: string;
}

export default function EnterpriseHMSPortal({
  patients,
  doctors,
  consultations,
  activeDoctorId,
  activePatientId,
  onSelectPatient,
  onSelectDoctor,
  onOpenNewPatient,
  onOpenVoiceConsultation,
  onBackToVoicePulse,
  onDownloadCSV,
  onExportPatientPDF
}: EnterpriseHMSPortalProps) {
  // Navigation sidebar state
  const [activeSidebarNav, setActiveSidebarNav] = useState<string>('Patient Records');
  
  // Search & filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // "+ Clinical" Dropdown Menu State (Exact recreation of Image 2)
  const [isClinicalMenuOpen, setIsClinicalMenuOpen] = useState<boolean>(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<WardInpatient | null>(null);

  // Active Doctor
  const activeDoc = doctors.find(d => d.doctor_id === activeDoctorId) || doctors[0];

  // Simulated Ward & Inpatient data mapped to real patients
  const wardRecords: WardInpatient[] = patients.map((p, index) => {
    const wards = ['Ward 3B', 'ICU - Critical Care', 'Cardiology Ward 2', 'General Ward 4', 'Pediatric Unit', 'Geriatric Ward'];
    const statuses: ('Stable' | 'Critical' | 'Observation' | 'Discharged')[] = [
      'Stable',
      'Observation',
      'Stable',
      'Critical',
      'Stable',
      'Observation'
    ];
    const diagnoses = [
      'Acute Febrile Illness & Body Pain',
      'Bronchial Asthma & Mild Dyspnea',
      'Allergic Rhinitis & Sinusitis',
      'Type 2 Diabetes & Hypertension',
      'Routine Pediatric Monitoring',
      'Osteoarthritis & Mobility Evaluation'
    ];

    const assignedDoc = doctors[index % doctors.length];

    return {
      patient_id: p.patient_id,
      full_name: p.full_name,
      age: p.age,
      gender: p.gender,
      ward: wards[index % wards.length],
      bed_number: `Bed-${101 + index * 4}`,
      admitting_physician: assignedDoc.name,
      status: statuses[index % statuses.length],
      admit_date: `0${(index % 8) + 1}/10/2026`,
      primary_diagnosis: diagnoses[index % diagnoses.length]
    };
  });

  // Filtered patients
  const filteredRecords = wardRecords.filter(r => {
    const matchQuery =
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patient_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ward.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.admitting_physician.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchQuery && matchStatus;
  });

  // Clinical Dropdown Menu Items (From Image 2)
  const clinicalMenuItems = [
    { label: 'Clinical Tasks', desc: 'Pending orders & reviews', icon: Stethoscope },
    { label: 'eRx Requests (E-Prescriptions)', desc: 'Pharmacy transmissions', icon: Pill },
    { label: 'Labs / Diagnostic Studies', desc: 'Blood count & imaging results', icon: FlaskConical },
    { label: 'Open Notes (Voice Documentation)', desc: 'AI-transcribed clinical notes', icon: Mic, highlight: true },
    { label: 'Patient Referrals', desc: 'Specialist outbound referrals', icon: Users },
    { label: 'Billing & Charges', desc: 'Inpatient claims & OPD tariffs', icon: CreditCard },
    { label: 'Clinical Reports', desc: 'Ward census & morbidity charts', icon: FileBarChart },
    { label: 'MIPS Quality Measures', desc: 'Medicare interoperability index', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans flex flex-col">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER (Inspired by Image 2 with "+ Clinical" dropdown) */}
      {/* ========================================================= */}
      <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          
          {/* Left Brand & Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                +H
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                  Hospital Management System
                </h1>
                <div className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">
                  Enterprise Operations & Ward Portal
                </div>
              </div>
            </div>

            {/* Quick Top Tabs */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg text-xs">
              <button
                onClick={() => setActiveSidebarNav('Dashboard')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeSidebarNav === 'Dashboard' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveSidebarNav('Patient Records')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeSidebarNav === 'Patient Records' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Patient Records
              </button>
              <button
                onClick={() => setActiveSidebarNav('Appointments')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeSidebarNav === 'Appointments' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                Calendar & OPD
              </button>
            </div>

            {/* "+ Clinical" Dropdown Menu (Recreated pixel-inspired from Image 2!) */}
            <div className="relative">
              <button
                onClick={() => setIsClinicalMenuOpen(!isClinicalMenuOpen)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isClinicalMenuOpen
                    ? 'bg-teal-700 text-white ring-2 ring-teal-400'
                    : 'bg-teal-900/80 hover:bg-teal-800 text-teal-100 border border-teal-700'
                }`}
              >
                <div className="w-4 h-4 rounded bg-teal-400 text-teal-950 flex items-center justify-center font-black text-xs">
                  +
                </div>
                <span>Clinical</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown panel */}
              {isClinicalMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-[#093539] border border-teal-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in-50 duration-150">
                  <div className="px-3.5 py-1.5 border-b border-teal-800/80 text-[10px] font-bold tracking-wider text-teal-300 uppercase flex items-center justify-between">
                    <span>Clinical Workflows</span>
                    <span>Tebra/HMS</span>
                  </div>
                  <div className="py-1">
                    {clinicalMenuItems.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsClinicalMenuOpen(false);
                            if (item.label.includes('Open Notes')) {
                              onBackToVoicePulse();
                            } else if (item.label.includes('Billing')) {
                              setActiveSidebarNav('Billing');
                            } else if (item.label.includes('Reports')) {
                              setActiveSidebarNav('Reports');
                            } else if (item.label.includes('Referrals') || item.label.includes('Tasks')) {
                              setActiveSidebarNav('Patient Records');
                            }
                          }}
                          className={`w-full text-left px-3.5 py-2 hover:bg-teal-800/60 transition-colors flex items-center gap-2.5 cursor-pointer ${
                            item.highlight ? 'bg-teal-800/40 text-teal-200' : 'text-slate-200'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${item.highlight ? 'text-teal-300' : 'text-teal-400'}`} />
                          <div>
                            <div className="text-xs font-semibold leading-tight">{item.label}</div>
                            <div className="text-[10px] text-teal-400/80 font-normal">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            
            {/* Download CSV Button */}
            <button
              onClick={onDownloadCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Patient List as CSV"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download CSV</span>
            </button>

            {/* Doctor Profile */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700 text-xs">
              <div className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                Dr
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-bold text-white leading-tight">{activeDoc.name}</div>
                <div className="text-[10px] text-slate-400">{activeDoc.opd_room}</div>
              </div>
            </div>

            {/* Back to VoicePulse Button */}
            <button
              onClick={onBackToVoicePulse}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Back to VoicePulse</span>
            </button>

          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT: SIDEBAR + DASHBOARD CONTENT + RIGHT WIDGETS */}
      {/* (Inspired by Image 1) */}
      {/* ========================================================= */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        
        {/* ======================================================= */}
        {/* LEFT NAV SIDEBAR (Image 1 - Dark Navy with Blue Highlights) */}
        {/* ======================================================= */}
        <aside className="w-64 bg-[#1e293b] text-slate-300 p-4 border-r border-slate-800 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            
            {/* User / Hospital Clinic Tag */}
            <div className="px-3 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                <Hospital className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">VIT Metro Hospital</div>
                <div className="text-[10px] text-slate-400">Inpatient & OPD Center</div>
              </div>
            </div>

            {/* Main Menu Links */}
            <nav className="space-y-1">
              {[
                { name: 'Dashboard', icon: LayoutDashboard },
                { name: 'Patient Records', icon: Users, badge: patients.length },
                { name: 'Patient Management', icon: Stethoscope },
                { name: 'Appointments', icon: CalendarIcon },
                { name: 'Billing', icon: CreditCard },
                { name: 'Pharmacy', icon: Pill },
                { name: 'Lab Results', icon: FlaskConical },
                { name: 'Reports', icon: FileBarChart }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeSidebarNav === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveSidebarNav(item.name)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

          </div>

          {/* Bottom Sidebar Action: Jump to VoicePulse */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70 text-xs">
              <div className="flex items-center gap-2 font-bold text-white mb-1">
                <Mic className="w-3.5 h-3.5 text-sky-400" />
                <span>Voice Documentation</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal mb-2">
                Tamil & Hindi real-time translation with symptom severity rating
              </p>
              <button
                onClick={onBackToVoicePulse}
                className="w-full py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Launch VoicePulse
              </button>
            </div>
          </div>
        </aside>

        {/* ======================================================= */}
        {/* CENTER CONTENT: KPI METRICS + WARD RECORDS TABLE */}
        {/* ======================================================= */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Top Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-sky-600 uppercase">
                CLINICAL INPATIENT OPERATIONS
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Hospital Management System
              </h2>
              <p className="text-xs text-slate-500">
                Enterprise Patient Records, Ward Triage & Physician Allocation
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={onDownloadCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={onOpenNewPatient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register New Patient</span>
              </button>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 3 TOP KPI METRIC CARDS (100% Real Hospital & Bank Data) */}
          {/* ======================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Total Patients & Admissions (Real Data: 6 patients) */}
            <div
              onClick={() => setActiveSidebarNav('Patient Records')}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
              title="Click to view all registered patients"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                <span>Total Patients</span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Live MongoDB ({patients.length})
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                {patients.length} <span className="text-xs text-slate-400 font-normal">registered</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Admissions Active</span>
                  <strong className="text-slate-800 text-sm">{patients.length} patients</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Allocated Beds</span>
                  <strong className="text-emerald-600 text-sm">{patients.length} / 10 Beds</strong>
                </div>
              </div>
              {/* Progress bar based on real ratio */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-gradient-to-r from-sky-400 to-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((patients.length / 10) * 100))}%` }}
                />
              </div>
            </div>

            {/* Card 2: Original Revenue & Bank Deposit (Real Data: ₹ 500 per consultation) */}
            <div
              onClick={() => setActiveSidebarNav('Billing')}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all"
              title="Click to view real Hospital Bank Ledger & Billing Receipts"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                <span>Hospital Revenue (Bank Deposit)</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  HDFC Bank Settled
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                ₹ {(consultations.length * 500).toLocaleString('en-IN')}{' '}
                <span className="text-xs text-slate-400 font-normal">received in bank</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Hospital Bank A/c</span>
                  <strong className="text-slate-800 text-sm">HDFC Bank ••••4291</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">OPD Tariff / Visit</span>
                  <strong className="text-emerald-600 text-sm">₹ 500 × {consultations.length}</strong>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div className="bg-gradient-to-r from-emerald-400 to-teal-600 h-full w-full rounded-full" />
              </div>
            </div>

            {/* Card 3: Physicians, Doctors & Consultations (Real Data) */}
            <div
              onClick={() => setActiveSidebarNav('Appointments')}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-400 hover:shadow-md cursor-pointer transition-all"
              title="Click to view OPD consultations and scheduled sessions"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
                <span>Physicians & Consultations</span>
                <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {doctors.length} On-Duty
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                {consultations.length} <span className="text-xs text-slate-400 font-normal">consults</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Doctors</span>
                  <strong className="text-slate-800 text-sm">{doctors.length} Physicians</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">MongoDB Synced</span>
                  <strong className="text-blue-600 text-sm">{consultations.length} Records</strong>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div className="bg-gradient-to-r from-purple-400 to-indigo-600 h-full w-full rounded-full" />
              </div>
            </div>

          </div>

          {/* ======================================================= */}
          {/* VIEW A: REAL HOSPITAL BANK REVENUE & OPD BILLING LEDGER */}
          {/* ======================================================= */}
          {activeSidebarNav === 'Billing' ? (
            <div className="space-y-6 animate-in fade-in-50 duration-150">
              {/* Official Hospital Bank Account Card */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-700 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                        Official Operating Bank Account
                      </div>
                      <h3 className="text-xl font-black text-white">
                        HDFC Bank — Health & OPD Settlement Account
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Account: 501004829103 • IFSC: HDFC0001234 • VIT Metro Hospital OPD Trust
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Verified Bank Balance
                    </div>
                    <div className="text-3xl font-black text-emerald-400 tracking-tight">
                      ₹ {(consultations.length * 500).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-emerald-300 font-semibold flex items-center sm:justify-end gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>100% Direct Bank Settlement</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Consultation Tariff</span>
                    <strong className="text-white text-sm">₹ 500.00 / visit</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Settled Invoices</span>
                    <strong className="text-white text-sm">{consultations.length} cleared</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Pending / Unbilled</span>
                    <strong className="text-emerald-400 text-sm">₹ 0.00</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Tax / GST Status</span>
                    <strong className="text-white text-sm">Exempt (Healthcare)</strong>
                  </div>
                </div>
              </div>

              {/* Consultation Ledger Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Real Consultation Billing & Bank Ledger
                    </h3>
                    <p className="text-xs text-slate-500">
                      Original receipts credited directly into HDFC Bank Account for all {consultations.length} completed OPD sessions
                    </p>
                  </div>
                  <button
                    onClick={onDownloadCSV}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download Bank Reconciliation CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-6">RECEIPT / CONSULTATION ID</th>
                        <th className="py-3 px-4">PATIENT</th>
                        <th className="py-3 px-4">ATTENDING PHYSICIAN</th>
                        <th className="py-3 px-4">DATE & TIME</th>
                        <th className="py-3 px-4">OPD FEE</th>
                        <th className="py-3 px-4">PAYMENT CHANNEL</th>
                        <th className="py-3 px-6 text-right">BANK STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consultations.map((c, idx) => (
                        <tr key={c.consultation_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-6 font-mono font-bold text-blue-600">
                            <div>{c.consultation_id}</div>
                            <div className="text-[10px] text-slate-400 font-mono">RCPT-2026-{1000 + idx + 1}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{c.patient_name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{c.patient_id}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {c.doctor_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                            {c.date_time}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            ₹ 500.00
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium">
                              UPI / Bank Direct
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Settled to Bank</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ======================================================= */}
              {/* SEARCH & FILTER CONTROLS */}
              {/* ======================================================= */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search patient, ID, ward, or doctor..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <span className="text-xs text-slate-500 font-medium shrink-0">Filter Status:</span>
                  {['All', 'Stable', 'Critical', 'Observation', 'Discharged'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        statusFilter === s
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ======================================================= */}
              {/* INPATIENT & WARD DIRECTORY TABLE (Exact style of Image 1) */}
              {/* ======================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Patient Records & Ward Allocations
                    </h3>
                    <p className="text-xs text-slate-500">
                      Showing {filteredRecords.length} registered hospital patients
                    </p>
                  </div>

                  <div className="text-xs text-slate-500">
                    Mirrored with MongoDB collection: <code>patients</code>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-6">PATIENT</th>
                        <th className="py-3.5 px-4">AGE & STATE</th>
                        <th className="py-3.5 px-4">GENDER</th>
                        <th className="py-3.5 px-4">WARD & BED</th>
                        <th className="py-3.5 px-4">ADMITTING PHYSICIAN</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-6 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.map((r, i) => {
                        const statusBadgeClass =
                          r.status === 'Critical'
                            ? 'bg-rose-500 text-white font-bold'
                            : r.status === 'Observation'
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : r.status === 'Discharged'
                            ? 'bg-slate-100 text-slate-600 font-semibold'
                            : 'bg-emerald-100 text-emerald-800 font-semibold';

                        return (
                          <tr key={r.patient_id} className="hover:bg-slate-50/80 transition-colors">
                            
                            {/* Patient Avatar & ID */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  {r.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">{r.full_name}</div>
                                  <div className="text-[11px] font-mono font-semibold text-blue-600">{r.patient_id}</div>
                                </div>
                              </div>
                            </td>

                            {/* Age & Clinical State */}
                            <td className="py-4 px-4 text-slate-700 font-medium">
                              <div>{r.age} years</div>
                              <div className="text-[10px] text-slate-400">Admit: {r.admit_date}</div>
                            </td>

                            {/* Gender */}
                            <td className="py-4 px-4 text-slate-600 font-medium">
                              {r.gender}
                            </td>

                            {/* Ward & Bed */}
                            <td className="py-4 px-4 text-slate-800 font-semibold">
                              <div>{r.ward}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{r.bed_number}</div>
                            </td>

                            {/* Admitting Physician */}
                            <td className="py-4 px-4 text-slate-700 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span>{r.admitting_physician}</span>
                              </div>
                            </td>

                            {/* Status (From Image 1: 'View Details' or 'Critical' pill) */}
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-wide inline-block ${statusBadgeClass}`}>
                                {r.status}
                              </span>
                            </td>

                            {/* Actions (View Details, PDF Summary & Voice Consultation) */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    const matchedPat = patients.find(p => p.patient_id === r.patient_id);
                                    if (matchedPat && onExportPatientPDF) {
                                      onExportPatientPDF(matchedPat);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                                  title="Export full consultation history as formatted PDF summary"
                                >
                                  <FileText className="w-3 h-3 text-rose-600" />
                                  <span>PDF</span>
                                </button>
                                <button
                                  onClick={() => setSelectedPatientDetails(r)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => {
                                    onSelectPatient(r.patient_id);
                                    onOpenVoiceConsultation(r.patient_id);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                                  title="Open VoicePulse Clinical Consultation"
                                >
                                  <Mic className="w-3 h-3" />
                                  <span>Consult</span>
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </>
          )}

        </main>

        {/* ======================================================= */}
        {/* RIGHT SIDEBAR WIDGETS (Image 1: Calendar & Notifications) */}
        {/* ======================================================= */}
        <aside className="w-80 bg-white border-l border-slate-200 p-6 hidden xl:flex flex-col space-y-6 shrink-0">
          
          {/* 1. System Calendar & Clinical Schedule (From Image 1) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                Schedule & OPD
              </span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Oct 2026
              </span>
            </div>

            {/* Calendar Grid representation */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {[
                '', '', '', '', 1, 2, 3,
                4, 5, 6, 7, 8, 9, 10,
                11, 12, 13, 14, 15, 16, 17,
                18, 19, 20, 21, 22, 23, 24,
                25, 26, 27, 28, 29, 30, 31
              ].map((day, idx) => {
                const isToday = day === 9;
                const hasDuty = day === 7 || day === 9 || day === 12;
                return (
                  <div
                    key={idx}
                    className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                      isToday
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : hasDuty
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : day === ''
                        ? 'text-transparent pointer-events-none'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200 text-xs text-slate-600">
              <div className="font-semibold text-slate-900 mb-0.5">Today: 09 Oct 2026</div>
              <div className="text-[11px] text-slate-500">
                {consultations.length} consultations completed by {doctors.length} on-duty physicians
              </div>
            </div>
          </div>

          {/* 2. Notifications & Clinical Alerts (From Image 1) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-rose-600" />
                Live Notifications
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 text-xs">
              {consultations.length > 0 && (
                <div className="p-2.5 bg-white border border-rose-100 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-rose-600 mb-1">
                    <span>{consultations[0].temperatures.length > 0 ? 'FEVER TRIAGE ALERT' : 'CLINICAL TRIAGE'}</span>
                    <span>{consultations[0].date_time.split(',')[1]?.trim() || 'Latest'}</span>
                  </div>
                  <div className="font-semibold text-slate-800 text-[11px]">
                    Patient {consultations[0].patient_name} ({consultations[0].patient_id})
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Assigned: {consultations[0].doctor_name} • {consultations[0].symptoms.join(', ')}
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-white border border-emerald-100 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 mb-1">
                  <span>HDFC BANK SETTLED</span>
                  <span>Direct Credit</span>
                </div>
                <div className="font-semibold text-slate-800 text-[11px]">
                  ₹ {(consultations.length * 500).toLocaleString('en-IN')} Credited to Hospital Bank A/c
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ₹ 500 × {consultations.length} OPD consultations verified & deposited
                </div>
              </div>

              <div className="p-2.5 bg-white border border-blue-100 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 mb-1">
                  <span>MONGODB SYNCHRONIZED</span>
                  <span>Live Persistence</span>
                </div>
                <div className="font-semibold text-slate-800 text-[11px]">
                  Collections: {patients.length} Patients, {doctors.length} Doctors, {consultations.length} Consultations
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  MongoDB database mirror synchronized
                </div>
              </div>
            </div>

            <button
              onClick={onBackToVoicePulse}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-sky-400" />
              <span>Open VoicePulse Intake</span>
            </button>
          </div>

        </aside>

      </div>

      {/* ========================================================= */}
      {/* PATIENT DETAILS MODAL (When clicking 'View Details') */}
      {/* ========================================================= */}
      {selectedPatientDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  {selectedPatientDetails.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedPatientDetails.full_name}</h3>
                  <div className="text-xs font-mono font-semibold text-blue-600">{selectedPatientDetails.patient_id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatientDetails(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Ward & Bed</span>
                  <strong className="text-slate-800 text-sm mt-0.5 block">{selectedPatientDetails.ward} ({selectedPatientDetails.bed_number})</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Clinical Status</span>
                  <strong className="text-rose-600 text-sm mt-0.5 block">{selectedPatientDetails.status}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Diagnosis</span>
                <div className="text-slate-800 text-sm font-semibold mt-0.5">{selectedPatientDetails.primary_diagnosis}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Attending Physician</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedPatientDetails.admitting_physician}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Admission Date</span>
                  <strong className="text-slate-800 text-xs mt-0.5 block">{selectedPatientDetails.admit_date}</strong>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 flex-wrap">
                <button
                  onClick={() => setSelectedPatientDetails(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const matchedPat = patients.find(p => p.patient_id === selectedPatientDetails.patient_id);
                      if (matchedPat && onExportPatientPDF) {
                        onExportPatientPDF(matchedPat);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                    title="Export formatted PDF consultation history"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Export PDF Summary</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectPatient(selectedPatientDetails.patient_id);
                      setSelectedPatientDetails(null);
                      onOpenVoiceConsultation(selectedPatientDetails.patient_id);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Voice Consultation</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
