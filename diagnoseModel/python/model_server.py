from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import os
import math
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.1-8b-instant"   

USE_AI = GROQ_API_KEY 


CONDITION_TO_SPECIALTY = {
    "pancreatitis": "gastroenterologist", "gastroenteritis": "gastroenterologist",
    "stomach": "gastroenterologist", "digestive": "gastroenterologist",
    "liver": "gastroenterologist", "gallbladder": "gastroenterologist",
    "intestine": "gastroenterologist", "ibs": "gastroenterologist",
    "crohn": "gastroenterologist", "ulcer": "gastroenterologist",
    "nausea": "gastroenterologist", "vomiting": "gastroenterologist",
    "diarrhea": "gastroenterologist", "abdominal": "gastroenterologist",

    "heart": "cardiologist", "cardiac": "cardiologist",
    "chest pain": "cardiologist", "hypertension": "cardiologist",
    "blood pressure": "cardiologist", "palpitation": "cardiologist",

    "asthma": "pulmonologist", "breathing": "pulmonologist", "lung": "pulmonologist",
    "respiratory": "pulmonologist", "pneumonia": "pulmonologist",
    "bronchitis": "pulmonologist", "cough": "pulmonologist",

    "migraine": "neurologist", "seizure": "neurologist", "stroke": "neurologist",
    "parkinson": "neurologist", "epilepsy": "neurologist",
    "nerve": "neurologist", "headache": "neurologist",

    "bone": "orthopedist", "fracture": "orthopedist", "joint": "orthopedist",
    "arthritis": "orthopedist", "back pain": "orthopedist",
    "sprain": "orthopedist", "body pain": "orthopedist", "body ache": "orthopedist",

    "skin": "dermatologist", "rash": "dermatologist", "acne": "dermatologist",
    "eczema": "dermatologist", "psoriasis": "dermatologist", "itching": "dermatologist",

    "kidney": "nephrologist", "uti": "urologist",
    "urinary": "urologist", "bladder": "urologist",

    "diabetes": "endocrinologist", "thyroid": "endocrinologist",
    "hormone": "endocrinologist",

    "ear": "ent-specialist", "nose": "ent-specialist", "throat": "ent-specialist",
    "sinus": "ent-specialist", "tonsil": "ent-specialist", "sore throat": "ent-specialist",

    "eye": "ophthalmologist", "vision": "ophthalmologist", "cataract": "ophthalmologist",

    "pregnancy": "gynecologist", "menstrual": "gynecologist", "pcos": "gynecologist",

    "child": "pediatrician", "infant": "pediatrician", "baby": "pediatrician",

    "fever": "general-physician", "fatigue": "general-physician",
    "tired": "general-physician", "weakness": "general-physician",
    "cold": "general-physician",
}


def detect_specialty(condition: str, symptoms: str) -> str:
    combined = f"{condition} {symptoms}".lower()
    for keyword, specialty in CONDITION_TO_SPECIALTY.items():
        if keyword in combined:
            print(f"🎯 Specialty detected: {specialty} (keyword: {keyword})")
            return specialty
    print("🎯 Defaulting to general-physician")
    return "general-physician"


def get_hospital_type_for_condition(condition: str, symptoms: str) -> str:
    combined = f"{condition} {symptoms}".lower()
    emergency_keywords = [
        "emergency", "heart attack", "stroke", "severe", "critical",
        "bleeding", "unconscious", "chest pain",
    ]
    if any(kw in combined for kw in emergency_keywords):
        return "emergency"
    if "cancer" in combined or "oncology" in combined:
        return "cancer_center"
    if "surgery" in combined or "operation" in combined:
        return "surgical"
    return "general"



def calculate_distance(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def format_address(tags: dict, city: str = "") -> str:
    parts = []
    for key in ["addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:postcode"]:
        if tags.get(key):
            parts.append(tags[key])
    if not parts and city:
        parts.append(city)
    return ", ".join(parts) if parts else tags.get("addr:full", "Not Available")


def _extract_coords(element: dict):
    """Return (lat, lon) from an OSM element or None."""
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]
    if "center" in element:
        return element["center"]["lat"], element["center"]["lon"]
    return None


def get_city_from_coordinates(lat: float, lon: float) -> str:
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json", "zoom": 10},
            headers={"User-Agent": "MedicalAssistantApp/2.0"},
            timeout=10,
        )
        addr = resp.json().get("address", {})
        city = (addr.get("city") or addr.get("town") or addr.get("village")
                or addr.get("county") or addr.get("state_district") or "Unknown Location")
        print(f"📍 Location resolved: {city}")
        return city
    except Exception as e:
        print(f"⚠️ Reverse geocoding error: {e}")
        return "Unknown Location"



OSM_URL = "https://overpass-api.de/api/interpreter"
OSM_TIMEOUT = 15

EXCLUDE_KEYWORDS = [
    "nursing home", "old age", "care home", "retirement",
    "hospice", "maternity", "blood bank", "laboratory",
    "diagnostic", "pharmacy", "medical store",
]


def _osm_post(query: str) -> dict | None:
    try:
        headers = {"User-Agent": "MedicalAssistantApp/2.0"}
        resp = requests.post(OSM_URL, data={"data": query}, headers=headers, timeout=OSM_TIMEOUT)
        if resp.status_code == 200:
            return resp.json()
        print(f"⚠️ OSM returned {resp.status_code}")
    except Exception as e:
        print(f"⚠️ OSM request error: {e}")
    return None


def search_osm_doctors_progressive(lat, lon, specialty, city) -> list:
    specialty_clean = specialty.replace("-", " ").lower()
    radius = 15_000
    print(f"🔍 Searching doctors within {radius/1000:.0f} km …")

    query = f"""
    [out:json][timeout:{OSM_TIMEOUT}];
    (
      node["amenity"="doctors"](around:{radius},{lat},{lon});
      way["amenity"="doctors"](around:{radius},{lat},{lon});
      node["amenity"="clinic"](around:{radius},{lat},{lon});
      way["amenity"="clinic"](around:{radius},{lat},{lon});
      node["healthcare"="doctor"](around:{radius},{lat},{lon});
      way["healthcare"="doctor"](around:{radius},{lat},{lon});
      node["healthcare"="clinic"](around:{radius},{lat},{lon});
      way["healthcare"="clinic"](around:{radius},{lat},{lon});
      node["amenity"="hospital"]["emergency"!="yes"](around:{radius},{lat},{lon});
      way["amenity"="hospital"]["emergency"!="yes"](around:{radius},{lat},{lon});
    );
    out body center tags 100;
    """

    data = _osm_post(query)
    if data:
        doctors = _process_doctors(data, lat, lon, specialty_clean, city)
        if doctors:
            print(f"✅ Found {len(doctors)} healthcare facilities")
            return doctors[:10]

    print("❌ No doctors found")
    return []


def _process_doctors(data, user_lat, user_lon, specialty, city) -> list:
    doctors = []
    seen: set[str] = set()

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name or name.lower() in seen:
            continue
        if any(kw in name.lower() for kw in EXCLUDE_KEYWORDS):
            continue

        coords = _extract_coords(el)
        if coords is None:
            continue
        elem_lat, elem_lon = coords

        dist = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        amenity    = tags.get("amenity", "")
        healthcare = tags.get("healthcare", "")
        hc_spec    = tags.get("healthcare:speciality", specialty).title()

        if amenity == "hospital":
            ftype = "Hospital"
        elif amenity == "doctors" or healthcare == "doctor":
            ftype = "Doctor"
        else:
            ftype = "Clinic"

        doctors.append({
            "name": name,
            "specialty": hc_spec,
            "experience": "Not Available",
            "location": format_address(tags, city),
            "qualifications": "Healthcare Provider",
            "phone": tags.get("phone") or tags.get("contact:phone") or "Not Available",
            "type": "doctor",
            "distance": f"{dist:.1f} km",
            "facility_type": ftype,
            "coordinates": {"lat": elem_lat, "lon": elem_lon},
        })
        seen.add(name.lower())

    return sorted(doctors, key=lambda x: float(x["distance"].split()[0]))


def search_hospitals_progressive(lat, lon, hospital_type="general") -> list:
    radius = 20_000
    print(f"🏥 Searching hospitals within {radius/1000:.0f} km …")

    query = f"""
    [out:json][timeout:{OSM_TIMEOUT}];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lon});
      way["amenity"="hospital"](around:{radius},{lat},{lon});
      relation["amenity"="hospital"](around:{radius},{lat},{lon});
    );
    out body center tags 50;
    """

    data = _osm_post(query)
    if data:
        hospitals = _process_hospitals(data, lat, lon, hospital_type)
        if hospitals:
            print(f"✅ Found {len(hospitals)} hospitals")
            return hospitals[:10]
    return []


def _process_hospitals(data, user_lat, user_lon, hospital_type) -> list:
    hospitals = []
    seen: set[str] = set()

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name or name.lower() in seen:
            continue

        coords = _extract_coords(el)
        if coords is None:
            continue
        elem_lat, elem_lon = coords

        # Filter for emergency hospitals only when required
        if hospital_type == "emergency" and tags.get("emergency") != "yes":
            continue

        dist = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        hospitals.append({
            "name": name,
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("contact:phone") or "Not Available",
            "distance": f"{dist:.1f} km",
            "emergency": tags.get("emergency", "no"),
            "coordinates": {"lat": elem_lat, "lon": elem_lon},
        })
        seen.add(name.lower())

    return sorted(hospitals, key=lambda x: float(x["distance"].split()[0]))


def search_pharmacies_progressive(lat, lon) -> list:
    for radius in [2_000, 5_000, 10_000, 20_000]:
        print(f"💊 Searching pharmacies within {radius/1000:.0f} km …")
        query = f"""
        [out:json][timeout:20];
        (
          node["amenity"="pharmacy"](around:{radius},{lat},{lon});
          way["amenity"="pharmacy"](around:{radius},{lat},{lon});
          node["shop"="chemist"](around:{radius},{lat},{lon});
          way["shop"="chemist"](around:{radius},{lat},{lon});
        );
        out body center tags 30;
        """
        data = _osm_post(query)
        if data:
            pharmacies = _process_pharmacies(data, lat, lon)
            if len(pharmacies) >= 3:
                print(f"✅ Found {len(pharmacies)} pharmacies")
                return pharmacies[:8]
    return []


def _process_pharmacies(data, user_lat, user_lon) -> list:
    pharmacies = []
    seen: set[str] = set()

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name or name.lower() in seen:
            continue

        coords = _extract_coords(el)
        if coords is None:
            continue
        elem_lat, elem_lon = coords

        dist = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        pharmacies.append({
            "name": name,
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("contact:phone") or "Not Available",
            "distance": f"{dist:.1f} km",
            "coordinates": {"lat": elem_lat, "lon": elem_lon},
        })
        seen.add(name.lower())

    return sorted(pharmacies, key=lambda x: float(x["distance"].split()[0]))


def search_ambulance_progressive(lat, lon) -> list:
    for radius in [10_000, 20_000, 30_000]:
        print(f"🚑 Searching ambulances within {radius/1000:.0f} km …")
        query = f"""
        [out:json][timeout:20];
        (
          node["amenity"="ambulance_station"](around:{radius},{lat},{lon});
          way["amenity"="ambulance_station"](around:{radius},{lat},{lon});
          node["emergency"="ambulance_station"](around:{radius},{lat},{lon});
          way["emergency"="ambulance_station"](around:{radius},{lat},{lon});
          node["amenity"="hospital"]["emergency"="yes"](around:{radius},{lat},{lon});
          way["amenity"="hospital"]["emergency"="yes"](around:{radius},{lat},{lon});
        );
        out body center tags 20;
        """
        data = _osm_post(query)
        if data:
            ambulances = _process_ambulances(data, lat, lon)
            if len(ambulances) >= 2:
                print(f"✅ Found {len(ambulances)} ambulance services")
                return ambulances[:5]
    return []


def _process_ambulances(data, user_lat, user_lon) -> list:
    services = []
    seen: set[str] = set()

    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name", "Ambulance Service")
        if name.lower() in seen:
            continue

        coords = _extract_coords(el)
        if coords is None:
            continue
        elem_lat, elem_lon = coords

        dist = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        services.append({
            "name": name,
            "address": format_address(tags),
            "phone": (tags.get("phone") or tags.get("emergency:phone")
                      or tags.get("contact:phone") or "108 (Emergency)"),
            "distance": f"{dist:.1f} km",
            "coordinates": {"lat": elem_lat, "lon": elem_lon},
        })
        seen.add(name.lower())

    return sorted(services, key=lambda x: float(x["distance"].split()[0]))


# ─────────────────────────────────────────────
# AI Diagnosis  (Groq — free tier)
# ─────────────────────────────────────────────
def get_ai_diagnosis(symptoms: str) -> str:
    """
    Call Groq's free API (llama3-8b-8192).
    Get a free key at https://console.groq.com → API Keys.
    """
    if not USE_AI:
        raise RuntimeError("AI disabled: set GROQ_API_KEY env variable")

    system_prompt = (
        "You are a professional medical assistant. "
        "Analyze the patient's symptoms and respond ONLY in this exact plain-text format "
        "(no markdown, no asterisks, no bullet points, no extra text):\n\n"
        "Condition: <likely condition>\n"
        "Severity: <low|moderate|high>\n"
        "Advice: <brief care instructions and home remedies>\n"
        "Warning: <when to see a doctor or seek emergency care>"
    )

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Symptoms: {symptoms}"},
        ],
        "max_tokens": 300,
        "temperature": 0.2,
    }

    print("🤖 Querying Groq (llama3-8b-8192) …")
    resp = requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=20,
    )

    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text}")

    text = resp.json()["choices"][0]["message"]["content"].strip()
    if not text:
        raise RuntimeError("Empty response from Groq")

    print("✅ AI response received")
    return text


# ─────────────────────────────────────────────
# Rule-based fallback
# ─────────────────────────────────────────────
def analyze_symptoms_fallback(symptoms: str) -> dict:
    s = symptoms.lower()

    if any(w in s for w in ["chest pain", "heart attack", "stroke",
                             "bleeding heavily", "can't breathe",
                             "severe bleeding", "unconscious"]):
        return {
            "condition": "Emergency Medical Situation",
            "severity": "high",
            "advice": "Call emergency services immediately. Do not drive yourself. Keep calm and stay still.",
            "doctor_note": "Seek immediate emergency care. Call 108 or visit ER now.",
        }

    if any(w in s for w in ["high fever", "persistent vomiting", "severe pain",
                             "difficulty breathing", "severe headache"]):
        return {
            "condition": "Acute Illness Requiring Medical Attention",
            "severity": "high",
            "advice": "Rest immediately. Stay hydrated. Avoid solid foods if vomiting.",
            "doctor_note": "See a doctor today or visit urgent care within 4-6 hours.",
        }

    if any(w in s for w in ["fever", "temperature", "chills"]):
        return {
            "condition": "Possible Fever or Viral Infection",
            "severity": "moderate",
            "advice": "Drink plenty of fluids. Rest. Use cool compress. Monitor temperature every 4 hours.",
            "doctor_note": "See a doctor if fever exceeds 39.4°C or lasts beyond 3 days.",
        }

    if any(w in s for w in ["stomach", "nausea", "vomiting", "diarrhea", "upset stomach"]):
        return {
            "condition": "Gastroenteritis or Digestive Issue",
            "severity": "moderate",
            "advice": "Hydrate with ORS. Eat bland foods (rice, banana). Avoid spicy/oily food. Rest.",
            "doctor_note": "See a doctor if symptoms persist >48 hours or blood is present.",
        }

    if any(w in s for w in ["cough", "cold", "sore throat", "runny nose", "congestion"]):
        return {
            "condition": "Upper Respiratory Infection or Common Cold",
            "severity": "low",
            "advice": "Drink warm liquids. Rest. Steam inhalation helps. Stay warm.",
            "doctor_note": "See a doctor if symptoms worsen after 5-7 days or breathing becomes difficult.",
        }

    if any(w in s for w in ["headache", "head pain", "migraine"]):
        return {
            "condition": "Headache or Tension-type Pain",
            "severity": "low",
            "advice": "Rest in a dark, quiet room. Stay hydrated. Cool compress on forehead.",
            "doctor_note": "See a doctor if severe, persistent, or with vision changes.",
        }

    if any(w in s for w in ["tired", "fatigue", "body pain", "weakness", "body ache"]):
        return {
            "condition": "General Fatigue or Body Ache",
            "severity": "low",
            "advice": "Get rest. Stay hydrated. Eat nutritious meals. Light stretching may help.",
            "doctor_note": "See a doctor if fatigue persists for more than 2 weeks.",
        }

    return {
        "condition": "General Health Concern",
        "severity": "low",
        "advice": "Monitor your symptoms. Stay hydrated. Get adequate rest.",
        "doctor_note": "See a doctor if symptoms persist or worsen.",
    }


# ─────────────────────────────────────────────
# Parse AI text into structured fields
# ─────────────────────────────────────────────
def parse_ai_response(text: str) -> dict:
    # Strip markdown noise
    cleaned = re.sub(r"[*#`]", "", text).strip()

    condition_m = re.search(r"Condition:\s*(.+)", cleaned, re.IGNORECASE)
    severity_m  = re.search(r"Severity:\s*(low|moderate|high)", cleaned, re.IGNORECASE)
    advice_m    = re.search(r"Advice:\s*(.+?)(?:\nWarning:|\Z)", cleaned, re.IGNORECASE | re.DOTALL)
    warning_m   = re.search(r"Warning:\s*(.+)", cleaned, re.IGNORECASE | re.DOTALL)

    if not (condition_m and severity_m and advice_m):
        raise ValueError(f"Could not parse AI response: {cleaned[:200]}")

    return {
        "condition":   condition_m.group(1).strip(),
        "severity":    severity_m.group(1).strip().lower(),
        "advice":      advice_m.group(1).strip(),
        "doctor_note": warning_m.group(1).strip() if warning_m else "Consult a doctor if symptoms persist.",
    }


# ─────────────────────────────────────────────
# Main endpoint
# ─────────────────────────────────────────────
@app.post("/api/diagnose")
async def diagnose(request: Request):
    data    = await request.json()
    symptoms = data.get("symptoms", "").strip()
    lat      = data.get("latitude")
    lon      = data.get("longitude")

    if not symptoms:
        return {"error": "Please describe your symptoms."}

    # ── Diagnosis ──
    condition = severity = advice = doctor_note = None
    city = "Unknown"

    try:
        raw = get_ai_diagnosis(symptoms)
        parsed = parse_ai_response(raw)
        condition   = parsed["condition"]
        severity    = parsed["severity"]
        advice      = parsed["advice"]
        doctor_note = parsed["doctor_note"]
        print("✅ AI diagnosis used")
    except Exception as e:
        print(f"⚠️ AI failed ({e}), using rule-based fallback")
        fb          = analyze_symptoms_fallback(symptoms)
        condition   = fb["condition"]
        severity    = fb["severity"]
        advice      = fb["advice"]
        doctor_note = fb["doctor_note"]
        print("✅ Rule-based diagnosis used")

    specialty     = detect_specialty(condition, symptoms)
    hospital_type = get_hospital_type_for_condition(condition, symptoms)

    print(f"📋 Condition: {condition} | Severity: {severity} | Specialty: {specialty}")

    suggestion = (
        f"You likely have {condition} ({severity} severity). "
        f"{advice} {doctor_note}"
    )

    # ── Nearby services ──
    nearby: dict = {}

    if lat is not None and lon is not None:
        city = get_city_from_coordinates(lat, lon)

        if severity == "high":
            print("🚨 HIGH — searching all emergency services …")
            nearby["doctors"]            = search_osm_doctors_progressive(lat, lon, specialty, city)
            nearby["hospitals"]          = search_hospitals_progressive(lat, lon, hospital_type)
            nearby["ambulance_services"] = search_ambulance_progressive(lat, lon)
            nearby["pharmacies"]         = search_pharmacies_progressive(lat, lon)

        elif severity == "moderate":
            print("⚠️ MODERATE — searching doctors, hospitals, pharmacies …")
            nearby["doctors"]   = search_osm_doctors_progressive(lat, lon, specialty, city)
            nearby["hospitals"] = search_hospitals_progressive(lat, lon, hospital_type)
            nearby["pharmacies"] = search_pharmacies_progressive(lat, lon)

        else:
            print("✅ LOW — searching doctors and pharmacies …")
            nearby["doctors"]    = search_osm_doctors_progressive(lat, lon, specialty, city)
            nearby["pharmacies"] = search_pharmacies_progressive(lat, lon)

        # Remove empty lists
        nearby = {k: v for k, v in nearby.items() if v}

    return {
        "suggestion": suggestion,
        "severity":   severity,
        "specialty":  specialty,
        "condition":  condition,
        "city":       city,
        "nearby":     nearby,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=5000)