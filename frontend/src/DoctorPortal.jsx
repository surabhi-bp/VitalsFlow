import { useState, useEffect } from 'react';

// Ensure no trailing slash here to prevent // in URLs
const API = "https://vitalsflow-production.up.railway.app";

export default function DoctorPortal() {
  const [doctor, setDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [view, setView] = useState('select'); 
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [toast, setToast] = useState(null);

  // ── CONSULTATION STATE ──
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [clinicalData, setClinicalData] = useState(null);
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [customMed, setCustomMed] = useState('');
  const [isPredictingCost, setIsPredictingCost] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API}/api/doctors`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        // Defensive check to prevent .map crash
        setDoctors(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load doctors:', error);
        setDoctors([]);
        showToast('Failed to load doctors. Check backend.', 'error');
      }
    };
    
    loadDoctors();
  }, []);

  const fetchQueue = async () => {
    if (!doctor) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${API}/api/visits/doctor/${doctor.id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      // Defensive check to prevent .map crash
      setVisits(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error('Failed to fetch queue:', e);
      setVisits([]);
    }
  };

  useEffect(() => {
    if (doctor) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 8000);
      return () => clearInterval(interval);
    }
  }, [doctor]);

  const selectDoctor = (doc) => {
    setDoctor(doc);
    setView('queue');
  };

  const openConsultation = async (visit) => {
    setSelectedVisit(visit);
    setClinicalData(null); 
    setTranscription('');
    setSelectedTests([]); 
    setSelectedMeds([]);
    try {
      await fetch(`${API}/api/visits/${visit.id}`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_consultation' }),
      });
    } catch (e) {
      console.error('Failed to update visit status:', e);
    }
    setView('consultation');
    fetchQueue();
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
        formData.append('file', new Blob(chunks, { type: 'audio/webm' }), 'recording.webm');
        try {
          const res = await fetch(`${API}/api/scribe`, { method: 'POST', body: formData });
          const data = await res.json();
          if (data.status === 'success') {
            setTranscription(data.transcript);
            setClinicalData(data.clinical_data);
            setSelectedTests((data.clinical_data.suggested_tests || []).map(t => t.name));
            setSelectedMeds((data.clinical_data.suggested_medicines || []).map(m => m.name));
          }
        } catch (err) { 
          showToast('Failed to connect to AI Scribe', 'error'); 
        }
        setIsTranscribing(false);
      };
      recorder.start(); 
      setMediaRecorder(recorder); 
      setIsRecording(true);
    } catch { 
      showToast('Microphone access denied', 'error'); 
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop(); 
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  };

  const toggleTest = (n) => setSelectedTests(p => p.includes(n) ? p.filter(t => t !== n) : [...p, n]);
  const toggleMed  = (n) => setSelectedMeds(p => p.includes(n) ? p.filter(m => m !== n) : [...p, n]);
  
  const removeTest = (n) => { 
    setClinicalData(p => ({ ...p, suggested_tests: (p.suggested_tests||[]).filter(t => t.name !== n) })); 
    setSelectedTests(p => p.filter(t => t !== n)); 
  };
  
  const removeMed  = (n) => { 
    setClinicalData(p => ({ ...p, suggested_medicines: (p.suggested_medicines||[]).filter(m => m.name !== n) })); 
    setSelectedMeds(p => p.filter(m => m !== n)); 
  };

  const updateMedDetails = (i, f, v) => setClinicalData(p => { 
    const m = [...(p.suggested_medicines||[])]; 
    m[i] = { ...m[i], [f]: v }; 
    return { ...p, suggested_medicines: m }; 
  });
  
  const getNum = (s) => { 
    const n = parseInt(String(s || '').replace(/\D/g, '')); 
    return isNaN(n) ? 0 : n; 
  };

  const handleAddCustomTest = async (e) => {
    if (e.key !== 'Enter' || !customTest.trim()) return;
    e.preventDefault(); 
    const name = customTest.trim(); 
    setCustomTest(''); 
    setIsPredictingCost(true);
    try {
      const res = await fetch(`${API}/api/estimate`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, item_type: 'test' }) 
      });
      const data = await res.json();
      setClinicalData(p => ({ ...p, suggested_tests: [...(p.suggested_tests||[]), { name, cost_estimate: data.cost || '₹TBD' }] }));
      setSelectedTests(p => [...p, name]);
    } catch (err) { console.error(err); }
    setIsPredictingCost(false);
  };

  const handleAddCustomMed = async (e) => {
    if (e.key !== 'Enter' || !customMed.trim()) return;
    e.preventDefault(); 
    const name = customMed.trim(); 
    setCustomMed(''); 
    setIsPredictingCost(true);
    try {
      const res = await fetch(`${API}/api/estimate`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, item_type: 'medication' }) 
      });
      const data = await res.json();
      setClinicalData(p => ({ 
        ...p, 
        suggested_medicines: [...(p.suggested_medicines||[]), { 
          name, 
          cost_estimate: data.cost || '₹TBD', 
          morning: false, afternoon: false, night: false, 
          food: 'After Food', duration: '' 
        }] 
      }));
      setSelectedMeds(p => [...p, name]);
    } catch (err) { console.error(err); }
    setIsPredictingCost(false);
  };

  const calculateTotal = () => {
    let total = 0;
    if (!clinicalData) return 0;
    (clinicalData.suggested_tests || []).forEach(t => { 
      if (selectedTests.includes(t.name)) total += getNum(t.cost_estimate); 
    });
    (clinicalData.suggested_medicines || []).forEach(med => {
      if (!selectedMeds.includes(med.name)) return;
      const price = getNum(med.cost_estimate);
      const doses = (med.morning?1:0)+(med.afternoon?1:0)+(med.night?1:0);
      const safeDuration = String(med.duration || ''); 
      const dm = safeDuration.match(/\d+/); 
      const dv = dm ? parseInt(dm[0]) : 1;
      const qty = safeDuration.toLowerCase().includes('day') ? dv*(doses||1) : dv;
      total += price * qty;
    });
    return total;
  };

  const handleFinalize = () => { 
    setTotalCost(calculateTotal()); 
    setShowReceipt(true); 
  };

  const handleSaveAndDischarge = async () => {
    setSaving(true);
    try {
      const items = [
        ...(clinicalData.suggested_tests || []).filter(t => selectedTests.includes(t.name)).map(t => ({ type: 'test', ...t })),
        ...(clinicalData.suggested_medicines || []).filter(m => selectedMeds.includes(m.name)).map(m => ({ type: 'medication', ...m }))
      ];
      await fetch(`${API}/api/consultation/save`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visit_id: selectedVisit.id,
          transcript: transcription,
          soap_notes: clinicalData.soap_notes,
          clinical_data: clinicalData,
          items,
          total_cost: totalCost
        })
      });
      showToast('Consultation finalized and routed to billing.');
      setShowReceipt(false);
      setView('queue');
      fetchQueue();
    } catch (err) { 
      showToast('Failed to save consultation', 'error'); 
    }
    setSaving(false);
  };

  const urgencyConfig = {
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: '🚨' },
    high:     { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', icon: '⚠️' },
    medium:   { bg: '#fefce8', border: '#fef08a', text: '#a16207', icon: '👤' },
    low:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: '✓' },
  };

  const Icons = {
    Brand: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Queue: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Mic: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
    Dna: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 20.66V22"/><path d="M14 2v1.34"/><path d="M14 22v-1.34"/><path d="M2 12h20"/><path d="M4.34 10a12 12 0 0 1 15.32 0"/><path d="M4.34 14a12 12 0 0 0 15.32 0"/><path d="M10 2v1.34"/></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    EmptyQueue: () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>,
  };

  if (view === 'select') return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background: #f4f7f9; }
      `}</style>
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'20px',padding:'3rem',width:'420px',maxWidth:'95%',boxShadow:'0 10px 30px rgba(0,0,0,0.03)'}}>
          <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
            <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#3b82f6,#6366f1)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',color:'white',margin:'0 auto 1rem',boxShadow:'0 4px 12px rgba(59,130,246,0.3)'}}><Icons.Brand/></div>
            <div style={{fontSize:'1.3rem',fontWeight:'800',color:'#0f172a',letterSpacing:'-0.02em'}}>Provider Portal</div>
            <div style={{fontSize:'0.8rem',color:'#64748b',marginTop:'0.3rem'}}>VitalsFlow Smart Hospital</div>
          </div>

          <div style={{fontSize:'0.7rem',fontWeight:'700',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.75rem'}}>Select Provider</div>

          {doctors.length === 0 ? (
            <div style={{textAlign:'center',padding:'2rem',color:'#94a3b8',fontSize:'0.85rem',background:'#f8fafc',borderRadius:'12px',border:'1px dashed #cbd5e1'}}>
              Loading providers... Check backend connection.
            </div>
          ) : (
            doctors.map(doc => (
              <div key={doc.id} onClick={() => selectDoctor(doc)}
                style={{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem 1.25rem',background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:'12px',cursor:'pointer',marginBottom:'0.75rem',transition:'all 0.2s ease',boxShadow:'0 1px 2px rgba(0,0,0,0.02)'}}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#3b82f6'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.transform='none'; }}
              >
                <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'linear-gradient(135deg,#e0e7ff,#c7d2fe)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem',color:'#4f46e5',fontWeight:'700',flexShrink:0}}>
                  {doc.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:'0.95rem',fontWeight:'600',color:'#1e293b'}}>{doc.name}</div>
                  <div style={{fontSize:'0.75rem',color:'#64748b',marginTop:'0.1rem',textTransform:'capitalize'}}>{doc.role}</div>
                </div>
                <div style={{marginLeft:'auto',color:'#cbd5e1',fontSize:'1.1rem'}}>→</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter', sans-serif; background:#f4f7f9; color: #0f172a; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .d-layout { display:flex; height:100vh; overflow:hidden; }
        .d-sidebar { width:260px; min-width:260px; background:#0b1120; display:flex; flex-direction:column; border-right: 1px solid #1e293b; }
        .d-brand { padding: 1.5rem; border-bottom: 1px solid #1e293b; display:flex; align-items:center; gap:0.85rem; }
        .d-brand-icon { width:42px; height:42px; border-radius:12px; background: linear-gradient(135deg, #3b82f6, #6366f1); display:flex; align-items:center; justify-content:center; color: white; flex-shrink:0; }
        .d-brand-name { font-size:1.1rem; font-weight:700; color:#ffffff; line-height:1.2; letter-spacing: -0.02em; }
        .d-brand-sub  { font-size:0.65rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.12em; font-weight:600; }

        .d-doctor-card { margin: 1.5rem 1.5rem 0; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 1rem; }
        .d-doctor-name { font-size: 0.95rem; font-weight: 700; color: #f8fafc; }
        .d-doctor-role { font-size: 0.7rem; color: #94a3b8; margin-top: 0.15rem; }
        .d-queue-count { background: rgba(59,130,246,0.15); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.7rem; font-weight: 600; margin-top: 0.75rem; display: inline-block; }

        .d-nav-section { font-size:0.65rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.12em; padding:1.5rem 1.5rem 0.75rem; }
        .d-nav-item { display:flex; align-items:center; gap:0.85rem; padding: 0.75rem 1.5rem; cursor:pointer; border-left: 3px solid transparent; transition: all 0.2s ease; margin: 2px 0; }
        .d-nav-item.active { background: linear-gradient(90deg, rgba(59,130,246,0.1) 0%, transparent 100%); border-left-color: #3b82f6; }
        .d-nav-icon { width: 36px; height: 36px; border-radius: 10px; background: #1e293b; color: #94a3b8; display:flex; align-items:center; justify-content:center; }
        .d-nav-item.active .d-nav-icon { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; }
        .d-nav-label { font-size:0.88rem; font-weight:600; color:#cbd5e1; display:block; }
        .d-nav-item.active .d-nav-label { color:#ffffff; }
        .d-nav-sub { font-size:0.7rem; color:#64748b; }

        .d-switch-btn { margin: 1.5rem; background: transparent; border: 1px solid #334155; border-radius: 10px; padding: 0.75rem; color: #cbd5e1; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .d-sidebar-footer { margin-top:auto; padding:1.25rem 1.5rem; border-top:1px solid #1e293b; display:flex; align-items:center; gap:0.6rem; }
        .d-status-dot { width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 10px rgba(16, 185, 129, 0.6); }
        .d-status-text { font-size:0.75rem; color:#94a3b8; }

        .d-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .d-topbar { height: 64px; min-height: 64px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; padding: 0 2rem; }
        .d-topbar-title { font-size:1.1rem; font-weight:700; color:#0f172a; }
        .d-topbar-title span { color:#2563eb; }
        .d-back-btn { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: #475569; }

        .d-content { flex:1; overflow:hidden; padding: 2rem; display:flex; flex-direction:column; gap: 1.5rem; background:#f4f7f9; }
        .d-page-title { font-size:1.65rem; font-weight:800; color:#0f172a; letter-spacing: -0.02em; }
        .d-queue-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem 1.5rem; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 1.25rem; cursor: pointer; transition: all 0.2s ease; }
        .d-queue-card:hover { border-color: #3b82f6; transform: translateY(-2px); }
        .d-patient-name { font-size: 1.05rem; font-weight: 700; color: #0f172a; }
        .d-patient-meta { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }
        .d-vitals-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.6rem; }
        .d-vital-chip { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
        .d-urgency-badge { padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; border: 1px solid; text-transform: uppercase; display: flex; align-items: center; gap: 0.4rem; }
        .d-consult-btn { background: #ffffff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.55rem 1.1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; }

        .d-consult-grid { display:flex; gap: 1.5rem; flex:1; min-height:0; }
        .d-card { flex:1; background:#ffffff; border:1px solid #e2e8f0; border-radius: 20px; display:flex; flex-direction:column; overflow:hidden; }
        .d-card-header { padding: 1.25rem 1.5rem; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:0.75rem; flex-shrink:0; }
        .d-card-icon { width:36px; height:36px; border-radius:10px; color: white; background: linear-gradient(135deg, #1d4ed8, #4f46e5); display:flex; align-items:center; justify-content:center; }
        .d-card-title { font-size:0.85rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.08em; }
        .d-card-body { flex:1; overflow-y:auto; padding: 1.5rem; }

        .d-patient-info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:1.25rem; margin-bottom:1.5rem; }
        .d-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.85rem; margin-top:0.75rem; }
        .d-info-label { font-size:0.7rem; font-weight:600; color:#94a3b8; text-transform:uppercase; }
        .d-info-value { font-size:0.95rem; font-weight:600; color:#1e293b; }

        .d-record-btn { width:100%; padding: 0.85rem; border:none; border-radius:10px; font-size:0.95rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.6rem; }
        .d-record-start { background: linear-gradient(135deg, #ef4444, #dc2626); color:white; }
        .d-record-stop  { background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; }
        .pulse-dot { width:10px; height:10px; background:#ef4444; border-radius:50%; animation:pulse 1.5s infinite; }
        @keyframes pulse { 0% {box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);} 70% {box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);} 100% {box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);} }

        .d-analyzing { background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:0.85rem 1rem; font-size:0.85rem; font-weight: 500; color:#1d4ed8; display:flex; align-items:center; justify-content:center; gap:0.75rem; margin-top:1rem; }
        .d-section-label { font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.1em; margin:1.75rem 0 0.75rem; }
        .d-soap-box { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem; font-size:0.9rem; line-height:1.75; color:#334155; white-space:pre-wrap; }

        .d-cdss-item { background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding: 0.85rem 1.1rem; margin-bottom: 0.6rem; display:flex; align-items:center; gap:0.75rem; justify-content:space-between; }
        .d-cdss-check { display:flex; align-items:center; gap:0.75rem; cursor:pointer; flex:1; }
        .d-cdss-name { font-size:0.9rem; font-weight:600; color:#1e293b; }
        .d-del-btn { background:none; border:none; cursor:pointer; color: #ef4444; opacity:0.4; }
        .d-med-details { margin-top:0.85rem; padding-top:0.85rem; border-top:1px dashed #e2e8f0; display:flex; flex-wrap:wrap; gap:0.75rem; font-size:0.8rem; align-items:center; }
        .d-timing-grp { display:flex; align-items:center; gap:0.5rem; }
        .d-mini-sel, .d-dur-input { background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.3rem 0.6rem; color:#1e293b; font-size:0.8rem; outline:none; }
        .d-custom-input { width:100%; background:#ffffff; border:1px dashed #94a3b8; border-radius:10px; padding:0.75rem 1rem; color:#0f172a; font-size:0.85rem; outline:none; margin-top:0.5rem; }
        .d-finalize-btn { width:100%; padding:0.85rem; border:none; border-radius:10px; background: linear-gradient(135deg, #10b981, #059669); color:white; font-size:0.95rem; font-weight:600; cursor:pointer; margin-top:2rem; }

        .d-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:1000; padding: 1rem; }
        .d-modal { background:white; border-radius:24px; width:560px; max-width:100%; padding:2.5rem; }
        .d-modal-title { font-size:1.5rem; font-weight:800; color:#0f172a; margin-bottom: 0.2rem; }
        .d-modal-section { font-size:0.75rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; margin:1.5rem 0 0.75rem; }
        .d-r-row { display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px dashed #e2e8f0; }
        .d-r-name { font-size:0.9rem; color:#1e293b; font-weight:600; }
        .d-r-sig  { font-size:0.75rem; color:#64748b; margin-top:0.25rem; }
        .d-save-btn { width:100%; padding:0.85rem; background: linear-gradient(135deg, #2563eb, #1d4ed8); color:white; border:none; border-radius:10px; font-size:0.95rem; font-weight:600; cursor:pointer; margin-top:1.5rem; }

        .d-toast { position:fixed; bottom:1.5rem; right:1.5rem; padding:0.85rem 1.25rem; border-radius:12px; font-size:0.85rem; font-weight:600; z-index:9999; box-shadow:0 10px 25px rgba(0,0,0,0.1); }
        .d-toast.success { background:#0f172a; color:#4ade80; }
        .d-toast.error   { background:#fef2f2; color:#dc2626; border: 1px solid #fecaca; }

        .d-empty { text-align:center; padding:3rem; color:#cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
      `}</style>

      {toast && <div className={`d-toast ${toast.type}`}>{toast.msg}</div>}

      {/* RECEIPT MODAL */}
      {showReceipt && clinicalData && (
        <div className="d-modal-overlay">
          <div className="d-modal">
            <div className="d-modal-title">Consultation Summary</div>
            <div style={{fontSize:'0.85rem',color:'#64748b',marginBottom: '1.5rem'}}>Review prescription before finalizing</div>
            
            <div className="d-modal-section">Patient</div>
            <div style={{fontSize:'0.95rem',fontWeight:'700',color:'#0f172a'}}>{selectedVisit?.patients?.name} <span style={{color:'#94a3b8',fontWeight:'500'}}>· Age {selectedVisit?.patients?.age}</span></div>
            
            <div className="d-modal-section">Lab Tests</div>
            {(clinicalData.suggested_tests||[]).filter(t=>selectedTests.includes(t.name)).map((t,i)=>(
              <div key={i} className="d-r-row"><span className="d-r-name">{t.name}</span></div>
            ))}

            <div className="d-modal-section">Medications</div>
            {(clinicalData.suggested_medicines||[]).filter(m=>selectedMeds.includes(m.name)).map((med,i)=>{
              const d=(med.morning?1:0)+(med.afternoon?1:0)+(med.night?1:0);
              const safeDuration = String(med.duration || '');
              const dm = safeDuration.match(/\d+/); 
              const dv = dm ? parseInt(dm[0]) : 1;
              const qty = safeDuration.toLowerCase().includes('day') ? dv*(d||1) : dv;
              return (
                <div key={i} className="d-r-row" style={{flexDirection:'column'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span className="d-r-name">{med.name} <span style={{color:'#94a3b8', fontWeight: 500}}>×{qty}</span></span>
                  </div>
                  <div className="d-r-sig">{med.morning?'1':'0'}-{med.afternoon?'1':'0'}-{med.night?'1':'0'} | {med.food || 'After Food'} | {safeDuration}</div>
                </div>
              );
            })}

            <div style={{display:'flex',gap:'1rem', marginTop: '1rem'}}>
              <button onClick={()=>setShowReceipt(false)} style={{flex:1,padding:'0.85rem',background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:'10px',cursor:'pointer'}}>Edit</button>
              <button className="d-save-btn" style={{flex:2, marginTop: 0}} onClick={handleSaveAndDischarge} disabled={saving}>{saving?'⏳ Saving...':'Finalize & Save'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="d-layout">
        {/* SIDEBAR */}
        <aside className="d-sidebar">
          <div className="d-brand">
            <div className="d-brand-icon"><Icons.Brand/></div>
            <div><div className="d-brand-name">VitalsFlow</div><div className="d-brand-sub">Doctor Portal</div></div>
          </div>
          {doctor && (
            <div className="d-doctor-card">
              <div className="d-doctor-name">{doctor.name}</div>
              <div className="d-doctor-role">Attending Physician</div>
              <div className="d-queue-count">{visits.length} patient{visits.length!==1?'s':''} in queue</div>
            </div>
          )}
          <div className="d-nav-section">Navigation</div>
          <div className={`d-nav-item ${view==='queue'?'active':''}`} onClick={()=>setView('queue')}>
            <div className="d-nav-icon"><Icons.Queue/></div>
            <div><span className="d-nav-label">Patient Queue</span><span className="d-nav-sub">Active visits</span></div>
          </div>
          <button className="d-switch-btn" onClick={()=>{ setDoctor(null); setView('select'); }}>⇄ Switch Account</button>
          <div className="d-sidebar-footer"><div className="d-status-dot"/><span className="d-status-text">System Active</span></div>
        </aside>

        {/* MAIN */}
        <div className="d-main">
          <header className="d-topbar">
            <div className="d-topbar-title">{view==='queue'?<>VitalsFlow <span>Dashboard</span></>:<>Consultation: <span>{selectedVisit?.patients?.name}</span></>}</div>
            {view==='consultation' && <button className="d-back-btn" onClick={()=>setView('queue')}>← Queue</button>}
          </header>

          <div className="d-content">
            {view==='queue' && (
              <>
                <div className="d-page-title">Provider Queue</div>
                <div style={{flex:1,overflowY:'auto', marginTop:'1rem'}}>
                  {visits.length===0 ? (
                    <div className="d-empty">
                      <Icons.EmptyQueue/>
                      <div style={{marginTop: '1rem', fontWeight: 600}}>Queue is currently empty</div>
                    </div>
                  ) : (
                    visits.sort((a,b)=>{const o={critical:0,high:1,medium:2,low:3};return (o[a.urgency]??2)-(o[b.urgency]??2);}).map(visit=>{
                      const uc=urgencyConfig[visit.urgency]||urgencyConfig.medium;
                      return (
                        <div key={visit.id} className="d-queue-card" onClick={()=>openConsultation(visit)}>
                          <div style={{width:'48px',height:'48px',borderRadius:'12px',background:uc.bg,border:`1px solid ${uc.border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',flexShrink:0, color: uc.text}}>
                            {uc.icon}
                          </div>
                          <div style={{flex:1}}>
                            <div className="d-patient-name">{visit.patients?.name}</div>
                            <div className="d-patient-meta">Age {visit.patients?.age} · {new Date(visit.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                            <div className="d-vitals-row">
                              {visit.hr>0&&<span className="d-vital-chip">HR: {visit.hr}</span>}
                              {visit.sbp>0&&<span className="d-vital-chip">BP: {visit.sbp}/{visit.dbp}</span>}
                              {visit.bt>0&&<span className="d-vital-chip">Temp: {visit.bt}°C</span>}
                            </div>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem',alignItems:'flex-end'}}>
                            <span className="d-urgency-badge" style={{color:uc.text,background:uc.bg,borderColor:uc.border}}>{visit.urgency}</span>
                            <button className="d-consult-btn">Consult →</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {view==='consultation' && selectedVisit && (
              <div className="d-consult-grid">
                <div className="d-card">
                  <div className="d-card-header"><div className="d-card-icon"><Icons.Mic/></div><span className="d-card-title">AI Scribe</span></div>
                  <div className="d-card-body">
                    <div className="d-patient-info-box">
                      <div className="d-info-grid">
                        <div className="d-info-item"><span className="d-info-label">Name</span><span className="d-info-value">{selectedVisit.patients?.name}</span></div>
                        <div className="d-info-item"><span className="d-info-label">Age</span><span className="d-info-value">{selectedVisit.patients?.age} yrs</span></div>
                      </div>
                    </div>
                    {!isRecording
                      ? <button className="d-record-btn d-record-start" onClick={startRecording}><Icons.Mic/> Start Listening</button>
                      : <button className="d-record-btn d-record-stop" onClick={stopRecording}><div className="pulse-dot"/> Stop Recording</button>
                    }
                    {isTranscribing&&<div className="d-analyzing">AI Synthesizing Clinical Data...</div>}
                    {clinicalData && (
                      <>
                        <div className="d-section-label">Auto-Generated SOAP Notes</div>
                        <div className="d-soap-box">{clinicalData.soap_notes}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="d-card">
                  <div className="d-card-header"><div className="d-card-icon" style={{background: 'linear-gradient(135deg, #8b5cf6, #6366f1)'}}><Icons.Dna/></div><span className="d-card-title">Decisions</span></div>
                  <div className="d-card-body">
                    {clinicalData ? (
                      <>
                        <div className="d-section-label" style={{marginTop:0}}>Suggested Tests</div>
                        {(clinicalData.suggested_tests || []).map((test,i)=>(
                          <div key={i} className="d-cdss-item">
                            <label className="d-cdss-check"><input type="checkbox" checked={selectedTests.includes(test.name)} onChange={()=>toggleTest(test.name)}/><span className="d-cdss-name">{test.name}</span></label>
                            <button className="d-del-btn" onClick={()=>removeTest(test.name)}><Icons.Trash/></button>
                          </div>
                        ))}
                        <input className="d-custom-input" type="text" placeholder="+ Custom test..." value={customTest} onChange={e=>setCustomTest(e.target.value)} onKeyDown={handleAddCustomTest}/>
                        
                        <div className="d-section-label">Medications</div>
                        {(clinicalData.suggested_medicines || []).map((med,i)=>(
                          <div key={i} className="d-cdss-item" style={{flexDirection:'column', alignItems:'stretch'}}>
                            <div style={{display:'flex', justifyContent:'space-between'}}>
                              <label className="d-cdss-check"><input type="checkbox" checked={selectedMeds.includes(med.name)} onChange={()=>toggleMed(med.name)}/><span className="d-cdss-name">{med.name}</span></label>
                              <button className="d-del-btn" onClick={()=>removeMed(med.name)}><Icons.Trash/></button>
                            </div>
                            {selectedMeds.includes(med.name)&&(
                              <div className="d-med-details">
                                <div className="d-timing-grp">
                                  <label><input type="checkbox" checked={med.morning||false} onChange={e=>updateMedDetails(i,'morning',e.target.checked)}/> Mor</label>
                                  <label><input type="checkbox" checked={med.afternoon||false} onChange={e=>updateMedDetails(i,'afternoon',e.target.checked)}/> Aft</label>
                                  <label><input type="checkbox" checked={med.night||false} onChange={e=>updateMedDetails(i,'night',e.target.checked)}/> Nig</label>
                                </div>
                                <select className="d-mini-sel" value={med.food||'After Food'} onChange={e=>updateMedDetails(i,'food',e.target.value)}>
                                  <option>After Food</option><option>Before Food</option>
                                </select>
                                <input className="d-dur-input" type="text" value={med.duration||''} onChange={e=>updateMedDetails(i,'duration',e.target.value)} placeholder="Duration"/>
                              </div>
                            )}
                          </div>
                        ))}
                        <input className="d-custom-input" type="text" placeholder="+ Custom medication..." value={customMed} onChange={e=>setCustomMed(e.target.value)} onKeyDown={handleAddCustomMed}/>
                        <button className="d-finalize-btn" onClick={handleFinalize}>Review & Save</button>
                      </>
                    ) : (
                      <div className="d-empty">Record consultation to see AI suggestions.</div>
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