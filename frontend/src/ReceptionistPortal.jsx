import { useState, useEffect } from 'react';

const API = 'https://vitalsflow-production.up.railway.app';


// ─── AFTERCARE LINK BOX COMPONENT ──────────────────────────────────────────
function AftercareLinkBox({ phone }) {

  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        marginTop: "0.75rem",
        background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
        border: "1px solid #86efac",
        borderRadius: 12,
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1rem" }}>✅</span>
        <span style={{
          color: "#15803d",
          fontWeight: 800,
          fontSize: "0.85rem",
          textTransform: 'uppercase'
        }}>
          WhatsApp AI Activated
        </span>
      </div>

      <div style={{ color: "#166534", fontSize: "0.8rem" }}>
        The automated AI aftercare message has been sent to the patient.
        They can reply directly on WhatsApp to talk with the AI nurse.
      </div>

      <a
        href={`https://wa.me/${cleanPhone}`}
        target="_blank"
        rel="noreferrer"
        style={{
          textDecoration: "none",
          background: "#25d366",
          color: "white",
          borderRadius: 8,
          padding: "0.5rem 1rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          textAlign: "center"
        }}
      >
        Send Manually via WhatsApp
      </a>

    </div>
  );
}

// ─── MAIN RECEPTIONIST COMPONENT ──────────────────────────────────────────
export default function Receptionist() {
  const [activeTab, setActiveTab] = useState('waiting');
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [paidLinks, setPaidLinks] = useState({});
  const [selectedPatientView, setSelectedPatientView] = useState(null);

  const [form, setForm] = useState({
    name: '', age: '', phone: '',
    sbp: '', dbp: '', hr: '', rr: '', bt: '', saturation: '',
    doctor_id: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    try {
      const [vRes, bRes, dRes] = await Promise.all([
        fetch(`${API}/api/visits`),
        fetch(`${API}/api/bills`),
        fetch(`${API}/api/doctors`)
      ]);
      setVisits(await vRes.json());
      setBills(await bRes.json());
      setDoctors(await dRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const triageRes = await fetch(`${API}/api/triage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SBP: parseFloat(form.sbp), DBP: parseFloat(form.dbp), HR: parseFloat(form.hr), RR: parseFloat(form.rr), BT: parseFloat(form.bt), Saturation: parseFloat(form.saturation) }),
      });
      const triageData = await triageRes.json();
      const alert = triageData.triage_alert;

      let calculatedUrgency = 'medium';
      if (alert?.color === 'red') calculatedUrgency = 'critical';
      else if (alert?.color === 'orange') calculatedUrgency = 'high';
      else if (alert?.color === 'yellow') calculatedUrgency = 'medium';
      else if (alert?.color === 'green') calculatedUrgency = 'low';

      const pRes = await fetch(`${API}/api/patients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, age: parseInt(form.age), phone: form.phone })
      });
      const patient = await pRes.json();

      await fetch(`${API}/api/visits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patient.id,
          symptoms: `AI Triage: ${alert?.status || 'Assessed'} - ${alert?.action || ''}`, 
          sbp: parseFloat(form.sbp) || 0, dbp: parseFloat(form.dbp) || 0, hr: parseFloat(form.hr) || 0,
          rr: parseFloat(form.rr) || 0, bt: parseFloat(form.bt) || 0, saturation: parseFloat(form.saturation) || 0,
          urgency: calculatedUrgency,
          doctor_id: form.doctor_id || null
        })
      });

      showToast(`${form.name} registered (${calculatedUrgency.toUpperCase()} Priority)!`);
      setForm({ name:'',age:'',phone:'',sbp:'',dbp:'',hr:'',rr:'',bt:'',saturation:'',doctor_id:'' });
      setShowRegisterForm(false);
      fetchAll();
    } catch (err) {
      showToast('Registration failed. Check backend.', 'error');
    }
    setLoading(false);
  };

  const assignDoctor = async (visitId, doctorId, e) => {
    e.stopPropagation(); 
    await fetch(`${API}/api/visits/${visitId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doctorId, status: 'waiting' })
    });
    showToast('Doctor assigned!');
    fetchAll();
  };

  const markPaid = async (billId, visitId, e) => {
    if (e) e.stopPropagation();
    await fetch(`${API}/api/bills/${billId}/pay`, { method: "PATCH" });
    showToast("Bill marked as paid!");
  
    setPaidLinks((prev) => ({ ...prev, [billId]: visitId }));
  
    if (selectedPatientView && selectedPatientView.bill?.id === billId) {
      setSelectedPatientView({
        ...selectedPatientView,
        bill: { ...selectedPatientView.bill, status: "paid" },
      });
    }
    fetchAll();
  };

  const openPatientView = (visit) => {
    const associatedBill = bills.find(b => b.visit_id === visit.id);
    setSelectedPatientView({ ...visit, bill: associatedBill });
  };

  const urgencyConfig = {
    critical: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
    high:     { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'High' },
    medium:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Medium' },
    low:      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Low' },
  };

  const statusConfig = {
    waiting:         { color: '#d97706', bg: '#fef9c3', label: 'Waiting' },
    in_consultation: { color: '#2563eb', bg: '#eff6ff', label: 'In Consultation' },
    completed:       { color: '#2563eb', bg: '#eff6ff', label: 'Completed' },
    billed:          { color: '#0891b2', bg: '#ecfeff', label: 'Billed' },
    paid:            { color: '#16a34a', bg: '#f0fdf4', label: 'Paid' },
  };

  const waitingVisits = visits.filter(v => ['waiting', 'in_consultation'].includes(v.status));
  const completedVisits = visits.filter(v => ['completed', 'paid'].includes(v.status));
  const pendingBills = bills.filter(b => b.status === 'pending');
  const paidBills = bills.filter(b => b.status === 'paid');

  const Icons = {
    Brand: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.18 2.18 0 0 0 0 3.08c.86.86 2.26.86 3.12 0l2.8-2.8"/><path d="m15 11-3 3"/></svg>,
    Waiting: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>,
    Completed: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    Billing: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
    Patients: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Pending: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
    Paid: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    EmptyWaiting: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>,
    EmptyCompleted: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        :root { --primary: #2563EB; --primary-dark: #1D4ED8; --secondary: #64748B; --success: #16a34a; --danger: #dc2626; --warning: #d97706; --background: #F3F4F6; --sidebar-bg: #0A192F; --card-bg: #ffffff; --text-main: #111827; --text-muted: #6B7280; --border-color: #E5E7EB; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background:var(--background); color: var(--text-main); }
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        .r-layout { display:flex; height:100vh; overflow:hidden; }
        .r-sidebar { width:260px; min-width:260px; background:var(--sidebar-bg); display:flex; flex-direction:column; color: #94A3B8; }
        .r-brand { padding:1.5rem 1.5rem; display:flex; align-items:center; gap:1rem; color: white; }
        .r-brand-icon { width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); display:flex; align-items:center; justify-content:center; color:white; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .r-brand-name { font-size:1.25rem; font-weight:800; letter-spacing: -0.02em; line-height: 1.2; }
        .r-brand-sub  { font-size:0.7rem; color:#60A5FA; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
        .r-nav-section { font-size:0.7rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.05em; padding:1.5rem 1.5rem 0.75rem; }
        .r-nav-item { display:flex; align-items:center; gap:1rem; padding:0.85rem 1.5rem; cursor:pointer; border-left:3px solid transparent; transition:all 0.2s ease; margin:2px 0; color: #CBD5E1; }
        .r-nav-item:hover { background:rgba(255,255,255,0.05); color: white; }
        .r-nav-item.active { background:rgba(37,99,235,0.1); border-left-color:var(--primary); color: white; }
        .r-nav-icon { display:flex; align-items:center; justify-content:center; transition:all 0.2s; opacity: 0.8; }
        .r-nav-item.active .r-nav-icon { opacity: 1; color: var(--primary); }
        .r-nav-label { font-size:0.95rem; font-weight:600; display:block; }
        .r-nav-sub { font-size:0.75rem; opacity: 0.7; margin-top: 2px; display: block;}
        .r-stats { padding:1.5rem; margin-top:auto; display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .r-stat-box { background:rgba(255,255,255,0.05); border-radius:12px; padding:1rem; text-align:center; border: 1px solid rgba(255,255,255,0.05); }
        .r-stat-num { font-size:1.5rem; font-weight:800; color:white; }
        .r-stat-lbl { font-size:0.7rem; color:#94A3B8; text-transform:uppercase; letter-spacing:0.05em; margin-top: 4px; font-weight: 600; }
        .r-sidebar-footer { padding:1rem 1.5rem; display:flex; align-items:center; gap:0.75rem; background: rgba(0,0,0,0.2); font-size:0.8rem; font-weight:500; color: #CBD5E1;}
        .r-status-dot { width:8px; height:8px; border-radius:50%; background:var(--primary); box-shadow:0 0 10px rgba(59,130,246,0.5); }
        .r-main { flex:1; display:flex; flex-direction:column; overflow:hidden; background: var(--background); }
        .r-topbar { height:72px; min-height:72px; background:var(--card-bg); border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; padding:0 2rem; }
        .r-topbar-title { font-size:1.25rem; font-weight:800; color:var(--text-main); }
        .r-topbar-title span { color:var(--primary); }
        .r-topbar-sub { font-size:0.85rem; color:var(--text-muted); margin-top:2px; }
        .r-topbar-right { display:flex; align-items:center; gap:1.5rem; }
        .r-user-chip { display:flex; align-items:center; gap:0.75rem; background:white; border:1px solid var(--border-color); border-radius:12px; padding:0.5rem 1rem 0.5rem 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .r-avatar { width:36px; height:36px; border-radius:10px; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:700; color:white; }
        .r-user-name { font-size:0.9rem; font-weight:700; color:var(--text-main); }
        .r-user-role { font-size:0.7rem; color:var(--text-muted); font-weight: 500; }
        .r-register-btn { display:flex; align-items:center; gap:0.5rem; background:var(--primary); color:white; border:none; border-radius:10px; padding:0.7rem 1.2rem; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .r-register-btn:hover { background: var(--primary-dark); }
        .r-content { flex:1; overflow:hidden; padding:2rem; display:flex; flex-direction:column; gap:1.5rem; }
        .r-page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
        .r-page-title { font-size:1.75rem; font-weight:800; color:var(--text-main); letter-spacing: -0.03em; }
        .r-page-desc { font-size:0.95rem; color:var(--text-muted); }
        .r-card { background:var(--card-bg); border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); display: flex; flex-direction: column; border: 1px solid var(--border-color); }
        .r-card-header { padding:1.25rem 1.5rem; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:1rem; background: var(--card-bg); }
        .r-card-icon-box { width:38px; height:38px; border-radius:10px; background:#EFF6FF; display:flex; align-items:center; justify-content:center; color: var(--primary); }
        .r-card-title { font-size:0.9rem; font-weight:700; color:var(--text-main); text-transform:uppercase; letter-spacing:0.05em; }
        .r-card-body { padding:1.5rem; overflow-y:auto; max-height:calc(100vh - 320px); flex: 1; }
        .r-patient-row { background:white; border:1px solid var(--border-color); border-radius:12px; padding:1.25rem; margin-bottom:1rem; display:flex; align-items:center; gap:1.5rem; transition:all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; }
        .r-patient-row:hover { border-color:var(--primary); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transform: translateY(-1px); }
        .r-patient-info { flex:1; }
        .r-patient-name { font-size:1.1rem; font-weight:700; color:var(--text-main); }
        .r-patient-meta { font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem; font-weight: 500;}
        .r-patient-symptoms { font-size:0.9rem; color:var(--secondary); margin-top:0.75rem; font-style:italic; background: #F8FAFC; padding: 0.5rem 0.75rem; border-radius: 8px; display: inline-block;}
        .r-badge { padding:0.4rem 0.8rem; border-radius:99px; font-size:0.75rem; font-weight:700; }
        .r-urgency-badge { padding:0.4rem 0.8rem; border-radius:8px; font-size:0.75rem; font-weight:700; border:1px solid; display: flex; align-items: center; gap: 0.4rem;}
        .r-assign-select { background:white; border:1px solid var(--border-color); border-radius:8px; padding:0.5rem 0.75rem; font-size:0.85rem; font-weight: 500; color:var(--text-main); outline:none; cursor:pointer; font-family:'Inter',sans-serif; transition: border 0.2s; }
        .r-assign-select:focus { border-color:var(--primary); }
        .r-vitals-row { display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.75rem; }
        .r-vital-chip { background:#EFF6FF; color:var(--primary-dark); border:1px solid #BFDBFE; padding:0.25rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:600; }
        .r-bill-row { background:white; border:1px solid var(--border-color); border-radius:12px; padding:1.5rem; margin-bottom:1rem; display:flex; align-items:center; justify-content:space-between; gap:1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition:all 0.2s ease; cursor: pointer; }
        .r-bill-row:hover { border-color: var(--primary); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transform: translateY(-1px); }
        .r-bill-amount { font-size:1.5rem; font-weight:800; color:var(--danger); font-family:'Inter',sans-serif; }
        .r-pay-btn { background:var(--success); color:white; border:none; border-radius:10px; padding:0.6rem 1.2rem; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .r-pay-btn:hover { background: #15803d; }
        .r-paid-chip { background:#F0FDF4; color:var(--success); border:1px solid #BBF7D0; padding:0.4rem 1rem; border-radius:8px; font-size:0.85rem; font-weight:800; display: flex; align-items: center; gap: 0.4rem; }
        .r-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; }
        .r-modal { background:var(--card-bg); border-radius:20px; width:650px; max-width:95%; max-height:90vh; overflow-y:auto; box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .r-modal-header { padding:1.5rem 2rem; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; background: #fafaf9; }
        .r-modal-title { font-size:1.25rem; font-weight:800; color:var(--text-main); }
        .r-close-btn { background:transparent; border:none; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted); transition: all 0.2s; font-size: 1.2rem; }
        .r-close-btn:hover { color: var(--text-main); }
        .r-modal-body { padding:2rem; }
        .r-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        .r-form-full { grid-column:1/-1; }
        .r-field { display:flex; flex-direction:column; gap:0.5rem; }
        .r-label { font-size:0.85rem; font-weight:600; color:var(--text-main); }
        .r-input, .r-select, .r-textarea { background:white; border:1px solid var(--border-color); border-radius:10px; padding:0.75rem 1rem; color:var(--text-main); font-size:0.95rem; outline:none; transition:all 0.2s; font-family:'Inter',sans-serif; }
        .r-input:focus, .r-select:focus, .r-textarea:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(37,99,235,0.1); }
        .r-input::placeholder { color:var(--text-muted); }
        .r-textarea { resize:vertical; min-height:100px; }
        .r-divider { font-size:1rem; font-weight:700; color:var(--text-main); margin:2rem 0 1rem; padding-bottom:0.5rem; border-bottom:2px solid var(--border-color); }
        .r-submit-btn { width:100%; padding:1rem; border:none; border-radius:12px; background:var(--primary); color:white; font-size:1rem; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.2s; margin-top:2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .r-submit-btn:hover { background: var(--primary-dark); }
        .r-submit-btn:disabled { opacity:0.7; cursor:not-allowed; }
        .r-toast { position:fixed; bottom:2rem; right:2rem; padding:1rem 1.5rem; border-radius:12px; font-size:0.95rem; font-weight:600; z-index:9999; box-shadow:0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); animation:slideIn 0.3s ease-out; border-left: 4px solid; }
        .r-toast.success { background:white; color:var(--success); border-color:var(--success); }
        .r-toast.error   { background:white; color:var(--danger); border-color:var(--danger); }
        @keyframes slideIn { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        .r-empty { text-align:center; padding:4rem 2rem; color:var(--text-muted); font-size:1rem; font-weight: 500; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
        .r-empty-icon { margin-bottom:1.5rem; opacity: 0.5; }
        .r-count-badge { background:var(--primary); color:white; border-radius:99px; padding:0.25rem 0.75rem; font-size:0.75rem; font-weight:700; margin-left:0.75rem; }
        .r-count-badge.red { background:var(--danger); }
        .r-count-badge.blue { background:var(--primary); }
        .pd-section-title { font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; }
        .pd-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: var(--background); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); }
        .pd-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; display: block; margin-bottom: 0.2rem; }
        .pd-value { font-size: 0.95rem; font-weight: 600; color: var(--text-main); }
        .pd-notes { background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; font-size: 0.9rem; line-height: 1.6; color: var(--text-main); white-space: pre-wrap; }
        .pd-rx-item { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px dashed var(--border-color); }
        .pd-rx-name { font-weight: 600; color: var(--text-main); }
        .pd-rx-cost { font-weight: 700; color: var(--success); }
      `}</style>

      {/* TOAST */}
      {toast && <div className={`r-toast ${toast.type}`}>{toast.msg}</div>}

      {/* PATIENT DETAIL MODAL */}
      {selectedPatientView && (
        <div className="r-modal-overlay" onClick={() => setSelectedPatientView(null)}>
          <div className="r-modal" onClick={e => e.stopPropagation()}>
            <div className="r-modal-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div className="r-avatar" style={{width: '40px', height: '40px', fontSize: '1.2rem'}}>👤</div>
                <div>
                  <div className="r-modal-title">{selectedPatientView.patients?.name}</div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>Age {selectedPatientView.patients?.age} • {selectedPatientView.patients?.phone || 'No phone on record'}</div>
                </div>
              </div>
              <button className="r-close-btn" onClick={() => setSelectedPatientView(null)}>✕</button>
            </div>
            <div className="r-modal-body">
              
              <div className="pd-section-title">Triage & Intake Vitals</div>
              <div className="pd-info-grid">
                <div><span className="pd-label">Priority Level</span><span className="r-urgency-badge" style={{color: urgencyConfig[selectedPatientView.urgency]?.color, borderColor: urgencyConfig[selectedPatientView.urgency]?.border, display: 'inline-block'}}>{selectedPatientView.urgency}</span></div>
                <div><span className="pd-label">Status</span><span className="r-badge" style={{background: statusConfig[selectedPatientView.status]?.bg, color: statusConfig[selectedPatientView.status]?.color}}>{statusConfig[selectedPatientView.status]?.label}</span></div>
                {selectedPatientView.hr > 0 && <div><span className="pd-label">Heart Rate</span><span className="pd-value">{selectedPatientView.hr} bpm</span></div>}
                {selectedPatientView.sbp > 0 && <div><span className="pd-label">Blood Pressure</span><span className="pd-value">{selectedPatientView.sbp}/{selectedPatientView.dbp}</span></div>}
                {selectedPatientView.saturation > 0 && <div><span className="pd-label">SpO2</span><span className="pd-value">{selectedPatientView.saturation}%</span></div>}
                {selectedPatientView.bt > 0 && <div><span className="pd-label">Temperature</span><span className="pd-value">{selectedPatientView.bt}°C</span></div>}
                <div style={{gridColumn: '1/-1'}}><span className="pd-label">Triage Notes</span><span className="pd-value" style={{fontWeight: 400}}>{selectedPatientView.symptoms || 'None'}</span></div>
              </div>

              {selectedPatientView.consultation_notes && selectedPatientView.consultation_notes.length > 0 && (
                <>
                  <div className="pd-section-title">Provider Notes</div>
                  <div className="pd-notes">
                    {selectedPatientView.consultation_notes[0].soap_notes}
                  </div>
                </>
              )}

              {selectedPatientView.prescriptions && selectedPatientView.prescriptions.length > 0 && (
                <>
                  <div className="pd-section-title">Prescriptions & Orders</div>
                  <div style={{background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 1rem'}}>
                    {selectedPatientView.prescriptions[0].items.map((item, i) => (
                      <div key={i} className="pd-rx-item">
                        <div>
                          <div className="pd-rx-name">{item.name}</div>
                          {item.type === 'medication' && <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem'}}>{item.duration} • {item.food}</div>}
                        </div>
                        <div className="pd-rx-cost">{item.cost_estimate}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedPatientView.bill && (
                <>
                  <div className="pd-section-title">Billing Status</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                    <div>
                      <div style={{fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)'}}>₹{selectedPatientView.bill.total_amount}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Generated {new Date(selectedPatientView.bill.created_at).toLocaleDateString()}</div>
                    </div>
                    {selectedPatientView.bill.status === 'pending' ? (
                      <button className="r-pay-btn" onClick={(e) => markPaid(selectedPatientView.bill.id, selectedPatientView.id, e)}>Mark Paid</button>
                    ) : (
                      <span className="r-paid-chip">✓ Paid</span>
                    )}
                  </div>
                </>
              )}

              {/* NEW AFTERCARE LINK BOX (Replaces the old text area) */}
              {selectedPatientView.bill?.status === 'paid' ? (
                <AftercareLinkBox phone={selectedPatientView.patients?.phone} />
              ) : (
                 <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💬</div>
                    <div>The Aftercare Chat link will be generated here once the bill is marked as Paid.</div>
                 </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {showRegisterForm && (
        <div className="r-modal-overlay">
          <div className="r-modal">
            <div className="r-modal-header">
                <div className="r-modal-title">Smart Triage Registration</div>
              <button className="r-close-btn" onClick={() => setShowRegisterForm(false)}>✕</button>
            </div>
            <div className="r-modal-body">
              <form onSubmit={handleRegister}>
                <div className="r-form-grid">
                  <div className="r-field r-form-full">
                    <label className="r-label">Full Name</label>
                    <input className="r-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Ramesh Kumar" required/>
                  </div>
                  <div className="r-field">
                    <label className="r-label">Age</label>
                    <input className="r-input" type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="e.g. 45" required/>
                  </div>
                  <div className="r-field">
                    <label className="r-label">Phone Number</label>
                    <input className="r-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="e.g. 9876543210" required/>
                  </div>
                  <div className="r-field r-form-full">
                    <label className="r-label">Assign Doctor</label>
                    <select className="r-select" value={form.doctor_id} onChange={e=>setForm({...form,doctor_id:e.target.value})}>
                      <option value="">— Assign Later —</option>
                      {doctors.map(d=>(
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="r-divider">Vitals for Smart Triage</div>
                <div className="r-form-grid">
                  {[
                    {key:'sbp',label:'Systolic BP',ph:'120'},
                    {key:'dbp',label:'Diastolic BP',ph:'80'},
                    {key:'hr', label:'Heart Rate', ph:'72'},
                    {key:'rr', label:'Resp Rate',  ph:'16'},
                    {key:'bt', label:'Temp (°C)',  ph:'37.0'},
                    {key:'saturation',label:'SpO2 %',ph:'98'},
                  ].map(f=>(
                    <div key={f.key} className="r-field">
                      <label className="r-label">{f.label}</label>
                      <input className="r-input" type="number" value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.ph} required/>
                    </div>
                  ))}
                </div>

                <button type="submit" className="r-submit-btn" disabled={loading}>
                  {loading ? 'AI Assessing Urgency...' : 'Assess Risk & Register Patient'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="r-layout">
        {/* SIDEBAR */}
        <aside className="r-sidebar">
          <div className="r-brand">
            <div className="r-brand-icon"><Icons.Brand /></div>
            <div>
              <div className="r-brand-name">VitalsFlow</div>
              <div className="r-brand-sub">Reception Desk</div>
            </div>
          </div>

          <div className="r-nav-section">Navigation</div>

          {[
            {id:'waiting', icon:<Icons.Waiting/>, label:'Waiting Room', sub:'Active patients'},
            {id:'completed', icon:<Icons.Completed/>, label:'Completed', sub:'Ready for billing'},
            {id:'billing', icon:<Icons.Billing/>, label:'Billing', sub:'Payments'},
          ].map(item=>(
            <div key={item.id} className={`r-nav-item ${activeTab===item.id?'active':''}`} onClick={()=>setActiveTab(item.id)}>
              <div className="r-nav-icon">{item.icon}</div>
              <div>
                <span className="r-nav-label">{item.label}</span>
                <span className="r-nav-sub">{item.sub}</span>
              </div>
            </div>
          ))}

          <div className="r-stats">
            <div className="r-stat-box">
              <div className="r-stat-num">{waitingVisits.length}</div>
              <div className="r-stat-lbl">Waiting</div>
            </div>
            <div className="r-stat-box">
              <div className="r-stat-num">{pendingBills.length}</div>
              <div className="r-stat-lbl">Pending Bills</div>
            </div>
          </div>

          <div className="r-sidebar-footer">
            <div className="r-status-dot"/>
            <span>Reception Active</span>
          </div>
        </aside>

        {/* MAIN */}
        <div className="r-main">
          {/* TOPBAR */}
          <header className="r-topbar">
            <div>
              <div className="r-topbar-title">Reception <span>Dashboard</span></div>
              <div className="r-topbar-sub">Manage patients, assignments & billing</div>
            </div>
            <div className="r-topbar-right">
              <button className="r-register-btn" onClick={()=>setShowRegisterForm(true)}>
                + New Patient
              </button>
              <div className="r-user-chip">
                <div className="r-avatar">Rc</div>
                <div>
                  <div className="r-user-name">Reception</div>
                  <div className="r-user-role">Front Desk</div>
                </div>
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <div className="r-content">

            {/* ── WAITING ROOM ── */}
            {activeTab==='waiting' && (
              <>
                <div className="r-page-header">
                  <div className="r-card-icon-box"><Icons.Waiting/></div>
                  <div>
                    <div className="r-page-title">Waiting Room <span className="r-count-badge">{waitingVisits.length}</span></div>
                    <div className="r-page-desc">All active patients sorted by AI predicted urgency</div>
                  </div>
                </div>
                
                <div className="r-card" style={{flex:1}}>
                  <div className="r-card-header">
                    <Icons.Patients/><span className="r-card-title">Active Patients</span>
                  </div>
                  <div className="r-card-body">
                    {waitingVisits.length === 0 ? (
                      <div className="r-empty">
                        <div className="r-empty-icon"><Icons.EmptyWaiting/></div>
                        No patients waiting. Click "+ New Patient" to register one.
                      </div>
                    ) : (
                      [...waitingVisits]
                        .sort((a,b) => {
                          const order = {critical:0,high:1,medium:2,low:3};
                          return (order[a.urgency]??2) - (order[b.urgency]??2);
                        })
                        .map(visit => {
                          const uc = urgencyConfig[visit.urgency] || urgencyConfig.medium;
                          const sc = statusConfig[visit.status] || statusConfig.waiting;
                          return (
                            <div key={visit.id} className="r-patient-row" onClick={() => openPatientView(visit)}>
                              <div style={{flexShrink:0}}>
                                <div className="r-brand-icon" style={{background:uc.bg, border:`1px solid ${uc.border}`, color: uc.color, boxShadow: 'none'}}>
                                  {visit.urgency==='critical'?'🚨':visit.urgency==='high'?'⚠️':'👤'}
                                </div>
                              </div>
                              <div className="r-patient-info">
                                <div className="r-patient-name">{visit.patients?.name || 'Unknown'}</div>
                                <div className="r-patient-meta">
                                  Age {visit.patients?.age} &nbsp;·&nbsp; {visit.patients?.phone || 'No phone'}
                                  &nbsp;·&nbsp; {new Date(visit.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                                </div>
                                {visit.symptoms && <div className="r-patient-symptoms">{visit.symptoms}</div>}
                                <div className="r-vitals-row">
                                  {visit.hr>0 && <span className="r-vital-chip">HR: {visit.hr}</span>}
                                  {visit.sbp>0 && <span className="r-vital-chip">BP: {visit.sbp}/{visit.dbp}</span>}
                                  {visit.saturation>0 && <span className="r-vital-chip">SpO2: {visit.saturation}%</span>}
                                  {visit.bt>0 && <span className="r-vital-chip">Temp: {visit.bt}°C</span>}
                                </div>
                              </div>
                              <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',alignItems:'flex-end',flexShrink:0}}>
                                <span className="r-urgency-badge" style={{color:uc.color,background:uc.bg,borderColor:uc.border}}>
                                  {visit.urgency==='critical'?'🚨':visit.urgency==='high'?'⚠️':''} {uc.label} Priority
                                </span>
                                <span className="r-badge" style={{color:sc.color,background:sc.bg}}>{sc.label}</span>
                                <select className="r-assign-select" value={visit.doctor_id||''} onClick={e=>e.stopPropagation()} onChange={e=>assignDoctor(visit.id,e.target.value,e)}>
                                  <option value="">Assign Doctor</option>
                                  {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── COMPLETED ── */}
            {activeTab==='completed' && (
              <>
                <div className="r-page-header">
                  <div className="r-card-icon-box" style={{color: '#2563eb', background: '#eff6ff'}}><Icons.Completed/></div>
                  <div>
                    <div className="r-page-title">Completed Visits <span className="r-count-badge blue">{completedVisits.length}</span></div>
                    <div className="r-page-desc">Consultations finished — click a patient to view history</div>
                  </div>
                </div>
                
                <div className="r-card" style={{flex:1}}>
                  <div className="r-card-header">
                    <Icons.Completed/><span className="r-card-title">Recent Completions</span>
                  </div>
                  <div className="r-card-body">
                    {completedVisits.length === 0 ? (
                      <div className="r-empty">
                        <div className="r-empty-icon"><Icons.EmptyCompleted/></div>
                        No completed visits yet.
                      </div>
                    ) : completedVisits.map(visit => (
                      <div key={visit.id} className="r-patient-row" onClick={() => openPatientView(visit)}>
                        <div className="r-patient-info">
                          <div className="r-patient-name">{visit.patients?.name}</div>
                          <div className="r-patient-meta">Age {visit.patients?.age} · {new Date(visit.created_at).toLocaleDateString('en-IN')}</div>
                        </div>
                        <span className="r-badge" style={{color:'#1d4ed8',background:'#eff6ff',border:'1px solid #bfdbfe'}}>View Details →</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── BILLING ── */}
            {activeTab==='billing' && (
              <>
                <div className="r-page-header">
                  <div className="r-card-icon-box" style={{color: '#d97706', background: '#fffbeb'}}><Icons.Billing/></div>
                  <div>
                    <div className="r-page-title">Billing <span className="r-count-badge red">{pendingBills.length} pending</span></div>
                    <div className="r-page-desc">Process patient payments</div>
                  </div>
                </div>

                <div style={{display:'flex',gap:'1.5rem',flex:1,minHeight:0}}>
                  {/* Pending */}
                  <div className="r-card" style={{flex:1}}>
                    <div className="r-card-header">
                      <Icons.Billing/><span className="r-card-title">Pending Payment</span>
                    </div>
                    <div className="r-card-body">
                      {pendingBills.length === 0 ? (
                        <div className="r-empty"><div className="r-empty-icon"><Icons.Pending/></div>No pending bills.</div>
                      ) : pendingBills.map(bill => {
                        const isPaid = paidLinks[bill.id];
                        return (
                          <div key={bill.id}>
                            <div className="r-bill-row" onClick={() => openPatientView(bill.visits)} style={{ borderBottomLeftRadius: isPaid ? 0 : undefined, borderBottomRightRadius: isPaid ? 0 : undefined, borderBottom: isPaid ? "none" : undefined }}>
                              <div>
                                <div className="r-patient-name">{bill.visits?.patients?.name}</div>
                                <div className="r-patient-meta">Age {bill.visits?.patients?.age} · {new Date(bill.created_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</div>
                              </div>
                              <div style={{display:'flex',alignItems:'center',gap:'1.5rem'}}>
                                <div className="r-bill-amount">₹{bill.total_amount}</div>
                                {!isPaid && <button className="r-pay-btn" onClick={(e)=>markPaid(bill.id, bill.visit_id, e)}>Mark Paid</button>}
                                {isPaid && <span className="r-paid-chip">✓ Paid</span>}
                              </div>
                            </div>
                            {isPaid && (
                              <div style={{ borderTop: "none", marginBottom: "1rem" }} onClick={(e) => e.stopPropagation()}>
                                <AftercareLinkBox phone={bill.visits?.patients?.phone} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Paid */}
                  <div className="r-card" style={{flex:1}}>
                    <div className="r-card-header">
                      <Icons.Paid/><span className="r-card-title">Paid Today</span>
                    </div>
                    <div className="r-card-body">
                      {paidBills.length === 0 ? (
                        <div className="r-empty"><div className="r-empty-icon"><Icons.Paid/></div>No payments yet today.</div>
                      ) : paidBills.map(bill => (
                        <div key={bill.id} className="r-bill-row" onClick={() => openPatientView(bill.visits)}>
                          <div>
                            <div className="r-patient-name">{bill.visits?.patients?.name}</div>
                            <div className="r-patient-meta">{new Date(bill.paid_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                            <div style={{fontSize:'1.25rem',fontWeight:'800',color:'#16a34a'}}>₹{bill.total_amount}</div>
                            <span className="r-paid-chip"><Icons.Completed/> Paid</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  );
}