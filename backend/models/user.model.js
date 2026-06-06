const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true,
        min:1,
    },
    username:{
        type:String,
        required:true,
        unique:true 
    },
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String
    },
    token:{
        type:String
    },
    history: [{
        symptoms: String,
        condition: String,
        severity: String,
        specialty: String,
        date: { type: Date, default: Date.now },
        // Telemetry metrics
        heartRate: { type: Number, default: null },
        bloodPressureSystolic: { type: Number, default: null },
        bloodPressureDiastolic: { type: Number, default: null },
        bloodSugar: { type: Number, default: null },
        sleepHours: { type: Number, default: null },
        weight: { type: Number, default: null },
        hemoglobin: { type: Number, default: null },
        prq: { type: Number, default: null },
        // Organ health scores
        liver: { type: Number, default: null },
        kidney: { type: Number, default: null },
        heart: { type: Number, default: null },
        cellular: { type: Number, default: null },
        hormonal: { type: Number, default: null },
        immune: { type: Number, default: null },
        digestive: { type: Number, default: null },
        inflammation: { type: Number, default: null },
        // Full diagnosis details & attachment
        suggestion: { type: String, default: null },
        nearby: { type: mongoose.Schema.Types.Mixed, default: null },
        attachedReportText: { type: String, default: null }
    }]
})

const User = mongoose.model("User", userSchema);

module.exports = User;