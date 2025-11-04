from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import os
from typing import List, Dict
import math
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Configuration with new Inference Client
print("🚀 AI Medical Reasoning with Hugging Face Inference Client")
HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN", "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")

# Use the new serverless inference API
USE_AI = True  # Set to False to use only rule-based system
INFERENCE_API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-base"
headers = {"Authorization": f"Bearer {HUGGINGFACE_TOKEN}"} if HUGGINGFACE_TOKEN else {}

# Rest of your specialty mapping code remains the same
CONDITION_TO_SPECIALTY = {
    "pancreatitis": "gastroenterologist", "gastroenteritis": "gastroenterologist",
    "stomach": "gastroenterologist", "digestive": "gastroenterologist",
    "liver": "gastroenterologist", "gallbladder": "gastroenterologist",
    "intestine": "gastroenterologist", "ibs": "gastroenterologist",
    "crohn": "gastroenterologist", "ulcer": "gastroenterologist",
    "nausea": "gastroenterologist", "vomiting": "gastroenterologist",
    "diarrhea": "gastroenterologist", "abdominal": "gastroenterologist",
    
    "heart": "cardiologist", "cardiac": "cardiologist", "chest pain": "cardiologist",
    "hypertension": "cardiologist", "blood pressure": "cardiologist",
    "palpitation": "cardiologist",
    
    "asthma": "pulmonologist", "breathing": "pulmonologist", "lung": "pulmonologist",
    "respiratory": "pulmonologist", "pneumonia": "pulmonologist",
    "bronchitis": "pulmonologist", "cough": "pulmonologist",
    
    "migraine": "neurologist", "seizure": "neurologist", "stroke": "neurologist",
    "parkinson": "neurologist", "epilepsy": "neurologist", "nerve": "neurologist",
    "headache": "neurologist",
    
    "bone": "orthopedist", "fracture": "orthopedist", "joint": "orthopedist",
    "arthritis": "orthopedist", "back pain": "orthopedist", "sprain": "orthopedist",
    "body pain": "orthopedist", "body ache": "orthopedist",
    
    "skin": "dermatologist", "rash": "dermatologist", "acne": "dermatologist",
    "eczema": "dermatologist", "psoriasis": "dermatologist", "itching": "dermatologist",
    
    "kidney": "nephrologist", "uti": "urologist", "urinary": "urologist",
    "bladder": "urologist",
    
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

def detect_specialty(condition, symptoms):
    combined_text = f"{condition} {symptoms}".lower()
    for keyword, specialty in CONDITION_TO_SPECIALTY.items():
        if keyword in combined_text:
            print(f"🎯 Detected specialty: {specialty} (keyword: {keyword})")
            return specialty
    print(f"🎯 Using default: general-physician")
    return "general-physician"

def get_hospital_type_for_condition(condition, symptoms):
    combined = f"{condition} {symptoms}".lower()
    emergency_keywords = ["emergency", "heart attack", "stroke", "severe", "critical", 
                         "bleeding", "unconscious", "chest pain"]
    if any(kw in combined for kw in emergency_keywords):
        return "emergency"
    if "cancer" in combined or "oncology" in combined:
        return "cancer_center"
    if "surgery" in combined or "operation" in combined:
        return "surgical"
    return "general"

# [Previous helper functions remain the same - copying from your code]
def search_osm_doctors_progressive(lat, lon, specialty, city):
    specialty_clean = specialty.replace("-", " ").lower()
    radii = [1000, 5000, 10000, 20000, 30000]
    
    for radius in radii:
        print(f"🔍 Searching doctors in {radius/1000}km radius...")
        query = f"""
        [out:json][timeout:25];
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
        
        try:
            url = "https://overpass-api.de/api/interpreter"
            response = requests.post(url, data={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                doctors = process_osm_healthcare_data(data, lat, lon, specialty_clean, city)
                
                if doctors and len(doctors) >= 3:
                    print(f"✅ Found {len(doctors)} healthcare facilities in {radius/1000}km")
                    return doctors[:10]
        
        except Exception as e:
            print(f"⚠️ OSM search error at {radius/1000}km: {e}")
            continue
    
    print(f"❌ No doctors found in 30km radius")
    return None

def process_osm_healthcare_data(data, user_lat, user_lon, specialty, city):
    doctors = []
    seen = set()
    exclude_keywords = [
        "nursing home", "old age", "care home", "retirement", 
        "hospice", "maternity", "blood bank", "laboratory",
        "diagnostic", "pharmacy", "medical store"
    ]
    
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", "").strip()
        
        if not name or name.lower() in seen:
            continue
        
        name_lower = name.lower()
        if any(excl in name_lower for excl in exclude_keywords):
            continue
        
        if "lat" in element and "lon" in element:
            elem_lat, elem_lon = element["lat"], element["lon"]
        elif "center" in element:
            elem_lat, elem_lon = element["center"]["lat"], element["center"]["lon"]
        else:
            continue
        
        distance = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        
        amenity = tags.get("amenity", "")
        healthcare = tags.get("healthcare", "")
        healthcare_specialty = tags.get("healthcare:speciality", specialty).title()
        
        facility_type = "Clinic"
        if amenity == "hospital":
            facility_type = "Hospital"
        elif amenity == "doctors" or healthcare == "doctor":
            facility_type = "Doctor"
        
        phone = tags.get("phone") or tags.get("contact:phone") or "Not Available"
        address = format_address(tags, city)
        
        doctors.append({
            "name": name,
            "specialty": healthcare_specialty,
            "experience": "Not Available",
            "location": address,
            "qualifications": "Healthcare Provider",
            "phone": phone,
            "type": "doctor",
            "distance": f"{distance:.1f} km",
            "facility_type": facility_type,
            "coordinates": {"lat": elem_lat, "lon": elem_lon}
        })
        
        seen.add(name.lower())
    
    return sorted(doctors, key=lambda x: float(x["distance"].split()[0]))

def search_hospitals_progressive(lat, lon, hospital_type="general"):
    radii = [5000, 10000, 20000, 30000]
    
    for radius in radii:
        print(f"🏥 Searching hospitals in {radius/1000}km radius...")
        query = f"""
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:{radius},{lat},{lon});
          way["amenity"="hospital"](around:{radius},{lat},{lon});
          relation["amenity"="hospital"](around:{radius},{lat},{lon});
        );
        out body center tags 50;
        """
        
        try:
            url = "https://overpass-api.de/api/interpreter"
            response = requests.post(url, data={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                hospitals = process_hospital_data(data, lat, lon, hospital_type)
                
                if hospitals and len(hospitals) >= 3:
                    print(f"✅ Found {len(hospitals)} hospitals in {radius/1000}km")
                    return hospitals[:10]
        
        except Exception as e:
            print(f"⚠️ Hospital search error: {e}")
            continue
    
    return []

def process_hospital_data(data, user_lat, user_lon, hospital_type):
    hospitals = []
    seen = set()
    
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", "").strip()
        
        if not name or name.lower() in seen:
            continue
        
        if "lat" in element and "lon" in element:
            elem_lat, elem_lon = element["lat"], element["lon"]
        elif "center" in element:
            elem_lat, elem_lon = element["center"]["lat"], element["center"]["lon"]
        else:
            continue
        
        if hospital_type == "emergency":
            if tags.get("emergency") != "yes":
                continue
        
        distance = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        
        hospitals.append({
            "name": name,
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("contact:phone") or "Not Available",
            "distance": f"{distance:.1f} km",
            "emergency": tags.get("emergency", "no"),
            "coordinates": {"lat": elem_lat, "lon": elem_lon}
        })
        
        seen.add(name.lower())
    
    return sorted(hospitals, key=lambda x: float(x["distance"].split()[0]))

def search_pharmacies_progressive(lat, lon):
    radii = [2000, 5000, 10000, 20000]
    
    for radius in radii:
        print(f"💊 Searching pharmacies in {radius/1000}km radius...")
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
        
        try:
            url = "https://overpass-api.de/api/interpreter"
            response = requests.post(url, data={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                pharmacies = process_pharmacy_data(data, lat, lon)
                
                if pharmacies and len(pharmacies) >= 3:
                    print(f"✅ Found {len(pharmacies)} pharmacies in {radius/1000}km")
                    return pharmacies[:8]
        
        except Exception as e:
            print(f"⚠️ Pharmacy search error: {e}")
            continue
    
    return []

def process_pharmacy_data(data, user_lat, user_lon):
    pharmacies = []
    seen = set()
    
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", "").strip()
        
        if not name or name.lower() in seen:
            continue
        
        if "lat" in element and "lon" in element:
            elem_lat, elem_lon = element["lat"], element["lon"]
        elif "center" in element:
            elem_lat, elem_lon = element["center"]["lat"], element["center"]["lon"]
        else:
            continue
        
        distance = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        
        pharmacies.append({
            "name": name,
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("contact:phone") or "Not Available",
            "distance": f"{distance:.1f} km",
            "coordinates": {"lat": elem_lat, "lon": elem_lon}
        })
        
        seen.add(name.lower())
    
    return sorted(pharmacies, key=lambda x: float(x["distance"].split()[0]))

def search_ambulance_progressive(lat, lon):
    radii = [10000, 20000, 30000]
    
    for radius in radii:
        print(f"🚑 Searching ambulances in {radius/1000}km radius...")
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
        
        try:
            url = "https://overpass-api.de/api/interpreter"
            response = requests.post(url, data={"data": query}, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                ambulances = process_ambulance_data(data, lat, lon)
                
                if ambulances and len(ambulances) >= 2:
                    print(f"✅ Found {len(ambulances)} ambulance services")
                    return ambulances[:5]
        
        except Exception as e:
            print(f"⚠️ Ambulance search error: {e}")
            continue
    
    return []

def process_ambulance_data(data, user_lat, user_lon):
    services = []
    seen = set()
    
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name", "Ambulance Service")
        
        if name.lower() in seen:
            continue
        
        if "lat" in element and "lon" in element:
            elem_lat, elem_lon = element["lat"], element["lon"]
        elif "center" in element:
            elem_lat, elem_lon = element["center"]["lat"], element["center"]["lon"]
        else:
            continue
        
        distance = calculate_distance(user_lat, user_lon, elem_lat, elem_lon)
        
        services.append({
            "name": name,
            "address": format_address(tags),
            "phone": tags.get("phone") or tags.get("emergency:phone") or tags.get("contact:phone") or "108 (Emergency)",
            "distance": f"{distance:.1f} km",
            "coordinates": {"lat": elem_lat, "lon": elem_lon}
        })
        
        seen.add(name.lower())
    
    return sorted(services, key=lambda x: float(x["distance"].split()[0]))

def get_city_from_coordinates(lat, lon):
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "zoom": 10
        }
        headers = {
            "User-Agent": "MedicalAssistantApp/2.0"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()
        
        address = data.get("address", {})
        city = (address.get("city") or 
                address.get("town") or 
                address.get("village") or 
                address.get("county") or 
                address.get("state_district") or
                "Unknown Location")
        
        print(f"📍 Location: {city}")
        return city
    
    except Exception as e:
        print(f"⚠️ Reverse geocoding error: {e}")
        return "Unknown Location"

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def format_address(tags, city=""):
    parts = []
    for key in ["addr:housenumber", "addr:street", "addr:suburb", "addr:city", "addr:postcode"]:
        if tags.get(key):
            parts.append(tags[key])
    
    if not parts and city:
        parts.append(city)
    
    return ", ".join(parts) if parts else tags.get("addr:full", "Not Available")

# SIMPLIFIED AI DIAGNOSIS - Single reliable model
def get_ai_diagnosis(symptoms: str):
    """
    Simple AI diagnosis using Hugging Face Inference API
    """
    if not USE_AI:
        raise Exception("AI disabled")
    
    # Simple, clear prompt for better results
    prompt = f"""You are a medical assistant. Patient symptoms: {symptoms}

Diagnosis format:
Condition: [likely condition]
Severity: [low/moderate/high]  
Advice: [brief care instructions]
Warning: [when to see doctor]"""

    print("🤖 Querying AI model...")
    
    try:
        response = requests.post(
            INFERENCE_API_URL,
            headers=headers,
            json={
                "inputs": prompt,
                "parameters": {
                    "max_length": 200,
                    "temperature": 0.7,
                    "do_sample": True
                }
            },
            timeout=15
        )

        if response.status_code == 200:
            result = response.json()
            
            # Parse response
            if isinstance(result, list) and len(result) > 0:
                text = result[0].get("generated_text", "")
            elif isinstance(result, dict):
                text = result.get("generated_text", result.get("text", ""))
            else:
                text = ""

            if text and len(text) > 10:
                print("✅ AI response received")
                return text
            else:
                raise Exception("Empty AI response")
        else:
            print(f"⚠️ API error: {response.status_code}")
            raise Exception(f"API returned {response.status_code}")
            
    except Exception as e:
        print(f"⚠️ AI request failed: {e}")
        raise

def analyze_symptoms_fallback(symptoms):
    """Enhanced rule-based fallback system"""
    symptoms_lower = symptoms.lower()
    
    if any(word in symptoms_lower for word in ['chest pain', 'heart attack', 'stroke', 'bleeding heavily', 
                                                  'can\'t breathe', 'severe bleeding', 'unconscious']):
        return {
            "condition": "Emergency Medical Situation",
            "severity": "high",
            "advice": "Call emergency services immediately. Do not drive yourself. Keep calm and stay still.",
            "doctor_note": "Seek immediate emergency care. Call ambulance or visit ER now."
        }
    
    elif any(word in symptoms_lower for word in ['high fever', 'persistent vomiting', 'severe pain', 
                                                    'difficulty breathing', 'severe headache']):
        return {
            "condition": "Acute Illness Requiring Medical Attention",
            "severity": "high",
            "advice": "Rest immediately. Stay hydrated. Monitor temperature. Avoid solid foods if vomiting.",
            "doctor_note": "See a doctor today or visit urgent care within 4-6 hours."
        }
    
    elif any(word in symptoms_lower for word in ['fever', 'temperature', 'chills']):
        return {
            "condition": "Possible Fever or Viral Infection",
            "severity": "moderate",
            "advice": "Drink plenty of water and fluids. Take rest. Use cool compress. Monitor temperature every 4 hours.",
            "doctor_note": "See a doctor if fever persists beyond 3 days or exceeds 103°F (39.4°C)."
        }
    
    elif any(word in symptoms_lower for word in ['stomach', 'nausea', 'vomiting', 'diarrhea', 'upset stomach']):
        return {
            "condition": "Gastroenteritis or Digestive Issue",
            "severity": "moderate",
            "advice": "Stay hydrated with ORS or electrolyte drinks. Avoid spicy and oily foods. Eat bland foods like rice, banana. Rest well.",
            "doctor_note": "See a doctor if symptoms persist for more than 48 hours or if you notice blood."
        }
    
    elif any(word in symptoms_lower for word in ['cough', 'cold', 'sore throat', 'runny nose', 'congestion']):
        return {
            "condition": "Upper Respiratory Tract Infection or Common Cold",
            "severity": "low",
            "advice": "Drink warm liquids like tea or soup. Get adequate rest. Use steam inhalation. Stay warm and avoid cold exposure.",
            "doctor_note": "See a doctor if symptoms worsen after 5-7 days or if breathing becomes difficult."
        }
    
    elif any(word in symptoms_lower for word in ['headache', 'head pain', 'migraine']):
        return {
            "condition": "Headache or Tension-type Pain",
            "severity": "low",
            "advice": "Rest in a quiet, dark room. Stay hydrated. Apply cool compress to forehead. Avoid screens and bright lights.",
            "doctor_note": "See a doctor if headache is severe, persistent, or accompanied by vision changes."
        }
    
    elif any(word in symptoms_lower for word in ['tired', 'fatigue', 'body pain', 'weakness', 'body ache']):
        return {
            "condition": "General Fatigue or Body Ache",
            "severity": "low",
            "advice": "Get proper rest and sleep. Stay hydrated. Eat nutritious meals. Light stretching may help. Avoid overexertion.",
            "doctor_note": "See a doctor if fatigue persists for more than 2 weeks or worsens significantly."
        }
    
    else:
        return {
            "condition": "General Health Concern",
            "severity": "low",
            "advice": "Monitor your symptoms. Stay hydrated. Get adequate rest. Maintain a balanced diet. Avoid stress.",
            "doctor_note": "See a doctor if symptoms persist or worsen over the next few days."
        }

@app.post("/api/diagnose")
async def diagnose(request: Request):
    data = await request.json()
    symptoms = data.get("symptoms", "").strip()
    lat = data.get("latitude")
    lon = data.get("longitude")

    if not symptoms:
        return {"error": "Please describe your symptoms."}

    # Try AI diagnosis first, fallback to rule-based
    try:
        ai_response = get_ai_diagnosis(symptoms)
        
        condition_match = re.search(r'Condition:\s*(.+?)(?:\n|Severity:)', ai_response, re.IGNORECASE)
        severity_match = re.search(r'Severity:\s*(low|moderate|high)', ai_response, re.IGNORECASE)
        advice_match = re.search(r'Advice:\s*(.+?)(?:\n|Warning:|$)', ai_response, re.IGNORECASE | re.DOTALL)
        warning_match = re.search(r'Warning:\s*(.+?)$', ai_response, re.IGNORECASE | re.DOTALL)
        
        if not (condition_match and severity_match and advice_match):
            raise ValueError("AI response parsing failed")
        
        condition = condition_match.group(1).strip()
        severity = severity_match.group(1).strip().lower()
        advice = advice_match.group(1).strip()
        doctor_note = warning_match.group(1).strip() if warning_match else "Consult a doctor if symptoms persist."
        
        print("✅ Using AI diagnosis")
        
    except Exception as e:
        print(f"⚠️ AI diagnosis failed, using rule-based fallback: {e}")
        analysis = analyze_symptoms_fallback(symptoms)
        condition = analysis["condition"]
        severity = analysis["severity"]
        advice = analysis["advice"]
        doctor_note = analysis["doctor_note"]
        print("✅ Using rule-based diagnosis")

    specialty = detect_specialty(condition, symptoms)
    hospital_type = get_hospital_type_for_condition(condition, symptoms)
    
    print(f"📋 Diagnosis: {condition}")
    print(f"🎯 Required specialty: {specialty}")
    print(f"🏥 Hospital type: {hospital_type}")

    suggestion = f"You have {condition} and it is {severity} severity. My suggestion is: {advice} {doctor_note}"

    nearby = {}
    if lat and lon:
        city = get_city_from_coordinates(lat, lon)
        
        if severity == "high":
            print("🚨 HIGH SEVERITY - Searching all emergency services...")
            nearby["doctors"] = search_osm_doctors_progressive(lat, lon, specialty, city)
            nearby["hospitals"] = search_hospitals_progressive(lat, lon, hospital_type)
            nearby["ambulance_services"] = search_ambulance_progressive(lat, lon)
            nearby["pharmacies"] = search_pharmacies_progressive(lat, lon)
            
        elif severity == "moderate":
            print("⚠️ MODERATE SEVERITY - Searching doctors and pharmacies...")
            nearby["doctors"] = search_osm_doctors_progressive(lat, lon, specialty, city)
            nearby["pharmacies"] = search_pharmacies_progressive(lat, lon)
            nearby["hospitals"] = search_hospitals_progressive(lat, lon, hospital_type)
            
        else:
            print("✅ LOW SEVERITY - Searching doctors and pharmacies...")
            nearby["pharmacies"] = search_pharmacies_progressive(lat, lon)
            nearby["doctors"] = search_osm_doctors_progressive(lat, lon, specialty, city)
        
        nearby = {k: v for k, v in nearby.items() if v}

    return {
        "suggestion": suggestion,
        "severity": severity,
        "specialty": specialty,
        "condition": condition,
        "city": city if lat and lon else "Unknown",
        "nearby": nearby
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=5000)