import React, { useState } from 'react';
import { 
  Activity, AlertCircle, Network, LayoutDashboard, 
  ShieldCheck, Clock, Zap, ChevronRight, Menu, 
  ChevronLeft, Stethoscope, Users, LogOut 
} from 'lucide-react';

// --- Imports for your existing components ---
import DoctorPortal from './DoctorPortal';
import ReceptionistPortal from './ReceptionistPortal';
import PatientChatPage from './PatientChatPage';

// --- Reusable Brand Logo Component to ensure 100% consistency ---
const BrandLogo = ({ size = "normal" }) => (
  <div className="brand">
    <div className={`brand-icon ${size === 'small' ? 'small' : ''}`}>
      <Activity size={size === 'small' ? 18 : 22} strokeWidth={2.5} color="white" />
    </div>
    <span className={`brand-text ${size === 'small' ? 'text-light' : 'text-dark'}`}>VitalsFlow</span>
  </div>
);

// --- LANDING PAGE COMPONENT ---
const LandingPage = ({ onLogin }) => {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <BrandLogo />
        <div className="nav-actions">
         
        </div>
      </nav>

      {/* Hero Section with Left-to-Right Fade Gradient Image Background */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="badge">SECURE HOSPITAL NETWORK</div>
          <h1 className="hero-title">
            Intelligent Hospital Workflow & <br />
            <span className="text-primary">Patient Vitals Management</span>
          </h1>
          <p className="hero-subtitle">
            A medical-grade platform designed to streamline triage, automate clinical documentation, and secure communications between reception and the examination room.
          </p>
          <div className="hero-cta-group">
            <button className="btn-primary large shadow-glow" onClick={() => onLogin('doctor')}>
              Access Doctor Portal <ChevronRight size={18} />
            </button>
            <button className="btn-secondary large" onClick={() => onLogin('receptionist')}>
              Access Receptionist Portal
            </button>
          </div>
        </div>
        
        {/* Visual Mockup matching the clean style */}
        <div className="hero-visual">
          <div className="mockup-window">
            <div className="mockup-header">
              <span className="dot red"></span><span className="dot yellow"></span><span className="dot green"></span>
            </div>
            <div className="mockup-body">
              <div className="mockup-row"><div className="mockup-skeleton w-3/4"></div></div>
              <div className="mockup-row"><div className="mockup-skeleton w-1/2"></div></div>
              <div className="mockup-grid">
                <div className="mockup-card">
                  <Activity size={36} color="#2563eb" opacity={0.8}/>
                </div>
                <div className="mockup-card">
                  <LayoutDashboard size={36} color="#2563eb" opacity={0.8}/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Core Objectives Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Core System Objectives</h2>
          <p>Built for modern healthcare environments requiring absolute precision and reliability.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Activity size={24} /></div>
            <h3>Real-Time Vitals Monitoring</h3>
            <p>Monitor patient vitals continuously with AI-assisted data tracking and threshold alerts.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><AlertCircle size={24} /></div>
            <h3>Intelligent Triage Detection</h3>
            <p>AI automatically analyzes incoming data to identify high-risk patients and prioritize urgent care.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Network size={24} /></div>
            <h3>Streamlined Staff Workflow</h3>
            <p>Improves coordination between medical staff and reception with real-time state synchronization.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><LayoutDashboard size={24} /></div>
            <h3>Smart Clinical Dashboard</h3>
            <p>Doctors receive clear, structured vitals, AI SOAP notes, and actionable clinical insights instantly.</p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-content">
          <h2>Designed for Modern Healthcare Systems</h2>
          <div className="trust-list">
            <div className="trust-item">
              <ShieldCheck className="trust-icon" />
              <div>
                <h4>Enterprise-Grade Security</h4>
                <p>Data is handled with strict confidentiality protocols and role-based access.</p>
              </div>
            </div>
            <div className="trust-item">
              <Clock className="trust-icon" />
              <div>
                <h4>Zero-Latency Processing</h4>
                <p>Edge AI capabilities ensure vitals are analyzed without delay.</p>
              </div>
            </div>
            <div className="trust-item">
              <Zap className="trust-icon" />
              <div>
                <h4>Seamless Integration</h4>
                <p>Built to slide effortlessly into existing hospital tech stacks.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- MAIN APP (ROUTER & LAYOUT) ---
function App() {
  // Check if URL is a chat link e.g. /chat/abc-123
  const path = window.location.pathname;
  if (path.startsWith('/chat/')) {
    const visitId = path.split('/chat/')[1];
    return <PatientChatPage visitId={visitId} />;
  }

  const [userRole, setUserRole] = useState(null); // 'doctor' or 'receptionist'
  const [currentView, setCurrentView] = useState(null); // 'doctor' or 'receptionist'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogin = (role) => {
    setUserRole(role);
    setCurrentView(role === 'doctor' ? 'doctor' : 'receptionist');
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentView(null);
  };

  if (!userRole) {
    return (
      <>
        <Styles />
        <LandingPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Styles />
      <div className="dashboard-layout">
        
        {/* Dark Navy Collapsible Sidebar */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            {!isSidebarCollapsed && <BrandLogo size="small" />}
            <button className="collapse-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              {isSidebarCollapsed ? <Menu size={20} color="white" /> : <ChevronLeft size={20} color="white" />}
            </button>
          </div>

          <div className="sidebar-nav">
            <div className="nav-section-title">{!isSidebarCollapsed && "SYSTEM MODULES"}</div>
            
            {userRole === 'receptionist' && (
              <button 
                className={`nav-btn ${currentView === 'receptionist' ? 'active' : ''}`}
                onClick={() => setCurrentView('receptionist')}
                title="Receptionist Portal"
              >
                <Users size={20} />
                {!isSidebarCollapsed && <span>Receptionist Portal</span>}
              </button>
            )}

            <button 
              className={`nav-btn ${currentView === 'doctor' ? 'active' : ''}`}
              onClick={() => setCurrentView('doctor')}
              title="Doctor Portal"
            >
              <Stethoscope size={20} />
              {!isSidebarCollapsed && <span>Physician Portal</span>}
            </button>
          </div>

          <div className="sidebar-footer">
            <button className="nav-btn logout-btn" onClick={handleLogout} title="Secure Logout">
              <LogOut size={20} />
              {!isSidebarCollapsed && <span>Secure Logout</span>}
            </button>
            <div className="status-indicator">
              <span className="dot green pulse"></span>
              {!isSidebarCollapsed && <span className="status-text text-light">System Online</span>}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {/* Topbar */}
          <header className="dashboard-topbar">
            <h2 className="topbar-title">
              {currentView === 'doctor' ? 'Physician Clinical Workspace' : 'Front Desk Dispatch Dashboard'}
            </h2>
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{userRole === 'doctor' ? 'Dr. Admin' : 'Front Desk'}</span>
                <span className="user-role-badge">{userRole === 'doctor' ? 'Physician' : 'Dispatcher'}</span>
              </div>
              <div className="avatar">
                {userRole === 'doctor' ? 'DR' : 'RC'}
              </div>
            </div>
          </header>
          
          <div className="dashboard-content">
            {currentView === 'doctor' && <DoctorPortal />}
            {currentView === 'receptionist' && <ReceptionistPortal />}
          </div>
        </main>
      </div>
    </>
  );
}

// --- CSS IN JS ---
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    :root {
      --primary: #2563eb;         
      --primary-hover: #1d4ed8;
      --secondary: #eff6ff;       
      
      --sidebar-bg: #0b1120;      
      --sidebar-hover: #1e293b;   
      --sidebar-active: #3b82f6;  
      --sidebar-text: #cbd5e1;
      
      --text-main: #0f172a;       
      --text-muted: #64748b;      
      --bg-main: #f8fafc;         
      --white: #ffffff;
      --border: #e2e8f0;
      
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
      --shadow-glow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background-color: var(--bg-main); color: var(--text-main); -webkit-font-smoothing: antialiased; overflow-x: hidden; }

    button { cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: none; }
    .btn-primary { background: var(--primary); color: var(--white); padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-secondary { background: var(--white); color: var(--text-main); padding: 0.65rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--bg-main); border-color: #cbd5e1; }
    .large { padding: 0.85rem 1.75rem; font-size: 1rem; border-radius: 10px; }
    .shadow-glow { box-shadow: var(--shadow-glow); }

    .brand { display: flex; align-items: center; gap: 0.75rem; }
    .brand-icon { width: 34px; height: 34px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(37,99,235,0.3); flex-shrink: 0; }
    .brand-icon.small { width: 30px; height: 30px; border-radius: 8px; box-shadow: none; }
    .brand-text { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; }
    .text-dark { color: var(--text-main); }
    .text-light { color: var(--white); font-size: 1.2rem; }
    .text-primary { color: var(--primary); }

    .landing-container { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg-main); }
    
    .landing-nav { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 5%; background: var(--white); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .nav-actions { display: flex; gap: 1rem; }

    .hero-section { 
      display: flex; 
      align-items: center; 
      justify-content: space-between; 
      padding: 7rem 5%; 
      gap: 4rem; 
      overflow: hidden; 
      border-bottom: 1px solid var(--border);
      background: linear-gradient(to right, rgba(248, 250, 252, 1) 0%, rgba(248, 250, 252, 0.9) 40%, rgba(248, 250, 252, 0.4) 100%), url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=2073&auto=format&fit=crop');
      background-size: cover;
      background-position: center;
    }
    .hero-content { flex: 1; max-width: 600px; position: relative; z-index: 2; }
    .badge { display: inline-block; padding: 0.35rem 0.85rem; background: var(--white); color: var(--primary); border-radius: 99px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; border: 1px solid #bfdbfe; box-shadow: var(--shadow-sm); }
    .hero-title { font-size: 3.2rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.5rem; color: var(--text-main); }
    .hero-subtitle { font-size: 1.1rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 2.5rem; }
    .hero-cta-group { display: flex; gap: 1rem; }

    .hero-visual { flex: 1; display: flex; justify-content: flex-end; position: relative; z-index: 2; }
    .mockup-window { width: 100%; max-width: 520px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 12px; border: 1px solid var(--border); box-shadow: var(--shadow-md); overflow: hidden; }
    .mockup-header { background: var(--white); padding: 1rem; border-bottom: 1px solid var(--border); display: flex; gap: 0.5rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.red { background: #ef4444; } .dot.yellow { background: #f59e0b; } .dot.green { background: #10b981; }
    
    .mockup-body { padding: 2rem; overflow: hidden; }
    .mockup-row { margin-bottom: 1.2rem; }
    .mockup-skeleton { height: 12px; background: #e2e8f0; border-radius: 6px; }
    .w-3\\/4 { width: 75%; } .w-1\\/2 { width: 50%; }
    
    .mockup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; }
    .mockup-card { 
      height: 120px; 
      background: var(--secondary); 
      border-radius: 8px; 
      border: 1px dashed #bfdbfe; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
    }

    .features-section { padding: 6rem 5%; background: var(--white); }
    .section-header { text-align: center; margin-bottom: 4rem; max-width: 600px; margin-inline: auto; }
    .section-header h2 { font-size: 2rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.02em; color: var(--text-main); }
    .section-header p { color: var(--text-muted); font-size: 1.1rem; }
    
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .feature-card { padding: 2.5rem 2rem; background: var(--white); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s; }
    .feature-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: #cbd5e1; }
    .feature-icon { width: 48px; height: 48px; background: var(--secondary); color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
    .feature-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-main); }
    .feature-card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }

    .trust-section { padding: 6rem 5%; background: var(--bg-main); border-top: 1px solid var(--border); display: flex; justify-content: center; }
    .trust-content { max-width: 800px; width: 100%; text-align: center; }
    .trust-content h2 { font-size: 2rem; font-weight: 800; margin-bottom: 3rem; letter-spacing: -0.02em; color: var(--text-main); }
    .trust-list { display: flex; flex-direction: column; gap: 2rem; text-align: left; }
    .trust-item { display: flex; gap: 1.5rem; align-items: flex-start; padding: 2rem; background: var(--white); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); }
    .trust-icon { color: var(--primary); flex-shrink: 0; width: 32px; height: 32px; }
    .trust-item h4 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main); }
    .trust-item p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }

    .dashboard-layout { display: flex; height: 100vh; overflow: hidden; background: var(--bg-main); }
    
    .sidebar { width: 260px; background: var(--sidebar-bg); border-right: 1px solid #1e293b; display: flex; flex-direction: column; transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 50; flex-shrink: 0; }
    .sidebar.collapsed { width: 80px; }
    
    .sidebar-header { height: 72px; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .sidebar.collapsed .sidebar-header { justify-content: center; padding: 0; }
    .collapse-btn { background: none; padding: 0.5rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .collapse-btn:hover { background: rgba(255,255,255,0.1); }
    
    .sidebar-nav { padding: 1.5rem 1rem; flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
    .nav-section-title { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; padding: 0 0.5rem 0.5rem; margin-top: 0.5rem; }
    
    .nav-btn { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; width: 100%; border-radius: 8px; color: var(--sidebar-text); font-weight: 600; font-size: 0.9rem; background: transparent; transition: all 0.2s; white-space: nowrap; overflow: hidden; }
    .sidebar.collapsed .nav-btn { justify-content: center; padding: 0.85rem; }
    .nav-btn:hover { background: var(--sidebar-hover); color: var(--white); }
    
    .nav-btn.active { background: var(--sidebar-active); color: var(--white); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
    
    .sidebar-footer { padding: 1.5rem 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 1rem; }
    .sidebar.collapsed .sidebar-footer { padding: 1.5rem 0.5rem; align-items: center; }
    .logout-btn { color: #fca5a5; }
    .logout-btn:hover { background: rgba(248, 113, 113, 0.15); color: #fecaca; }
    .status-indicator { display: flex; align-items: center; gap: 0.75rem; padding: 0 1rem; }
    .sidebar.collapsed .status-indicator { padding: 0; justify-content: center; }
    .status-text { font-size: 0.8rem; font-weight: 500; }
    .dot.pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

    .dashboard-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    
    .dashboard-topbar { height: 72px; background: var(--white); border-bottom: 1px solid var(--border); padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; z-index: 10; }
    .topbar-title { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.01em; color: var(--primary); }
    
    .user-profile { display: flex; align-items: center; gap: 1rem; cursor: pointer; padding: 0.4rem; border-radius: 8px; transition: background 0.2s; }
    .user-profile:hover { background: #f1f5f9; }
    .user-info { display: flex; flex-direction: column; align-items: flex-end; }
    .user-name { font-size: 0.85rem; font-weight: 600; color: var(--text-main); }
    .user-role-badge { font-size: 0.7rem; color: var(--primary); font-weight: 600; }
    .avatar { width: 38px; height: 38px; border-radius: 8px; background: var(--secondary); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; border: 1px solid #bfdbfe; }
    
    .dashboard-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    
    @media (max-width: 1024px) {
      .hero-section { flex-direction: column; text-align: center; padding-top: 4rem; padding-bottom: 4rem; background: linear-gradient(rgba(248, 250, 252, 0.9), rgba(248, 250, 252, 0.95)), url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=2073&auto=format&fit=crop'); }
      .hero-content { display: flex; flex-direction: column; align-items: center; }
      .hero-visual { justify-content: center; margin-top: 3rem; width: 100%; }
      .mockup-grid { grid-template-columns: 1fr; }
    }
  `}</style>
);

export default App;