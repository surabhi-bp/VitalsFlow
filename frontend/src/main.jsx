import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Receptionist from './ReceptionistPortal.jsx'
import DoctorPortal from './DoctorPortal.jsx'
import PatientChatPage from './PatientChatPage.jsx' // <-- IMPORT ADDED HERE

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/reception" element={<Receptionist />} />
        <Route path="/doctor" element={<DoctorPortal />} />
        
        {/* NEW: Patient Aftercare Chat Route */}
        <Route path="/chat/:visitId" element={<PatientChatPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)