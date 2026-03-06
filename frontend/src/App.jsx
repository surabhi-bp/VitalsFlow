import { useState } from 'react';
import ReceptionistPortal from "./ReceptionistPortal";

// --- Modern SVG Icons ---
const Icons = {
  Brand: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Triage: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  Mic: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  Bell: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Clipboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Dna: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 20.66V22"/><path d="M14 2v1.34"/><path d="M14 22v-1.34"/><path d="M2 12h20"/><path d="M4.34 10a12 12 0 0 1 15.32 0"/><path d="M4.34 14a12 12 0 0 0 15.32 0"/><path d="M10 2v1.34"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
};

function App() {
  const [activeTab, setActiveTab] = useState('triage');
  const [vitals, setVitals] = useState({ SBP: '', DBP: '', HR: '', RR: '', BT: '', Saturation: '' });
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [clinicalData, setClinicalData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [customTest, setCustomTest] = useState("");
  const [customMed, setCustomMed] = useState("");
  const [isPredictingCost, setIsPredictingCost] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const handleInputChange = (e) => setVitals({ ...vitals, [e.target.name]: e.target.value });

  const handleTriageSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setAlert(null);
    try {
      const res = await fetch("http://localhost:8000/api/triage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SBP: parseFloat(vitals.SBP), DBP: parseFloat(vitals.DBP), HR: parseFloat(vitals.HR), RR: parseFloat(vitals.RR), BT: parseFloat(vitals.BT), Saturation: parseFloat(vitals.Saturation) }),
      });
      const data = await res.json(); setAlert(data.triage_alert);
    } catch { setAlert({ status: "Error", action: "Check server", color: "gray" }); }
    setLoading(false);
  };

  const startRecording = async () => {
    try {
      setClinicalData(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsTranscribing(true);
        const formData = new FormData();
        formData.append("file", new Blob(chunks, { type: 'audio/webm' }), "recording.webm");
        try {
          const res = await fetch("http://localhost:8000/api/scribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.status === "success") {
            setTranscription(data.transcript); setClinicalData(data.clinical_data);
            setSelectedTests(data.clinical_data.suggested_tests.map(t => t.name));
            setSelectedMeds(data.clinical_data.suggested_medicines.map(m => m.name));
          } else setTranscription("Error: " + data.message);
        } catch { setTranscription("Failed to connect to backend server."); }
        setIsTranscribing(false);
      };
      recorder.start(); setMediaRecorder(recorder); setIsRecording(true);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
  };

  const toggleTest = (n) => setSelectedTests(p => p.includes(n) ? p.filter(t => t !== n) : [...p, n]);
  const toggleMed = (n) => setSelectedMeds(p => p.includes(n) ? p.filter(m => m !== n) : [...p, n]);
  const removeTest = (n) => { setClinicalData(p => ({ ...p, suggested_tests: p.suggested_tests.filter(t => t.name !== n) })); setSelectedTests(p => p.filter(t => t !== n)); };
  const removeMed = (n) => { setClinicalData(p => ({ ...p, suggested_medicines: p.suggested_medicines.filter(m => m.name !== n) })); setSelectedMeds(p => p.filter(m => m !== n)); };
  const updateMedDetails = (i, f, v) => setClinicalData(p => { const m = [...p.suggested_medicines]; m[i] = { ...m[i], [f]: v }; return { ...p, suggested_medicines: m }; });

  const handleAddCustomTest = async (e) => {
    if (e.key !== 'Enter' || !customTest.trim()) return;
    e.preventDefault(); const name = customTest.trim(); setCustomTest(""); setIsPredictingCost(true);
    try {
      const res = await fetch("http://localhost:8000/api/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, item_type: "test" }) });
      const data = await res.json();
      setClinicalData(p => ({ ...p, suggested_tests: [...p.suggested_tests, { name, cost_estimate: data.cost || "₹TBD" }] }));
      setSelectedTests(p => [...p, name]);
    } catch (err) { console.error(err); }
    setIsPredictingCost(false);
  };

  const handleAddCustomMed = async (e) => {
    if (e.key !== 'Enter' || !customMed.trim()) return;
    e.preventDefault(); const name = customMed.trim(); setCustomMed(""); setIsPredictingCost(true);
    try {
      const res = await fetch("http://localhost:8000/api/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, item_type: "medication" }) });
      const data = await res.json();
      setClinicalData(p => ({ ...p, suggested_medicines: [...p.suggested_medicines, { name, cost_estimate: data.cost || "₹TBD", morning: false, afternoon: false, night: false, food: "After Food", duration: "" }] }));
      setSelectedMeds(p => [...p, name]);
    } catch (err) { console.error(err); }
    setIsPredictingCost(false);
  };

  const handleFinalize = () => {
    const getNum = (s) => { const n = parseInt((s||'').replace(/\D/g,'')); return isNaN(n)?0:n; };
    let total = 0;
    clinicalData.suggested_tests.forEach(t => { if (selectedTests.includes(t.name)) total += getNum(t.cost_estimate); });
    clinicalData.suggested_medicines.forEach(med => {
      if (!selectedMeds.includes(med.name)) return;
      const price = getNum(med.cost_estimate);
      const doses = (med.morning?1:0)+(med.afternoon?1:0)+(med.night?1:0);
      const dm = med.duration?.match(/\d+/); const dv = dm?parseInt(dm[0]):1;
      const qty = med.duration?.toLowerCase().includes('day') ? dv*(doses||1) : dv;
      total += price * qty;
    });
    setTotalCost(total); setShowReceipt(true);
  };

  const acuityTheme = {
    red:    { bg:'#fef2f2', border:'#fecaca', text:'#b91c1c', pill:'#fee2e2', pillText:'#b91c1c' },
    orange: { bg:'#fff7ed', border:'#fed7aa', text:'#c2410c', pill:'#ffedd5', pillText:'#c2410c' },
    yellow: { bg:'#fefce8', border:'#fef08a', text:'#a16207', pill:'#fef9c3', pillText:'#a16207' },
    green:  { bg:'#f0fdf4', border:'#bbf7d0', text:'#15803d', pill:'#dcfce7', pillText:'#15803d' },
    blue:   { bg:'#eff6ff', border:'#bfdbfe', text:'#1d4ed8', pill:'#dbeafe', pillText:'#1d4ed8' },
    gray:   { bg:'#f8fafc', border:'#e2e8f0', text:'#475569', pill:'#f1f5f9', pillText:'#475569' },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter', sans-serif; background:#f4f7f9; color: #0f172a; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: transparent; } 
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .layout { display:flex; height:100vh; overflow:hidden; }

        /* SIDEBAR — Sleek Dark Mode */
        .sidebar {
          width:260px; min-width:260px;
          background:#0b1120;
          display:flex; flex-direction:column;
          border-right: 1px solid #1e293b;
        }
        .brand {
          padding: 1.5rem;
          border-bottom: 1px solid #1e293b;
          display:flex; align-items:center; gap:0.85rem;
        }
        .brand-icon {
          width:42px; height:42px; border-radius:12px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display:flex; align-items:center; justify-content:center; color: white; flex-shrink:0;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .brand-name { font-size:1.1rem; font-weight:700; color:#ffffff; line-height:1.2; letter-spacing: -0.02em; }
        .brand-sub  { font-size:0.65rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; font-weight:600; }

        .nav-label-section { font-size:0.65rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.12em; padding:1.5rem 1.5rem 0.75rem; }

        .nav-item {
          display:flex; align-items:center; gap:0.85rem;
          padding: 0.75rem 1.5rem; cursor:pointer;
          border-left: 3px solid transparent; transition: all 0.2s ease; margin: 2px 0;
        }
        .nav-item:hover { background: rgba(30, 41, 59, 0.5); }
        .nav-item.active { background: linear-gradient(90deg, rgba(59,130,246,0.1) 0%, transparent 100%); border-left-color: #3b82f6; }

        .nav-icon {
          width: 36px; height: 36px; border-radius: 10px; background: #1e293b; color: #94a3b8;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
          transition: all 0.2s ease;
        }
        .nav-item.active .nav-icon { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }

        .nav-item-label { font-size:0.88rem; font-weight:600; color:#cbd5e1; display:block; line-height:1.2; transition: color 0.2s ease; }
        .nav-item.active .nav-item-label { color:#ffffff; }
        .nav-item-sub { font-size:0.7rem; color:#64748b; }

        .sidebar-footer {
          margin-top:auto; padding:1.25rem 1.5rem;
          border-top:1px solid #1e293b;
          display:flex; align-items:center; gap:0.6rem;
        }
        .status-dot { width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px rgba(16, 185, 129, 0.6); }
        .status-text { font-size:0.75rem; color:#94a3b8; font-weight:500; }

        /* MAIN — Clean Light UI */
        .main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        .topbar {
          height: 64px; min-height: 64px; background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display:flex; align-items:center; justify-content:space-between;
          padding: 0 2rem; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .topbar-title { font-size:1.1rem; font-weight:700; color:#0f172a; letter-spacing: -0.01em; }
        .topbar-title span { color:#2563eb; }
        .topbar-sub { font-size:0.75rem; color:#64748b; margin-top:2px; }
        .topbar-right { display:flex; align-items:center; gap: 1.25rem; }
        
        .notif-btn {
          position:relative; width:40px; height:40px; border-radius:10px;
          background:#f8fafc; border:1px solid #e2e8f0; color: #475569;
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          transition: all 0.2s ease;
        }
        .notif-btn:hover { background: #f1f5f9; color: #0f172a; }
        .notif-badge {
          position:absolute; top:-4px; right:-4px; background:#ef4444; color:white;
          font-size:0.6rem; font-weight:700; width:18px; height:18px; border-radius:50%;
          display:flex; align-items:center; justify-content:center; border:2px solid #ffffff;
        }
        .user-chip {
          display:flex; align-items:center; gap:0.75rem;
          background:#f8fafc; border:1px solid #e2e8f0;
          border-radius:12px; padding:0.35rem 1rem 0.35rem 0.35rem; cursor:pointer;
          transition: all 0.2s ease;
        }
        .user-chip:hover { background: #f1f5f9; border-color: #cbd5e1; }
        .avatar {
          width:32px; height:32px; border-radius:9px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display:flex; align-items:center; justify-content:center;
          font-size:0.8rem; font-weight:700; color:white;
        }
        .user-name { font-size:0.85rem; font-weight:600; color:#1e293b; }
        .user-role { font-size:0.7rem; color:#64748b; }

        /* CONTENT */
        .content { flex:1; overflow:hidden; padding: 2rem; display:flex; flex-direction:column; gap: 1.5rem; background:#f4f7f9; }
        .page-header-wrapper { display: flex; align-items: center; gap: 0.75rem; }
        .page-header-icon { color: #2563eb; display: flex; align-items: center; justify-content: center; background: #e0e7ff; padding: 0.6rem; border-radius: 12px; }
        .page-title { font-size:1.65rem; font-weight:800; color:#0f172a; letter-spacing: -0.02em; }
        .page-desc  { font-size:0.85rem; color:#64748b; margin-top:0.3rem; }

        /* CARDS */
        .cards-grid { display:flex; gap: 1.5rem; flex:1; min-height:0; }
        .card {
          flex:1; background:#ffffff; border:1px solid #e2e8f0; border-radius: 20px;
          display:flex; flex-direction:column; overflow:hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.02);
        }
        .card-header {
          padding: 1.25rem 1.5rem; border-bottom:1px solid #f1f5f9;
          display:flex; align-items:center; gap:0.75rem; flex-shrink:0; background: #ffffff;
        }
        .card-icon {
          width:36px; height:36px; border-radius:10px; color: white;
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }
        .card-title { font-size:0.85rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.08em; }
        .card-body  { flex:1; overflow-y:auto; padding: 1.5rem; }

        /* FORM */
        .vitals-grid { display:grid; grid-template-columns:1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .field-group { display:flex; flex-direction:column; gap:0.4rem; }
        .field-label { font-size:0.75rem; font-weight:600; color:#475569; }
        .field-input {
          background:#ffffff; border:1px solid #cbd5e1; border-radius:10px;
          padding:0.75rem 1rem; color:#0f172a; font-size:0.95rem; outline:none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); width:100%; font-family:'Inter',sans-serif;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .field-input:focus { border-color:#3b82f6; box-shadow:0 0 0 4px rgba(59, 130, 246, 0.15); }
        .field-input::placeholder { color:#94a3b8; }

        .submit-btn {
          width:100%; padding:0.85rem; border:none; border-radius:10px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8); color:white;
          font-size:0.95rem; font-weight:600; cursor:pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); transition: all 0.2s ease;
          font-family:'Inter',sans-serif; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .submit-btn:hover  { transform:translateY(-1px); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3); }
        .submit-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        /* ACUITY EMPTY */
        .acuity-empty {
          height:100%; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap: 1rem; text-align:center;
          background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px; padding: 2rem;
        }
        .acuity-empty-icon { color: #cbd5e1; margin-bottom: 0.5rem; }
        .acuity-empty-title { font-size:1.15rem; font-weight:700; color:#475569; }
        .acuity-empty-sub   { font-size:0.85rem; color:#64748b; max-width:260px; line-height:1.6; }

        /* ACUITY RESULT */
        .acuity-box {
          width:100%; height:100%; border-radius:16px; padding:2.5rem 2rem;
          border: 2px solid; display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:1.25rem; text-align:center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }
        .acuity-pill { padding:0.35rem 1.1rem; border-radius:99px; font-size:0.75rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; }
        .acuity-status { font-size:2rem; font-weight:800; letter-spacing:-0.03em; }
        .acuity-action { font-size:0.95rem; max-width:280px; line-height:1.6; font-weight: 500; }

        /* RECORDING */
        .record-btn {
          width:100%; padding: 0.85rem; border:none; border-radius:10px;
          font-size:0.95rem; font-weight:600; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:0.6rem;
          font-family:'Inter',sans-serif; transition:all 0.2s ease;
        }
        .record-start { background: linear-gradient(135deg, #ef4444, #dc2626); color:white; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25); }
        .record-start:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35); }
        .record-stop  { background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        .record-stop:hover { background: #f8fafc; }

        .pulse-dot { width:10px; height:10px; background:#ef4444; border-radius:50%; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0% {box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);} 70% {box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);} 100% {box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);} }

        .analyzing-bar {
          background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px;
          padding:0.75rem 1rem; font-size:0.85rem; font-weight: 500; color:#1d4ed8;
          display:flex; align-items:center; justify-content:center; gap:0.6rem; margin-top:1rem;
        }

        /* SOAP */
        .section-label { font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; margin:1.5rem 0 0.75rem; }
        .soap-box {
          background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;
          padding:1.25rem; font-size:0.9rem; line-height:1.75; color:#334155; white-space:pre-wrap;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);
        }
        .transcript-box {
          background:#f8fafc; border-left:4px solid #cbd5e1; border-radius: 0 12px 12px 0;
          padding:1rem 1.25rem; font-size:0.85rem; color:#64748b; font-style:italic; line-height:1.6;
        }

        /* CDSS */
        .cdss-item {
          background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;
          padding: 0.85rem 1.1rem; margin-bottom: 0.6rem; transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .cdss-item:hover { border-color:#93c5fd; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08); }
        .cdss-row { display:flex; align-items:center; gap:0.75rem; justify-content:space-between; }
        .cdss-check { display:flex; align-items:center; gap:0.75rem; cursor:pointer; flex:1; }
        
        .cdss-check input[type=checkbox] { 
          appearance: none; width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 4px; 
          cursor:pointer; position: relative; transition: all 0.2s; background: white;
        }
        .cdss-check input[type=checkbox]:checked { background: #2563eb; border-color: #2563eb; }
        .cdss-check input[type=checkbox]:checked::after {
          content: ''; position: absolute; left: 5px; top: 1px; width: 4px; height: 9px;
          border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg);
        }

        .cdss-name { font-size:0.9rem; font-weight:600; color:#1e293b; }
        .cost-chip { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:0.25rem 0.65rem; border-radius:8px; font-size:0.75rem; font-weight:700; white-space:nowrap; }
        .del-btn { background:none; border:none; cursor:pointer; color: #ef4444; opacity:0.4; transition:all 0.2s; padding:0.25rem; display: flex; align-items: center; justify-content: center; }
        .del-btn:hover { opacity:1; background: #fee2e2; border-radius: 6px; }

        .med-details { margin-top:0.85rem; padding-top:0.85rem; border-top:1px dashed #e2e8f0; display:flex; flex-wrap:wrap; gap:0.75rem; font-size:0.8rem; align-items:center; }
        .timing-grp { display:flex; align-items:center; gap:0.5rem; }
        .timing-grp strong { color:#475569; font-weight: 600; }
        .timing-grp label { display:flex; align-items:center; gap:0.3rem; cursor:pointer; color:#64748b; font-weight: 500; }
        .mini-sel { background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.3rem 0.6rem; color:#1e293b; font-size:0.8rem; outline:none; transition: all 0.2s; }
        .mini-sel:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .dur-input { background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.3rem 0.6rem; color:#1e293b; font-size:0.8rem; outline:none; min-width:140px; font-family:'Inter',sans-serif; transition: all 0.2s; }
        .dur-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

        .custom-input {
          width:100%; background:#ffffff; border:1px dashed #94a3b8; border-radius:10px;
          padding:0.75rem 1rem; color:#0f172a; font-size:0.85rem; outline:none;
          margin-top:0.5rem; transition:all 0.2s; font-family:'Inter',sans-serif;
        }
        .custom-input:focus { border-color:#3b82f6; border-style: solid; box-shadow: 0 4px 12px rgba(59,130,246,0.1); }
        .custom-input::placeholder { color:#94a3b8; }

        .finalize-btn {
          width:100%; padding:0.85rem; border:none; border-radius:10px;
          background: linear-gradient(135deg, #10b981, #059669); color:white;
          font-size:0.95rem; font-weight:600; cursor:pointer; margin-top:2rem;
          font-family:'Inter',sans-serif; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25); transition:all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .finalize-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35); }
        .cost-predicting { text-align:center; font-size:0.8rem; font-weight: 500; color:#2563eb; margin-top:1rem; }

        /* MODAL */
        .modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:1000; padding: 1rem; }
        .modal-card { background:white; border-radius:24px; width:560px; max-width:100%; padding:2.5rem; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); }
        .modal-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.2rem; }
        .modal-icon { color: #10b981; display: flex; align-items: center; justify-content: center; background: #dcfce7; padding: 0.5rem; border-radius: 12px; }
        .modal-title { font-size:1.5rem; font-weight:800; color:#0f172a; letter-spacing: -0.01em; }
        .modal-sub { font-size:0.85rem; color:#64748b; margin-bottom: 1.5rem; }
        
        .modal-section { font-size:0.75rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; margin:1.5rem 0 0.75rem; }
        .receipt-scroll { max-height:300px; overflow-y:auto; padding-right: 0.5rem; }
        .r-row { display:flex; justify-content:space-between; align-items:flex-start; padding:0.75rem 0; border-bottom:1px solid #f1f5f9; gap:1rem; }
        .r-name { font-size:0.9rem; color:#1e293b; font-weight:600; }
        .r-amt  { font-size:0.9rem; color:#15803d; font-weight:700; white-space:nowrap; }
        .r-sig  { font-size:0.75rem; color:#64748b; margin-top:0.25rem; }
        
        .total-bar { display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:1.25rem 1.5rem; margin:1.5rem 0; }
        .total-label { font-size:1rem; font-weight:700; color:#475569; }
        .total-amt { font-size:1.75rem; font-weight:900; color:#0f172a; }
        
        .close-btn { width:100%; padding:0.85rem; background:#0f172a; color:#ffffff; border:none; border-radius:10px; font-size:0.95rem; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.2s; }
        .close-btn:hover { background:#1e293b; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}</style>

      {/* MODAL */}
      {showReceipt && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-icon"><Icons.Check /></div>
              <div className="modal-title">Patient Discharged</div>
            </div>
            <div className="modal-sub">Prescription & Billing Summary</div>
            <div className="receipt-scroll">
              <div className="modal-section">Approved Lab Tests</div>
              {clinicalData.suggested_tests.filter(t => selectedTests.includes(t.name)).map((t,i) => (
                <div key={i} className="r-row"><span className="r-name">{t.name}</span><span className="r-amt">{t.cost_estimate}</span></div>
              ))}
              <div className="modal-section">Prescribed Medications</div>
              {clinicalData.suggested_medicines.filter(m => selectedMeds.includes(m.name)).map((med,i) => {
                const p = parseInt((med.cost_estimate||'').replace(/\D/g,''))||0;
                const d = (med.morning?1:0)+(med.afternoon?1:0)+(med.night?1:0);
                const dm = med.duration?.match(/\d+/); const dv = dm?parseInt(dm[0]):1;
                const qty = med.duration?.toLowerCase().includes('day') ? dv*(d||1) : dv;
                return (
                  <div key={i} className="r-row" style={{flexDirection:'column',alignItems:'flex-start'}}>
                    <div style={{display:'flex',justifyContent:'space-between',width:'100%'}}>
                      <span className="r-name">{med.name} <span style={{color:'#94a3b8', fontWeight: 500}}>×{qty}</span></span>
                      <span className="r-amt">₹{p*qty}</span>
                    </div>
                    <div className="r-sig">{med.morning?'1':'0'}-{med.afternoon?'1':'0'}-{med.night?'1':'0'} | {med.food} | {med.duration}</div>
                  </div>
                );
              })}
            </div>
            <div className="total-bar"><span className="total-label">Estimated Total</span><span className="total-amt">₹{totalCost}</span></div>
            <button className="close-btn" onClick={() => setShowReceipt(false)}>Close & Return</button>
          </div>
        </div>
      )}

      <div className="layout">
        {/* SLEEK DARK SIDEBAR */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon"><Icons.Brand /></div>
            <div>
              <div className="brand-name">VitalsFlow</div>
              <div className="brand-sub">Smart Hospital</div>
            </div>
          </div>

          <div className="nav-label-section">Modules</div>

          <div className={`nav-item ${activeTab==='triage'?'active':''}`} onClick={()=>setActiveTab('triage')}>
            <div className="nav-icon"><Icons.Triage /></div>
            <div>
              <span className="nav-item-label">Smart Triage</span>
              <span className="nav-item-sub">ER Module</span>
            </div>
          </div>

          <div className={`nav-item ${activeTab==='scribe'?'active':''}`} onClick={()=>setActiveTab('scribe')}>
            <div className="nav-icon"><Icons.Mic /></div>
            <div>
              <span className="nav-item-label">AI Co-Pilot</span>
              <span className="nav-item-sub">Consultation</span>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="status-dot"/>
            <span className="status-text">System Online</span>
          </div>
        </aside>

        {/* LIGHT MAIN AREA */}
        <div className="main">
          {/* WHITE TOPBAR */}
          <header className="topbar">
            <div>
              <div className="topbar-title">VitalsFlow <span>Dashboard</span></div>
              <div className="topbar-sub">Smart Hospital Assistant</div>
            </div>
            <div className="topbar-right">
              <div className="notif-btn"><Icons.Bell /><span className="notif-badge">3</span></div>
              <div className="user-chip">
                <div className="avatar">Dr</div>
                <div>
                  <div className="user-name">Dr. Admin</div>
                  <div className="user-role">Physician</div>
                </div>
              </div>
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <div className="content">
            <div>
              {activeTab==='triage'
                ? <>
                    <div className="page-header-wrapper">
                      <div className="page-header-icon"><Icons.Triage /></div>
                      <div className="page-title">Smart ER Triage</div>
                    </div>
                    <div className="page-desc">Enter patient vitals to receive an AI-powered triage risk assessment.</div>
                  </>
                : <>
                    <div className="page-header-wrapper">
                      <div className="page-header-icon"><Icons.Mic /></div>
                      <div className="page-title">AI Co-Pilot & Scribe</div>
                    </div>
                    <div className="page-desc">Record consultations to auto-generate SOAP notes and clinical recommendations.</div>
                  </>
              }
            </div>

            {/* TRIAGE VIEW */}
            {activeTab==='triage' && (
              <div className="cards-grid">
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon"><Icons.Clipboard /></div>
                    <span className="card-title">Patient Intake Vitals</span>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleTriageSubmit}>
                      <div className="vitals-grid">
                        {[
                          {name:'SBP',ph:'e.g. 120',label:'Systolic BP'},
                          {name:'DBP',ph:'e.g. 80', label:'Diastolic BP'},
                          {name:'HR', ph:'e.g. 72', label:'Heart Rate'},
                          {name:'RR', ph:'e.g. 16', label:'Resp Rate'},
                          {name:'BT', ph:'e.g. 37.0',label:'Temp (°C)'},
                          {name:'Saturation',ph:'e.g. 98',label:'SpO2 %'},
                        ].map(f=>(
                          <div key={f.name} className="field-group">
                            <label className="field-label">{f.label}</label>
                            <input className="field-input" type="number" name={f.name} value={vitals[f.name]} onChange={handleInputChange} placeholder={f.ph} required/>
                          </div>
                        ))}
                      </div>
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? '⏳ Processing...' : <><Icons.Activity /> Assess Patient Acuity</>}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-icon" style={{background: 'linear-gradient(135deg, #0ea5e9, #2563eb)'}}><Icons.Activity /></div>
                    <span className="card-title">Acuity Level</span>
                  </div>
                  <div className="card-body">
                    {alert ? (() => {
                      const c = acuityTheme[alert.color]||acuityTheme.gray;
                      return (
                        <div className="acuity-box" style={{backgroundColor:c.bg,borderColor:c.border}}>
                          <span className="acuity-pill" style={{background:c.pill,color:c.pillText}}>Triage Result</span>
                          <div className="acuity-status" style={{color:c.text}}>{alert.status}</div>
                          <div className="acuity-action" style={{color:c.text}}><strong>Protocol:</strong> {alert.action}</div>
                        </div>
                      );
                    })() : (
                      <div className="acuity-empty">
                        <div className="acuity-empty-icon"><Icons.Heart /></div>
                        <div className="acuity-empty-title">Awaiting Patient Data</div>
                        <div className="acuity-empty-sub">Fill out the intake form and click "Assess Risk" to receive an AI-powered triage assessment.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SCRIBE VIEW */}
            {activeTab==='scribe' && (
              <div className="cards-grid">
                <div className="card">
                  <div className="card-header">
                    <div className="card-icon"><Icons.Mic /></div>
                    <span className="card-title">Consultation Scribe</span>
                  </div>
                  <div className="card-body">
                    {!isRecording
                      ? <button className="record-btn record-start" onClick={startRecording}><Icons.Mic /> Start Recording</button>
                      : <button className="record-btn record-stop" onClick={stopRecording}><div className="pulse-dot"/> Stop & Analyze</button>
                    }
                    {isTranscribing && <div className="analyzing-bar"><div className="pulse-dot" style={{width:'8px', height:'8px'}}/> Generating Clinical Plan...</div>}

                    {clinicalData ? (
                      <>
                        <div className="section-label" style={{marginTop:'1.5rem'}}>Generated SOAP Notes</div>
                        <div className="soap-box">{clinicalData.soap_notes}</div>
                        <div className="section-label">Raw Transcript</div>
                        <div className="transcript-box">"{transcription}"</div>
                      </>
                    ) : (!isRecording && !isTranscribing &&
                      <div style={{textAlign:'center',color:'#94a3b8',marginTop:'3rem',fontSize:'0.9rem', fontWeight: 500}}>Speak in English or regional languages to generate notes.</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #6366f1)'}}><Icons.Dna /></div>
                    <span className="card-title">Clinical Decision Support</span>
                  </div>
                  <div className="card-body">
                    {clinicalData ? (
                      <>
                        <div className="section-label" style={{marginTop:0}}>Suggested Lab Tests</div>
                        {clinicalData.suggested_tests.map((test,i)=>(
                          <div key={i} className="cdss-item">
                            <div className="cdss-row">
                              <label className="cdss-check">
                                <input type="checkbox" checked={selectedTests.includes(test.name)} onChange={()=>toggleTest(test.name)}/>
                                <span className="cdss-name">{test.name}</span>
                              </label>
                              <span className="cost-chip">{test.cost_estimate}</span>
                              <button className="del-btn" onClick={()=>removeTest(test.name)}><Icons.Trash /></button>
                            </div>
                          </div>
                        ))}
                        <input className="custom-input" type="text" placeholder="+ Type custom test & press Enter..." value={customTest} onChange={e=>setCustomTest(e.target.value)} onKeyDown={handleAddCustomTest}/>

                        <div className="section-label">Prescriptions & Dosage</div>
                        {clinicalData.suggested_medicines.map((med,i)=>(
                          <div key={i} className="cdss-item">
                            <div className="cdss-row">
                              <label className="cdss-check">
                                <input type="checkbox" checked={selectedMeds.includes(med.name)} onChange={()=>toggleMed(med.name)}/>
                                <span className="cdss-name">{med.name}</span>
                              </label>
                              <span className="cost-chip">{med.cost_estimate}</span>
                              <button className="del-btn" onClick={()=>removeMed(med.name)}><Icons.Trash /></button>
                            </div>
                            {selectedMeds.includes(med.name) && (
                              <div className="med-details">
                                <div className="timing-grp">
                                  <strong>Timing:</strong>
                                  <label><input type="checkbox" checked={med.morning||false} onChange={e=>updateMedDetails(i,'morning',e.target.checked)}/> Mor</label>
                                  <label><input type="checkbox" checked={med.afternoon||false} onChange={e=>updateMedDetails(i,'afternoon',e.target.checked)}/> Aft</label>
                                  <label><input type="checkbox" checked={med.night||false} onChange={e=>updateMedDetails(i,'night',e.target.checked)}/> Nig</label>
                                </div>
                                <select className="mini-sel" value={med.food||'After Food'} onChange={e=>updateMedDetails(i,'food',e.target.value)}>
                                  <option>After Food</option><option>Before Food</option>
                                </select>
                                <input className="dur-input" type="text" value={med.duration||''} onChange={e=>updateMedDetails(i,'duration',e.target.value)} placeholder="e.g. 5 days / 15 tabs"/>
                              </div>
                            )}
                          </div>
                        ))}
                        <input className="custom-input" type="text" placeholder="+ Type custom medication & press Enter..." value={customMed} onChange={e=>setCustomMed(e.target.value)} onKeyDown={handleAddCustomMed}/>

                        {isPredictingCost && <div className="cost-predicting">⏳ Predicting real-time cost...</div>}
                        <button className="finalize-btn" onClick={handleFinalize}><Icons.Check /> Finalize Prescription & Discharge</button>
                      </>
                    ) : (
                      <div style={{textAlign:'center',color:'#94a3b8',marginTop:'4rem',fontSize:'0.9rem', fontWeight: 500}}>Awaiting AI clinical analysis.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;