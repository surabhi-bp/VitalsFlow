from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import joblib
import pandas as pd
import json
from twilio.rest import Client as TwilioClient
from dotenv import load_dotenv 
from triage_predict import predict_triage


# Load the secrets from the .env file
load_dotenv() 
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="VitalsFlow API")

# --- UPDATED CORS CONFIGURATION ---
# main.py
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://vitals-flow.vercel.app" # No trailing slash!
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ----------------------------------

# 2. Set up AI Client
# Grab the key securely from the environment
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM = os.getenv("TWILIO_WHATSAPP_FROM")
twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)

client = openai.OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

# 3. Load the trained XGBoost model
try:
    triage_model = joblib.load("xgboost_real_triage.joblib")
except FileNotFoundError:
    triage_model = None

# 4. Define Data Models
class PatientVitals(BaseModel):
    SBP: float
    DBP: float
    HR: float
    RR: float
    BT: float
    Saturation: float

class CustomItem(BaseModel):
    name: str
    item_type: str  # 'test' or 'medication'

# ── PATIENT + VISIT MODELS ─────────────────────────────
class PatientCreate(BaseModel):
    name: str
    age: int
    phone: str = ""

class VisitCreate(BaseModel):
    patient_id: str
    symptoms: str = ""
    sbp: float = 0
    dbp: float = 0
    hr: float = 0
    rr: float = 0
    bt: float = 0
    saturation: float = 0
    urgency: str = "medium"
    doctor_id: str = None

class VisitUpdate(BaseModel):
    status: str = None
    doctor_id: str = None
    urgency: str = None

# 5. The Smart Triage Endpoint (Hybrid AI + Clinical Guardrails)
@app.post("/api/triage")
def evaluate_triage(vitals: PatientVitals):
    if not triage_model:
        return {"status": "error", "message": "Triage model is not loaded."}
    
    # --- CLINICAL GUARDRAIL (Safety Net) ---
    is_perfectly_normal = (
        (90 <= vitals.SBP <= 120) and
        (60 <= vitals.DBP <= 80) and
        (60 <= vitals.HR <= 100) and
        (12 <= vitals.RR <= 20) and
        (36.0 <= vitals.BT <= 37.5) and
        (vitals.Saturation >= 95)
    )
    
    if is_perfectly_normal:
        prediction = 5  # Level 5: Non-Urgent
    else:
        input_data = pd.DataFrame([vitals.model_dump()])
        prediction = int(triage_model.predict(input_data)[0]) + 1
    
    risk_mapping = {
        1: {"status": "Critical / Resuscitation", "action": "Immediate Intervention", "color": "red"},
        2: {"status": "Emergent", "action": "Physician evaluation within 15 min", "color": "orange"},
        3: {"status": "Urgent", "action": "Physician evaluation within 30 min", "color": "yellow"},
        4: {"status": "Less Urgent", "action": "Physician evaluation within 60 min", "color": "green"},
        5: {"status": "Non-Urgent", "action": "Standard Waiting Room", "color": "blue"}
    }
    
    result = risk_mapping.get(prediction, {"status": "Unknown", "action": "Review Manually", "color": "grey"})
    return {"vitals_received": vitals.model_dump(), "triage_alert": result}
    
# 6. The Whisper AI Scribe & Llama 3 Co-Pilot Endpoint
@app.post("/api/scribe")
async def process_audio(file: UploadFile = File(...)):
    print("\n--- NEW SCRIBE REQUEST INITIATED ---")
    try:
        print("Step 1: Saving audio file...")
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        print("Step 2: Sending to Groq Whisper for Translation...")
        with open(temp_file_path, "rb") as audio_file:
            transcript_response = client.audio.translations.create(
                model="whisper-large-v3",
                file=audio_file,
                response_format="text"
            )
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        transcript_text = transcript_response.strip()
        print(f"-> Translation Success! Text: {transcript_text[:50]}...")

        # --- SAFETY CHECK: IF NO AUDIO DETECTED ---
        # Whisper sometimes hallucinates short phrases on silent audio
        noise_words = ["thank you", "subtitles", "amara.org", "you"]
        is_noise = any(noise in transcript_text.lower() for noise in noise_words) and len(transcript_text) < 25

        if len(transcript_text) < 5 or is_noise:
            print("-> Silence or background noise detected. Skipping AI analysis.")
            return {
                "status": "success", 
                "transcript": "[No valid medical audio detected]",
                "clinical_data": {
                    "soap_notes": "Reported Symptoms: Not documented.\nObservations: Not documented.\nClinical Impression: No audio recorded.\nAction Plan: Please try recording the consultation again.",
                    "suggested_tests": [],
                    "suggested_medicines": []
                }
            }

        print("Step 3: Sending to Groq Llama 3 for Clinical Analysis...")
        prompt = f"""
You are a proactive AI Clinical Decision Support System assisting a physician. 
Your goal is to structure the transcript and proactively suggest standard-of-care medications and diagnostic tests for the doctor to review.

══════════════════════════════════════════
STEP 1 — LANGUAGE TRANSLATION (Internal Only)
══════════════════════════════════════════
The transcript may contain English, Kannada, or Kanglish.
Common Kanglish → English mappings:
- tale novtaide / tale novu → headache
- jwara / jvara → fever  
- hotte novvu / hotte novu → stomach pain / abdominal pain
- ede novu → chest pain
- kashi → cough
- vanthi → vomiting
- bathru / bathroom hogbeku → urinary complaint
- kaalu novvu → leg pain
- benga / benga feeling → burning sensation
- kai novvu → hand/arm pain
- maikku → dizziness / giddiness
- shrama → weakness / fatigue
- ulta → nausea

══════════════════════════════════════════
STEP 2 — CLINICAL SUMMARY GENERATION
══════════════════════════════════════════
Generate a structured clinical note with exactly these 4 labeled sections:

Reported Symptoms: What the patient reported.
Observations: Any vitals or physical findings mentioned (or "Not documented").
Clinical Impression: Likely clinical impression based on symptoms.

══════════════════════════════════════════
STEP 3 — PROACTIVE CLINICAL RULES
══════════════════════════════════════════
You MUST provide at least 1 relevant test and 1-2 relevant medications if the patient mentions ANY symptoms.

TESTS to suggest based on symptoms:
- Any general weakness, fever, or pain → Complete Blood Count (CBC)
- Fever > 3 days → Dengue/Malaria Serology, CRP
- Urinary symptoms → Urine Routine
- Chest pain/palpitations → ECG, Lipid Profile
- Stomach pain → Liver Function Test (LFT) or Ultrasound Abdomen
- Joint/Bone pain → X-Ray of affected area, Uric Acid

MEDICINES to suggest based on symptoms:
- Headache / Body ache → Tab. Paracetamol 650mg
- Fever → Tab. Paracetamol 650mg
- Cold / Runny Nose / Allergy → Tab. Cetirizine 10mg
- Stomach pain / Acidity → Tab. Pantoprazole 40mg
- Nausea / Vomiting → Tab. Ondansetron 4mg
- Cough → Syrup Dextromethorphan (10ml)
- Muscle Spasm → Tab. Aceclofenac + Paracetamol
- Suspected bacterial infection (throat/wound) → Tab. Amoxicillin 500mg

DOSAGE TIMING RULES:
- Once daily → morning: true, afternoon: false, night: false
- Twice daily → morning: true, afternoon: false, night: true  
- Thrice daily → morning: true, afternoon: true, night: true
- Antacids/Anti-emetics → "Before Food"; Pain/Fever meds → "After Food"

══════════════════════════════════════════
STEP 4 — OUTPUT FORMAT
══════════════════════════════════════════
Return ONLY this JSON. No markdown. No explanation. No extra keys.

{{
  "soap_notes": "Reported Symptoms: ...\\nObservations: ...\\nClinical Impression: ...",
  "suggested_tests": [
    {{
      "name": "Test name",
      "cost_estimate": "₹XXX"
    }}
  ],
  "suggested_medicines": [
    {{
      "name": "Tab. MedicineName Dose",
      "cost_estimate": "₹XX per tablet",
      "morning": true,
      "afternoon": false,
      "night": true,
      "food": "After Food",
      "duration": "5 days"
    }}
  ]
}}

══════════════════════════════════════════
TRANSCRIPT TO PROCESS:
══════════════════════════════════════════
{transcript_text}
"""

        llm_response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,  # Increased slightly to allow more proactive suggestions
            response_format={"type": "json_object"}
        )

        print("Step 4: Parsing AI JSON Response...")
        clinical_data = json.loads(llm_response.choices[0].message.content)
        
        print("-> Pipeline Complete! Sending to Frontend.")
        return {
            "status": "success", 
            "transcript": transcript_text,
            "clinical_data": clinical_data
        }

    except Exception as e:
        print(f"\n!!! ERROR OCCURRED !!!\n{str(e)}")
        return {"status": "error", "message": str(e)}

# 7. Real-Time Price Predictor Endpoint
@app.post("/api/estimate")
def estimate_price(item: CustomItem):
    if not client:
        return {"status": "error", "cost": "₹TBD"}
        
    try:
        print(f"Estimating cost for: {item.name}")
        prompt = f"""
        Estimate the average cost in INR (₹) PER SINGLE TABLET or PER TEST for this medical {item.item_type}: '{item.name}'.
        Reply ONLY with a valid JSON object in this exact format: {{"cost": "₹XXX"}}
        Do not add any explanations or markdown.
        """
        
        llm_response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(llm_response.choices[0].message.content)
        cost = data.get("cost", "₹TBD")
        
        if item.item_type == "medication":
            return {
                "status": "success", 
                "cost": cost,
                "morning": False, "afternoon": False, "night": False,
                "food": "After Food", "duration": ""
            }
        else:
            return {"status": "success", "cost": cost}
        
    except Exception as e:
        print(f"Price Predictor Error: {e}")
        return {"status": "error", "cost": "₹TBD"}

# ── PATIENTS ──────────────────────────────────────────────────
@app.post("/api/patients")
def create_patient(patient: PatientCreate):
    result = supabase.table("patients").insert(patient.model_dump()).execute()
    return result.data[0]

@app.get("/api/patients")
def get_patients():
    result = supabase.table("patients").select("*").order("created_at", desc=True).execute()
    return result.data

# ── DOCTORS ───────────────────────────────────────────────────
@app.get("/api/doctors")
def get_doctors():
    result = supabase.table("users").select("*").eq("role", "doctor").execute()
    return result.data

# ── VISITS ────────────────────────────────────────────────────
@app.post("/api/visits")
def create_visit(visit: VisitCreate):
    data = visit.model_dump()
    data = {k: v for k, v in data.items() if v is not None}
    result = supabase.table("visits").insert(data).execute()
    return result.data[0]

@app.get("/api/visits")
def get_visits():
    result = supabase.table("visits").select(
        "*, patients(*), consultation_notes(*), prescriptions(*)"
    ).order("created_at", desc=True).execute()
    return result.data

@app.get("/api/visits/waiting")
def get_waiting_visits():
    result = supabase.table("visits").select(
        "*, patients(name, age, phone)"
    ).eq("status", "waiting").order("created_at").execute()
    return result.data

@app.get("/api/visits/doctor/{doctor_id}")
def get_doctor_visits(doctor_id: str):
    result = supabase.table("visits").select(
        "*, patients(name, age, phone)"
    ).eq("doctor_id", doctor_id).in_("status", ["waiting", "in_consultation"]).execute()
    return result.data

@app.patch("/api/bills/{bill_id}/pay")
def mark_bill_paid(bill_id: str):
    from datetime import datetime, timezone

    # Mark bill paid
    result = supabase.table("bills").update({
        "status": "paid",
        "paid_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bill_id).execute()

    visit_id = result.data[0]["visit_id"]

    # Update visit status
    supabase.table("visits").update({
        "status": "paid"
    }).eq("id", visit_id).execute()

    # Fetch full visit data
    visit = supabase.table("visits").select(
        "*, patients(*), consultation_notes(*), prescriptions(*)"
    ).eq("id", visit_id).execute().data[0]

    patient = visit["patients"]
    phone = patient.get("phone", "")
    name = patient.get("name", "Patient")

    # Extract medicines
    items = visit["prescriptions"][0]["items"] if visit.get("prescriptions") else []
    meds = [i for i in items if i["type"] == "medication"]

    med_lines = ""
    for m in meds:
        timing = []
        if m.get("morning"): timing.append("Morning")
        if m.get("afternoon"): timing.append("Afternoon")
        if m.get("night"): timing.append("Night")

        med_lines += f"\n• {m['name']} — {', '.join(timing)}, {m.get('food','After Food')}, {m.get('duration','as prescribed')}"

    message = f"""
🏥 Hello {name}!

Your consultation is complete and payment has been received.

💊 Medicines:
{med_lines}

Please reply YES once you take your medicines today.

— VitalsFlow Care Team
"""

    if phone:
        try:
            twilio_client.messages.create(
                from_=TWILIO_FROM,
                to=f"whatsapp:+91{phone}",
                body=message
            )
            print("WhatsApp message sent")
        except Exception as e:
            print(f"Twilio Error: {e}")

    return {"status": "success"}

# ── CONSULTATION SAVE ──────────────────────────────────────────
from typing import Dict, List, Any

class ConsultationSave(BaseModel):
    visit_id: str
    transcript: str = ""
    soap_notes: str = ""
    clinical_data: Dict[str, Any] = {}
    items: List[Any] = []
    total_cost: int = 0

@app.post("/api/consultation/save")
def save_consultation(data: ConsultationSave):
    try:
        print(f"\n--- SAVING CONSULTATION FOR VISIT: {data.visit_id} ---")

        # Step 1: Save consultation notes
        print("Step 1: Saving notes to 'consultation_notes' table...")
        notes = supabase.table("consultation_notes").insert({
            "visit_id": data.visit_id,
            "transcript": data.transcript,
            "soap_notes": data.soap_notes,
            "clinical_data": data.clinical_data
        }).execute()

        # Step 2: Save prescription items
        print("Step 2: Saving items to 'prescriptions' table...")
        prescription = supabase.table("prescriptions").insert({
            "visit_id": data.visit_id,
            "items": data.items,
            "total_cost": data.total_cost
        }).execute()

        prescription_id = prescription.data[0]["id"]

        # Step 3: Create bill
        print("Step 3: Creating bill in 'bills' table...")
        supabase.table("bills").insert({
            "visit_id": data.visit_id,
            "prescription_id": prescription_id,
            "total_amount": data.total_cost,
            "status": "pending"
        }).execute()

        # Step 4: Update visit status
        print("Step 4: Updating 'visits' table status...")
        supabase.table("visits").update({
            "status": "completed"
        }).eq("id", data.visit_id).execute()

        print("--- SAVE COMPLETE ---")

        return {"status": "success", "prescription_id": prescription_id}

    except Exception as e:
        print(f"\n❌ DATABASE ERROR: {str(e)}\n")
        return {"status": "error", "message": str(e)}

# ── BILLING ───────────────────────────────────────────────────
@app.get("/api/bills")
def get_bills():
    result = supabase.table("bills").select(
        "*, visits(*, patients(name, age, phone))"
    ).order("created_at", desc=True).execute()
    return result.data

@app.patch("/api/bills/{bill_id}/pay")
def mark_bill_paid(bill_id: str):
    from datetime import datetime, timezone

    result = supabase.table("bills").update({
        "status": "paid",
        "paid_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", bill_id).execute()

    supabase.table("visits").update({
        "status": "paid"
    }).eq("id", result.data[0]["visit_id"]).execute()

    return {"status": "success"}

# ── AFTERCARE CHAT SYSTEM ──────────────────────────────────────

@app.get("/api/visits/{visit_id}")
def get_single_visit(visit_id: str):
    """Fetches all data for a specific visit to load into the patient's chat app."""
    try:
        result = supabase.table("visits").select(
            "*, patients(*), consultation_notes(*), prescriptions(*), bills(*)"
        ).eq("id", visit_id).execute()
        
        if not result.data:
            return {"status": "error", "message": "Visit not found"}
            
        return {"status": "success", "data": result.data[0]}
    except Exception as e:
        return {"status": "error", "message": str(e)}


class ChatMessage(BaseModel):
    visit_id: str
    message: str

@app.post("/api/chat/aftercare")
def process_aftercare_chat(req: ChatMessage):
    """Powered by Groq Llama 3 - acts as the patient's personal AI nurse."""
    try:
        # 1. Fetch the patient's specific medical context
        visit_data = supabase.table("visits").select(
            "*, patients(*), consultation_notes(*), prescriptions(*)"
        ).eq("id", req.visit_id).execute().data[0]
        
        patient_name = visit_data["patients"]["name"]
        notes = visit_data["consultation_notes"][0]["soap_notes"] if visit_data.get("consultation_notes") else "No notes available."
        
        # 2. Build the strict AI System Prompt
        system_prompt = f"""
        You are an empathetic, professional AI medical assistant for VitalsFlow Hospital.
        You are talking to a patient named {patient_name}.
        
        Here is their medical record from their visit today:
        {notes}
        
        RULES:
        1. Answer the patient's question based ONLY on the medical record provided.
        2. Keep your answers short, warm, and easy to read (WhatsApp style).
        3. Do NOT diagnose new symptoms. If they report severe pain or emergencies, tell them to immediately click the "Emergency Alert" button at the top of their screen or go to the ER.
        4. If they ask in Hindi, Kannada, or Kanglish, reply warmly in English or the requested language.
        """
        
        # 3. Call Groq
        llm_response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message}
            ],
            temperature=0.3,
            max_tokens=150
        )
        
        ai_reply = llm_response.choices[0].message.content
        return {"status": "success", "reply": ai_reply}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"status": "error", "reply": "I'm having trouble connecting to my servers right now. Please call the clinic directly if it's urgent."}
from fastapi import Form

@app.post("/api/whatsapp/reply")
async def whatsapp_reply(
    From: str = Form(...),
    Body: str = Form(...)
):
    phone = From.replace("whatsapp:", "").strip()

    # Remove country code
    if phone.startswith("+91"):
        phone = phone[3:]
    elif phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]

    # Always match last 10 digits
    phone = phone[-10:]

    print(f"Looking for phone: {phone}")
    message = Body.lower()

    patient = supabase.table("patients").select("*").eq("phone", phone).execute().data

    if not patient:
        return {"status": "not found"}

    visit = supabase.table("visits").select(
        "*, patients(*), consultation_notes(*), prescriptions(*)"
    ).eq("patient_id", patient[0]["id"]).order("created_at", desc=True).limit(1).execute().data

    if not visit:
        return {"status": "no visit"}

    visit = visit[0]
    name = visit["patients"]["name"]

    items = visit["prescriptions"][0]["items"] if visit.get("prescriptions") else []
    meds = [i["name"] for i in items if i["type"] == "medication"]

    med_list = ", ".join(meds)

    prompt = f"""
You are a friendly nurse at VitalsFlow hospital.

Patient name: {name}
Medicines prescribed: {med_list}

Patient message: "{Body}"

If they said YES → praise them and ask about symptoms.
If they said NO → remind them to take medicine.
If symptoms worsen → suggest doctor visit.

Keep reply short (WhatsApp style).
End message with:
— VitalsFlow Care Team 💙
"""

    llm = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=150
    )

    reply = llm.choices[0].message.content

    twilio_client.messages.create(
        from_=TWILIO_FROM,
        to=From,
        body=reply
    )

    return {"status": "ok"}

