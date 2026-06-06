const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const registerUser = async (req,res)=>{
    try{
        const {name,age,username,email,password} = req.body;
        const existUser = await User.findOne({username});
        if(existUser){
            return res.status(400).json({message: "User already exists"});
        }

        const hashPassword = await bcrypt.hash(password,10)
        const newUser = new User({
            name: name,
            age: age,
            username: username,
            email: email,
            password: hashPassword
        });
        await newUser.save();
        res.status(201).json({message:"User registered successfully"});
    }catch(err){
        res.status(500).json({message: `Something went wrong: ${err}`});
    }
}

const loginUser = async (req,res)=>{
    const {username,password} = req.body;
    if(!username || !password){
        return res.status(400).json({message: "Please fill all the field"});
    }
    try{
        const user = await User.findOne({username});
        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch){
            let token = crypto.randomBytes(20).toString('hex');
            user.token = token;
            await user.save();
            res.cookie('token', token , {
                httpOnly:false,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.cookie('name', user.name , {
                httpOnly:false,
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.status(200).json({message: "Login successfull", token: token})
        }
    }catch(err){
        return res.status(500).json({message: `Something went wrong: ${err}`});
    }
}

const parseSymptomsTelemetry = (symptoms, condition, severity) => {
    const s = symptoms || "";
    const cond = (condition || "").toLowerCase();
    const sev = (severity || "").toLowerCase();

    const result = {
        heartRate: null,
        bloodPressureSystolic: null,
        bloodPressureDiastolic: null,
        bloodSugar: null,
        sleepHours: null,
        weight: null,
        hemoglobin: null,
        prq: null,
        // Organ health scores
        liver: null,
        kidney: null,
        heart: null,
        cellular: null,
        hormonal: null,
        immune: null,
        digestive: null,
        inflammation: null
    };

    // 1. Heart Rate
    const hrMatch = s.match(/(?:heart\s*rate|pulse|bpm|heartbeat|hr)\s*(?::|is|=)?\s*(\d+)/i) || 
                    s.match(/(\d+)\s*(?:bpm|pulse|beats)/i);
    if (hrMatch) {
        const val = parseInt(hrMatch[1], 10);
        if (val >= 30 && val <= 250) result.heartRate = val;
    }

    // 2. Blood Pressure
    const bpMatch = s.match(/(?:blood\s*pressure|bp)\s*(?::|is|=)?\s*(\d+)\s*[\/\s-]\s*(\d+)/i) || 
                    s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bpMatch) {
        const sys = parseInt(bpMatch[1], 10);
        const dia = parseInt(bpMatch[2], 10);
        if (sys >= 70 && sys <= 220 && dia >= 40 && dia <= 130) {
            result.bloodPressureSystolic = sys;
            result.bloodPressureDiastolic = dia;
        }
    }

    // 3. Blood Sugar
    const sugarMatch = s.match(/(?:blood\s*sugar|glucose|sugar|diabetes|fasting|random)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)/i) || 
                       s.match(/(\d+(?:\.\d+)?)\s*(?:mg\/dL|mg\/dl)/i);
    if (sugarMatch) {
        const val = parseFloat(sugarMatch[1]);
        if (val >= 20 && val <= 600) result.bloodSugar = val;
    }

    // 4. Sleep
    const sleepMatch = s.match(/(?:sleep|slept)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)/i);
    if (sleepMatch) {
        const val = parseFloat(sleepMatch[1]);
        if (val >= 0 && val <= 24) result.sleepHours = val;
    }

    // 5. Weight
    const weightMatch = s.match(/(?:weight|wt)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms|lbs|pounds)/i);
    if (weightMatch) {
        let val = parseFloat(weightMatch[1]);
        if (s.toLowerCase().includes("lbs") || s.toLowerCase().includes("pounds")) {
            val = val * 0.45359237; // convert to kg
        }
        if (val >= 2 && val <= 500) result.weight = Math.round(val);
    }

    // 6. Hemoglobin
    const hbMatch = s.match(/(?:hemoglobin|hb)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:g\/dL|g\/dl|mg\/dl)/i);
    if (hbMatch) {
        const val = parseFloat(hbMatch[1]);
        if (val >= 2 && val <= 25) result.hemoglobin = val;
    }

    // 7. PRQ (respiratory rate or similar)
    const prqMatch = s.match(/(?:prq|respiration|respiratory\s*rate|breaths)\s*(?::|is|=)?\s*(\d+)/i);
    if (prqMatch) {
        const val = parseInt(prqMatch[1], 10);
        if (val >= 5 && val <= 60) result.prq = val;
    }

    // Determine organ systems and inflammation based on severity & symptoms
    const isHigh = sev === "high";
    const isMod = sev === "moderate";

    // Set organ scores if relevant to condition
    if (cond.includes("stomach") || cond.includes("gastric") || cond.includes("digestive") || cond.includes("gerd") || cond.includes("nausea") || cond.includes("vomiting")) {
        result.digestive = isHigh ? 55 : isMod ? 70 : 90;
        result.inflammation = isHigh ? 50 : isMod ? 65 : 80;
        result.cellular = isHigh ? 65 : isMod ? 75 : 85;
    }
    if (cond.includes("diabetes") || cond.includes("sugar") || cond.includes("endocrine")) {
        result.hormonal = isHigh ? 42 : isMod ? 60 : 80;
        result.kidney = isHigh ? 78 : isMod ? 88 : 95;
        result.cellular = isHigh ? 60 : isMod ? 70 : 85;
    }
    if (cond.includes("cardiac") || cond.includes("heart") || cond.includes("pressure") || cond.includes("hypertension")) {
        result.heart = isHigh ? 52 : isMod ? 70 : 85;
        result.cellular = isHigh ? 58 : isMod ? 68 : 80;
        result.kidney = isHigh ? 85 : isMod ? 90 : 95;
    }
    if (cond.includes("fever") || cond.includes("cold") || cond.includes("infection") || cond.includes("bronch") || cond.includes("cough")) {
        result.immune = isHigh ? 50 : isMod ? 68 : 85;
        result.inflammation = isHigh ? 45 : isMod ? 60 : 75;
    }
    if (cond.includes("migraine") || cond.includes("headache") || cond.includes("neuro")) {
        result.cellular = isHigh ? 55 : isMod ? 68 : 82;
        result.hormonal = isHigh ? 60 : isMod ? 75 : 85;
    }

    // Default other organs to standard/healthy values if not specifically affected
    result.liver = result.liver || (isHigh ? 76 : isMod ? 86 : 96);
    result.kidney = result.kidney || (isHigh ? 80 : isMod ? 90 : 100);
    result.heart = result.heart || (isHigh ? 73 : isMod ? 80 : 88);
    result.cellular = result.cellular || (isHigh ? 57 : isMod ? 64 : 72);
    result.hormonal = result.hormonal || (isHigh ? 53 : isMod ? 60 : 68);
    result.immune = result.immune || (isHigh ? 65 : isMod ? 75 : 85);
    result.digestive = result.digestive || (isHigh ? 70 : isMod ? 80 : 90);
    result.inflammation = result.inflammation || (isHigh ? 50 : isMod ? 60 : 70);

    return result;
};

const saveHistory = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const { symptoms, condition, severity, specialty } = req.body;
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const parsedTelemetry = parseSymptomsTelemetry(symptoms, condition, severity);
        
        let extractedAttachedText = null;
        if (symptoms) {
            const marker = "[Extracted Medical Report Text]:\n";
            const idx = symptoms.indexOf(marker);
            if (idx !== -1) {
                extractedAttachedText = symptoms.substring(idx + marker.length).trim();
            }
        }
        
        const historyEntry = {
            symptoms,
            condition,
            severity,
            specialty,
            heartRate: req.body.heartRate !== undefined ? req.body.heartRate : parsedTelemetry.heartRate,
            bloodPressureSystolic: req.body.bloodPressureSystolic !== undefined ? req.body.bloodPressureSystolic : parsedTelemetry.bloodPressureSystolic,
            bloodPressureDiastolic: req.body.bloodPressureDiastolic !== undefined ? req.body.bloodPressureDiastolic : parsedTelemetry.bloodPressureDiastolic,
            bloodSugar: req.body.bloodSugar !== undefined ? req.body.bloodSugar : parsedTelemetry.bloodSugar,
            sleepHours: req.body.sleepHours !== undefined ? req.body.sleepHours : parsedTelemetry.sleepHours,
            weight: req.body.weight !== undefined ? req.body.weight : parsedTelemetry.weight,
            hemoglobin: req.body.hemoglobin !== undefined ? req.body.hemoglobin : parsedTelemetry.hemoglobin,
            prq: req.body.prq !== undefined ? req.body.prq : parsedTelemetry.prq,
            liver: req.body.liver !== undefined ? req.body.liver : parsedTelemetry.liver,
            kidney: req.body.kidney !== undefined ? req.body.kidney : parsedTelemetry.kidney,
            heart: req.body.heart !== undefined ? req.body.heart : parsedTelemetry.heart,
            cellular: req.body.cellular !== undefined ? req.body.cellular : parsedTelemetry.cellular,
            hormonal: req.body.hormonal !== undefined ? req.body.hormonal : parsedTelemetry.hormonal,
            immune: req.body.immune !== undefined ? req.body.immune : parsedTelemetry.immune,
            digestive: req.body.digestive !== undefined ? req.body.digestive : parsedTelemetry.digestive,
            inflammation: req.body.inflammation !== undefined ? req.body.inflammation : parsedTelemetry.inflammation,
            
            // Full report details & attachments
            suggestion: req.body.suggestion !== undefined ? req.body.suggestion : null,
            nearby: req.body.nearby !== undefined ? req.body.nearby : null,
            attachedReportText: req.body.attachedReportText !== undefined ? req.body.attachedReportText : extractedAttachedText
        };
        
        user.history.push(historyEntry);
        await user.save();
        res.status(200).json({ message: "History saved successfully", history: user.history });
    } catch (err) {
        res.status(500).json({ message: `Something went wrong: ${err}` });
    }
};

const getHistory = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const user = await User.findOne({ token });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json({ history: user.history });
    } catch (err) {
        res.status(500).json({ message: `Something went wrong: ${err}` });
    }
};

module.exports = { registerUser, loginUser, saveHistory, getHistory };