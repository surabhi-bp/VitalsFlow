import { useState, useEffect, useRef } from "react";

const API = "https://vitalsflow-production.up.railway.app"; 

// ─── Helpers ─────────────────────────────────────────────────────
const getTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function buildWelcomeMessages(visit) {
  const msgs = [];
  let id = 1;
  const push = (obj) => msgs.push({ id: id++, time: getTime(), from: "hospital", ...obj });

  const meds = (visit.prescriptions?.[0]?.items || []).filter((i) => i.type === "medication");
  const notes = visit.consultation_notes?.[0]?.soap_notes;

  // Welcome Greeting
  push({
    type: "text",
    text: `🏥 *Hello ${visit.patients.name}!* \n\nYour visit is complete. I'm your recovery assistant, here to help with your medicines and recovery.`,
  });

  // Summary Card
  if (notes) {
    push({
      type: "summary_card",
      urgency: visit.urgency || "medium",
      notes,
      vitals: { hr: visit.hr, sbp: visit.sbp, dbp: visit.dbp, sat: visit.saturation, temp: visit.bt },
    });
  }

  // Medications
  if (meds.length > 0) {
    const medText = meds.map((m) => `• *${m.name}* (${m.duration || "As prescribed"})`).join("\n");
    push({
      type: "text",
      text: `💊 *Your Medicines:*\n${medText}\n\nHow are you feeling now?`,
    });
  }

  return msgs;
}

const urgencyStyle = {
  low:      { color: "#22c55e", border: "#22c55e44", bg: "#22c55e12", label: "Low Priority" },
  medium:   { color: "#f59e0b", border: "#f59e0b44", bg: "#f59e0b12", label: "Moderate Priority" },
  high:     { color: "#f97316", border: "#f97316aa", bg: "#f9731615", label: "High Priority" },
  critical: { color: "#ef4444", border: "#ef4444aa", bg: "#ef444415", label: "Critical Priority" },
};

// ─── Internal Components ──────────────────────────────────────────

function WaIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function SummaryCard({ msg }) {
  const us = urgencyStyle[msg.urgency] || urgencyStyle.medium;
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", marginLeft: "2.2rem", marginBottom: "0.5rem" }}>
      <div style={{ background: "#1a2d42", border: `1px solid ${us.border}`, borderRadius: "16px 16px 16px 4px", overflow: "hidden" }}>
        <div style={{ background: us.bg, padding: "0.5rem 1rem", borderBottom: `1px solid ${us.border}`, color: us.color, fontWeight: 700, fontSize: "0.7rem" }}>
          SUMMARY — {us.label}
        </div>
        <div style={{ padding: "0.8rem 1rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>{msg.notes}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
             {msg.vitals.hr > 0 && <span style={{fontSize: '0.7rem', color: '#64748b', background: '#ffffff05', padding: '2px 6px', borderRadius: 4}}>HR: {msg.vitals.hr}</span>}
             {msg.vitals.sat > 0 && <span style={{fontSize: '0.7rem', color: '#64748b', background: '#ffffff05', padding: '2px 6px', borderRadius: 4}}>SpO2: {msg.vitals.sat}%</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────

export default function PatientChatPage({ visitId }) {
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/visits/${visitId}`);
        if (!res.ok) throw new Error("Link invalid.");
        const json = await res.json();
        
        setVisit(json.data);
        // Load messages INSTANTLY
        setMessages(buildWelcomeMessages(json.data));
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    if (visitId) load();
  }, [visitId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const text = input.trim();
    setInput("");

    setMessages(prev => [...prev, { id: Date.now(), from: "patient", time: getTime(), text }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/api/chat/aftercare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visitId, message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", time: getTime(), text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", time: getTime(), text: "Sorry, I'm offline. Call 1800-VITALS." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) return <div style={{height:'100vh', background:'#050f1a', color:'white', display:'flex', alignItems:'center', justifyContent:'center'}}>Connecting...</div>;
  if (error) return <div style={{height:'100vh', background:'#050f1a', color:'red', padding:'2rem'}}>{error}</div>;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0f1923", fontFamily: "sans-serif", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "#0d2137", padding: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", borderBottom: "1px solid #ffffff11" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <WaIcon size={22} color="white" />
        </div>
        <div>
          <div style={{ color: "white", fontWeight: 700 }}>VitalsFlow Assistant</div>
          <div style={{ color: "#25d366", fontSize: "0.7rem" }}>🟢 Online</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {messages.map((msg) => (
          msg.type === "summary_card" ? <SummaryCard key={msg.id} msg={msg} /> : (
            <div key={msg.id} style={{ alignSelf: msg.from === "hospital" ? "flex-start" : "flex-end", maxWidth: "85%" }}>
              <div style={{ background: msg.from === "hospital" ? "#1e2d3d" : "#25d366", color: "white", padding: "0.7rem 1rem", borderRadius: "12px", fontSize: "0.9rem" }}>
                {msg.text}
                <div style={{fontSize: '0.6rem', opacity: 0.5, textAlign: 'right', marginTop: 4}}>{msg.time}</div>
              </div>
            </div>
          )
        ))}
        {isTyping && <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Assistant is typing...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: "#0d1a2a", padding: "0.8rem", display: "flex", gap: "0.6rem" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          style={{ flex: 1, background: "#ffffff11", border: "none", borderRadius: 24, padding: "0.7rem 1.1rem", color: "white", outline: "none" }}
        />
        <button onClick={handleSend} style={{ width: 45, height: 45, borderRadius: "50%", background: "#25d366", border: "none", cursor: "pointer", color: "white", fontSize: '1.2rem' }}>
          ➤
        </button>
      </div>
    </div>
  );
}