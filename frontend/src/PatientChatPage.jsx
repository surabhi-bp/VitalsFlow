import { useState, useEffect, useRef } from "react";

// PatientChatPage.jsx
const API = "https://vitalsflow-production.up.railway.app"; 

// ─── Helpers ─────────────────────────────────────────────────────
const getTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function buildWelcomeMessages(visit) {
  const msgs = [];
  let id = 1;
  const push = (obj) => msgs.push({ id: id++, time: getTime(), from: "hospital", ...obj });

  const meds = (visit.prescriptions?.[0]?.items || []).filter((i) => i.type === "medication");
  const tests = (visit.prescriptions?.[0]?.items || []).filter((i) => i.type === "test");
  const notes = visit.consultation_notes?.[0]?.soap_notes;
  const bill = visit.bills?.[0]?.total_amount || visit.bill_amount;

  // Personalized Welcome Greeting
  push({
    type: "text",
    text: `🏥 *Hello ${visit.patients.name}!* \n\nWelcome to your personalized recovery assistant. I have reviewed your records from your visit today. I'm here 24/7 to help you with your recovery.\n\nHow can I assist you right now? 💙`,
  });

  // Doctor's summary card
  if (notes) {
    push({
      type: "summary_card",
      urgency: visit.urgency || "medium",
      notes,
      vitals: { hr: visit.hr, sbp: visit.sbp, dbp: visit.dbp, sat: visit.saturation, temp: visit.bt },
    });
  }

  // Medications Section
  if (meds.length > 0) {
    const medText = meds.map((m) => {
      const t = [m.morning && "🌅 Morning", m.afternoon && "☀️ Afternoon", m.night && "🌙 Night"]
        .filter(Boolean).join("  ·  ") || "As directed";
      return `*${m.name}*\n${t}  ·  ${m.food || "After Food"}  ·  ${m.duration || "As prescribed"}`;
    }).join("\n\n");

    push({
      type: "text",
      text: `💊 *Your Prescribed Medicines*\n\n${medText}\n\n— Please ensure you complete the full course.`,
    });
  }

  // Quick replies for ease of use
  push({
    type: "text",
    text: `💬 You can ask me things like:\n• When should I take my meds?\n• Are there any side effects?\n• How should I fast for the tests?`,
    quickReplies: ["Medicine timing?", "Diet advice", "Follow-up info"],
  });

  return msgs;
}

const urgencyStyle = {
  low:      { color: "#22c55e", border: "#22c55e44", bg: "#22c55e12", label: "Low Priority" },
  medium:   { color: "#f59e0b", border: "#f59e0b44", bg: "#f59e0b12", label: "Moderate Priority" },
  high:     { color: "#f97316", border: "#f97316aa", bg: "#f9731615", label: "High Priority" },
  critical: { color: "#ef4444", border: "#ef4444aa", bg: "#ef444415", label: "Critical Priority" },
};

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────
export default function PatientChatPage(props) {
  const { visitId } = props; // Passed from App.jsx routing logic
  
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyDone, setEmergencyDone] = useState(false);
  const bottomRef = useRef(null);

  // ── Fetch visit data and authenticate patient via URL ──
  useEffect(() => {
    const loadData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 
        
        const res = await fetch(`${API}/api/visits/${visitId}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error("This secure chat link is invalid or has expired.");
        const json = await res.json();
        const data = json.data;

        setVisit(data);

        // Populate the chat with personalized medical context
        const welcome = buildWelcomeMessages(data);
        setMessages(welcome);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    if (visitId) loadData();
    else setError("Missing access token. Please use the link sent to your WhatsApp.");
  }, [visitId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || isTyping) return;
    setInput("");

    setMessages(prev => [...prev, { id: Date.now(), from: "patient", type: "text", time: getTime(), text }]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/api/chat/aftercare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visitId, message: text }),
      });
      
      const data = await res.json();
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", type: "text", time: getTime(), text: data.reply }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", type: "text", time: getTime(), text: "I'm having trouble connecting to the clinic. Please call 📞 1800-VITALS." }]);
    }
  };

  const handleEmergency = (note) => {
    setEmergencyDone(true);
    setShowEmergency(false);
    const reception = [
      `🚨 EMERGENCY ALERT`,
      `Patient: ${visit.patients.name}`,
      `Phone: ${visit.patients.phone}`,
      `Visit ID: ${visitId}`,
      note ? `Note: "${note}"` : null,
    ].filter(Boolean).join("\n");

    setMessages(prev => [
      ...prev,
      { id: Date.now(), from: "patient", type: "text", time: getTime(), text: "🚨 EMERGENCY ALERT SENT" },
      { id: Date.now() + 1, from: "hospital", type: "emergency_confirm", time: getTime(), receptionMsg: reception },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0f1923", fontFamily: "'DM Sans', sans-serif", maxWidth: 600, margin: "0 auto", position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes bIn { from{opacity:0;transform:scale(.88) translateY(8px)} to{opacity:1;transform:none} }
        .t-dot{width:7px;height:7px;border-radius:50%;background:#64748b;animation:tdot 1.2s infinite}
        @keyframes tdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
      `}</style>

      {showEmergency && <EmergencyModal patientName={visit.patients.name} onConfirm={handleEmergency} onClose={() => setShowEmergency(false)} />}

      {/* Header with Patient context */}
      <div style={{ background: "#0d2137", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <WaIcon size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>VitalsFlow Aftercare</div>
          <div style={{ color: "#25d366", fontSize: "0.7rem" }}>🟢 Connected · Secure Patient Link</div>
        </div>

        {!emergencyDone && (
          <button onClick={() => setShowEmergency(true)} style={{ background: "#ef4444", border: "none", borderRadius: 10, padding: "0.45rem 0.8rem", color: "white", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>
            🚨 EMERGENCY
          </button>
        )}
      </div>

      {/* Chat History */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {messages.map((msg) => {
          if (msg.type === "summary_card") return <SummaryCard key={msg.id} msg={msg} />;
          if (msg.type === "emergency_confirm") return <EmergencyConfirmBubble key={msg.id} msg={msg} />;
          return <TextBubble key={msg.id} msg={msg} onQuickReply={handleSend} />;
        })}
        {isTyping && (
          <div style={{ display: "flex", gap: 5, padding: '10px', background: '#1e2d3d', width: 'fit-content', borderRadius: '15px' }}>
            <div className="t-dot" /> <div className="t-dot" style={{animationDelay: '0.2s'}} /> <div className="t-dot" style={{animationDelay: '0.4s'}} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message Input */}
      <div style={{ background: "#0d1a2a", padding: "0.8rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Ask about your medicines..."
          style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 24, padding: "0.75rem 1.1rem", color: "white", outline: "none" }}
        />
        <button onClick={() => handleSend()} style={{ width: 45, height: 45, borderRadius: "50%", background: "#25d366", border: "none", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          🚀
        </button>
      </div>
    </div>
  );
}

// Support components
function WaIcon({ size = 20, color = "white" }) { return <span>💬</span>; }