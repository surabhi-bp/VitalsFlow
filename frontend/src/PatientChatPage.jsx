import { useState, useEffect, useRef } from "react";

const API = "https://vitalsflow-production.up.railway.app"; // ← your FastAPI backend

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

  // Welcome
  push({
    type: "text",
    text: `🏥 *Hello ${visit.patients.name}!*\n\nYour visit to VitalsFlow Hospital is complete${bill ? ` and your payment of ₹${Number(bill).toLocaleString()} has been received` : ""}. Thank you for choosing us. 🙏\n\nI'm your personal recovery assistant — here 24/7 to help with your medicines, tests, and recovery.\n\n— VitalsFlow Care Team 💙`,
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

  // Medications
  if (meds.length > 0) {
    const medText = meds.map((m) => {
      const t = [m.morning && "🌅 Morning", m.afternoon && "☀️ Afternoon", m.night && "🌙 Night"]
        .filter(Boolean).join("  ·  ") || "As directed";
      return `*${m.name}*\n${t}  ·  ${m.food || "After Food"}  ·  ${m.duration || "As prescribed"}`;
    }).join("\n\n");

    push({
      type: "text",
      text: `💊 *Your Medicines*\n\n${medText}\n\n⚠️ *Don't skip doses* — complete the full course even when you feel better.\n\n— VitalsFlow Care Team 💙`,
    });
  }

  // Tests
  if (tests.length > 0) {
    push({
      type: "text",
      text: `🧪 *Lab Tests for You*\n\n${tests.map((t) => `• ${t.name}`).join("\n")}\n\nCollect within *2–3 days*. Visit our Diagnostics Centre — Ground Floor, Mon–Sat, 7AM–7PM.\n\n— VitalsFlow Care Team 💙`,
    });
  }

  // Quick replies
  push({
    type: "text",
    text: `💬 Just type any question below! I can help with:\n• Medicine timing & side effects\n• Test preparation & fasting\n• Diet & recovery tips\n• Booking a follow-up\n\nAnd if it's ever an emergency, tap the *🚨 red button* at the top.\n\n— VitalsFlow Care Team 💙`,
    quickReplies: ["Medicine side effects?", "Diet advice", "When is follow-up?", "Test preparation"],
  });

  return msgs;
}

const urgencyStyle = {
  low:      { color: "#22c55e", border: "#22c55e44", bg: "#22c55e12", label: "Low Priority" },
  medium:   { color: "#f59e0b", border: "#f59e0b44", bg: "#f59e0b12", label: "Moderate Priority" },
  high:     { color: "#f97316", border: "#f97316aa", bg: "#f9731615", label: "High Priority" },
  critical: { color: "#ef4444", border: "#ef4444aa", bg: "#ef444415", label: "Critical Priority" },
};

// ─── Loading Screen ───────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ height: "100dvh", background: "#050f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(37,211,102,0.3)" }}>
        <WaIcon size={28} color="white" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#25d366", opacity: 0.6, animation: "pulse 1.2s infinite", animationDelay: `${d}s` }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(.7);opacity:.4} 40%{transform:scale(1);opacity:1} }`}</style>
      <p style={{ color: "#475569", fontSize: "0.85rem", fontWeight: 500 }}>Loading your aftercare chat...</p>
    </div>
  );
}

// ─── Error Screen ─────────────────────────────────────────────────
function ErrorScreen({ message }) {
  return (
    <div style={{ height: "100dvh", background: "#050f1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: "'DM Sans', sans-serif", padding: "2rem", textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🏥</div>
      <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "1.1rem" }}>Chat Not Found</div>
      <div style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 280 }}>{message || "This link may have expired or is invalid. Please contact VitalsFlow Hospital."}</div>
      <div style={{ marginTop: "0.5rem", color: "#25d366", fontWeight: 600, fontSize: "0.9rem" }}>📞 1800-VITALS</div>
    </div>
  );
}

// ─── Emergency Modal ──────────────────────────────────────────────
function EmergencyModal({ patientName, onConfirm, onClose }) {
  const [note, setNote] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}>
      <div style={{ background: "#0d1b2a", border: "1px solid #ef444455", borderRadius: "20px 20px 16px 16px", padding: "2rem 1.5rem", width: "100%", maxWidth: 440, boxShadow: "0 -4px 60px rgba(239,68,68,0.2)", animation: "slideUp .3s cubic-bezier(.34,1.4,.64,1)" }}
        onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>🚨</div>
          <div style={{ color: "#ef4444", fontWeight: 800, fontSize: "1.15rem" }}>Contact Reception?</div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: 6, lineHeight: 1.6 }}>
            The front desk will be immediately alerted with your details.
          </div>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Describe your emergency (e.g. severe chest pain, can't breathe)..."
          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "0.75rem 1rem", color: "#f1f5f9", fontSize: "0.88rem", fontFamily: "'DM Sans',sans-serif", resize: "none", minHeight: 80, outline: "none", boxSizing: "border-box", marginBottom: "1rem" }} />
        <button onClick={() => onConfirm(note)}
          style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", border: "none", borderRadius: 14, fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", marginBottom: "0.75rem", boxShadow: "0 4px 24px rgba(239,68,68,0.4)", letterSpacing: "0.02em" }}>
          🚨 Alert Reception Now
        </button>
        <button onClick={onClose}
          style={{ width: "100%", padding: "0.85rem", background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Summary Card Bubble ──────────────────────────────────────────
function SummaryCard({ msg }) {
  const us = urgencyStyle[msg.urgency] || urgencyStyle.medium;
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", marginLeft: "2.2rem", marginBottom: "0.25rem" }}>
      <div style={{ background: "#1a2d42", border: `1px solid ${us.border}`, borderRadius: "16px 16px 16px 4px", overflow: "hidden" }}>
        <div style={{ background: us.bg, padding: "0.55rem 1rem", borderBottom: `1px solid ${us.border}`, display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: us.color, flexShrink: 0 }} />
          <span style={{ color: us.color, fontWeight: 700, fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {us.label} — Discharge Summary
          </span>
        </div>
        <div style={{ padding: "0.85rem 1rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.65, margin: "0 0 0.75rem" }}>{msg.notes}</p>
          {msg.vitals && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[["HR", msg.vitals.hr, "bpm"], ["BP", `${msg.vitals.sbp}/${msg.vitals.dbp}`, ""], ["SpO2", msg.vitals.sat, "%"], ["Temp", msg.vitals.temp, "°C"]]
                .filter(([, v]) => v && v !== "0/0" && v !== "0")
                .map(([k, v, u]) => (
                  <div key={k} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "0.25rem 0.6rem", fontSize: "0.7rem" }}>
                    <span style={{ color: "#64748b" }}>{k} </span>
                    <span style={{ color: "#e2e8f0", fontWeight: 700, fontFamily: "monospace" }}>{v}{u}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div style={{ padding: "0.35rem 1rem", background: "rgba(0,0,0,0.15)", fontSize: "0.62rem", color: "#475569" }}>
          {msg.time} · VitalsFlow Care Team
        </div>
      </div>
    </div>
  );
}

// ─── Text Bubble ─────────────────────────────────────────────────
function TextBubble({ msg, onQuickReply }) {
  const isHosp = msg.from === "hospital";
  const html = (msg.text || "")
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isHosp ? "flex-start" : "flex-end", gap: "0.35rem", animation: "bIn .25s cubic-bezier(.34,1.56,.64,1) both" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexDirection: isHosp ? "row" : "row-reverse", maxWidth: "85vw" }}>
        {isHosp && (
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
            <WaIcon size={13} color="white" />
          </div>
        )}
        <div style={{
          background: isHosp ? "#1e2d3d" : "linear-gradient(135deg,#25d366,#1aad54)",
          borderRadius: isHosp ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
          padding: "0.7rem 1rem",
          maxWidth: "100%",
          wordBreak: "break-word",
        }}>
          <div style={{ color: isHosp ? "#cbd5e1" : "white", fontSize: "0.9rem", lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: html }} />
          <div style={{ color: isHosp ? "#334155" : "rgba(255,255,255,0.5)", fontSize: "0.62rem", marginTop: 5, textAlign: "right", fontFamily: "monospace" }}>
            {msg.time}{!isHosp && " ✓✓"}
          </div>
        </div>
      </div>
      {msg.quickReplies && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginLeft: "2.2rem", marginTop: 2 }}>
          {msg.quickReplies.map((qr, i) => (
            <button key={i} onClick={() => onQuickReply(qr)}
              style={{ cursor: "pointer", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.3)", borderRadius: 20, padding: "6px 14px", color: "#25d366", fontSize: "0.78rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", transition: "all .2s", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.target.style.background = "rgba(37,211,102,0.18)"}
              onMouseLeave={e => e.target.style.background = "rgba(37,211,102,0.08)"}>
              {qr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Emergency Confirm Bubble ─────────────────────────────────────
function EmergencyConfirmBubble({ msg }) {
  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", marginLeft: "2.2rem" }}>
      <div style={{ background: "#1a1015", border: "1px solid #ef444444", borderRadius: "16px 16px 16px 4px", padding: "1rem 1.1rem" }}>
        <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.85rem", marginBottom: 8 }}>🚨 Reception Has Been Alerted</div>
        <div style={{ background: "rgba(239,68,68,0.07)", borderRadius: 8, padding: "0.6rem 0.85rem", fontSize: "0.75rem", color: "#fca5a5", lineHeight: 1.65, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          {msg.receptionMsg}
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 10, lineHeight: 1.6 }}>
          Our team has your details. Please call <strong style={{ color: "#f87171" }}>1800-VITALS</strong> or stay put — help is being arranged. 🏥
        </div>
        <div style={{ color: "#334155", fontSize: "0.62rem", marginTop: 8 }}>{msg.time}</div>
      </div>
    </div>
  );
}

// ─── WA Icon ─────────────────────────────────────────────────────
function WaIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────
export default function PatientChatPage(props) {
  const { visitId } = props; // passed from App.jsx
  
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyDone, setEmergencyDone] = useState(false);
  const bottomRef = useRef(null);

  // ── Fetch visit data from backend ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/visits/${visitId}`);
        if (!res.ok) throw new Error("Visit not found");
        const data = await res.json();

        // Guard: only show chat if bill is paid
        if (data.data.status !== "paid" && data.data.bills?.[0]?.status !== "paid") {
          setError("Your aftercare chat will be activated once your bill is settled. Please contact the front desk.");
          setLoading(false);
          return;
        }

        setVisit(data.data);

        // Stagger welcome messages
        const welcome = buildWelcomeMessages(data.data);
        let delay = 500;
        welcome.forEach((msg) => {
          setTimeout(() => setMessages(prev => [...prev, msg]), delay);
          delay += 700 + Math.min((msg.text?.length || 200) * 5, 1400);
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (visitId) load();
    else setError("No visit ID in URL.");
  }, [visitId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (override) => {
    const text = (override || input).trim();
    if (!text || isTyping) return;
    setInput("");

    setMessages(prev => [...prev, { id: Date.now(), from: "patient", type: "text", time: getTime(), text }]);
    setIsTyping(true);

    try {
      // 🚀 HITTING YOUR FASTAPI BACKEND INSTEAD OF ANTHROPIC!
      const res = await fetch(`${API}/api/chat/aftercare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_id: visitId, message: text })
      });
      
      const data = await res.json();
      
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", type: "text", time: getTime(), text: data.reply }]);
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "hospital", type: "text", time: getTime(), text: "Sorry, I'm having trouble connecting right now. Please call 📞 1800-VITALS." }]);
    }
  };

  const handleEmergency = (note) => {
    setEmergencyDone(true);
    setShowEmergency(false);
    const reception = [
      `🚨 EMERGENCY ALERT`,
      `Patient: ${visit.patients.name}, Age ${visit.patients.age}`,
      `Priority: ${visit.urgency?.toUpperCase()}`,
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

  // ── Render ──
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;
  if (!visit) return <ErrorScreen />;

  const urg = urgencyStyle[visit.urgency] || urgencyStyle.medium;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#0f1923", fontFamily: "'DM Sans', sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes bIn { from{opacity:0;transform:scale(.88) translateY(8px)} to{opacity:1;transform:none} }
        @keyframes critPulse { 0%,100%{box-shadow:0 2px 10px rgba(239,68,68,.3)} 50%{box-shadow:0 2px 24px rgba(239,68,68,.7)} }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px}
        .t-dot{width:7px;height:7px;border-radius:50%;background:#64748b;animation:tdot 1.2s infinite}
        @keyframes tdot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        input::placeholder{color:#475569}
      `}</style>

      {/* Emergency Modal */}
      {showEmergency && (
        <EmergencyModal
          patientName={visit.patients.name}
          onConfirm={handleEmergency}
          onClose={() => setShowEmergency(false)}
        />
      )}

      {/* Header */}
      <div style={{ background: "#0d2137", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem", flexShrink: 0, paddingTop: "max(0.85rem, env(safe-area-inset-top))" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(37,211,102,0.3)" }}>
          <WaIcon size={22} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            VitalsFlow Aftercare
          </div>
          <div style={{ color: "#25d366", fontSize: "0.7rem", marginTop: 1 }}>
            Personal chat for {visit.patients.name} · 🟢 Online
          </div>
        </div>

        {/* Emergency Button */}
        {!emergencyDone ? (
          <button onClick={() => setShowEmergency(true)}
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: 10, padding: "0.45rem 0.9rem", color: "white", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, animation: visit.urgency === "critical" ? "critPulse 2s infinite" : "none", boxShadow: "0 2px 12px rgba(239,68,68,0.4)" }}>
            🚨 <span>EMERGENCY</span>
          </button>
        ) : (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "0.3rem 0.7rem", color: "#ef4444", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>
            ✓ ALERTED
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 0.9rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <span style={{ background: "rgba(255,255,255,0.07)", color: "#64748b", fontSize: "0.67rem", padding: "0.2rem 0.85rem", borderRadius: 20, fontWeight: 500 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>

        {messages.map((msg) => {
          if (msg.type === "summary_card") return <SummaryCard key={msg.id} msg={msg} />;
          if (msg.type === "emergency_confirm") return <EmergencyConfirmBubble key={msg.id} msg={msg} />;
          return <TextBubble key={msg.id} msg={msg} onQuickReply={handleSend} />;
        })}

        {isTyping && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginLeft: "0.25rem" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#25d366,#128c7e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <WaIcon size={13} color="white" />
            </div>
            <div style={{ background: "#1e2d3d", borderRadius: "14px 14px 14px 4px", padding: "0.65rem 0.9rem", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 0.2, 0.4].map((d, i) => <div key={i} className="t-dot" style={{ animationDelay: `${d}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: "#0d1a2a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.8rem 0.9rem", display: "flex", gap: "0.6rem", alignItems: "center", flexShrink: 0, paddingBottom: "max(0.8rem, env(safe-area-inset-bottom))" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your medicines, recovery..."
          disabled={isTyping}
          style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 24, padding: "0.75rem 1.1rem", color: "#f1f5f9", fontSize: "0.9rem", fontFamily: "'DM Sans',sans-serif", outline: "none", transition: "background .2s" }}
          onFocus={e => e.target.style.background = "rgba(255,255,255,0.11)"}
          onBlur={e => e.target.style.background = "rgba(255,255,255,0.07)"}
        />
        <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
          style={{ width: 46, height: 46, borderRadius: "50%", background: input.trim() && !isTyping ? "#25d366" : "#1e2d3d", border: "none", cursor: input.trim() && !isTyping ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s", boxShadow: input.trim() ? "0 2px 12px rgba(37,211,102,0.3)" : "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}