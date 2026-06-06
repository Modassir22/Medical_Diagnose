import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Activity, 
  ArrowLeft, 
  AlertCircle, 
  Clock, 
  User, 
  Bell, 
  Settings, 
  Download, 
  Sparkles
} from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "../../App";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const HistoryPage = () => {
  const { name } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selection states
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [timeRange, setTimeRange] = useState("24H"); // 24H, 7 Days, 30 Days
  const [activeTab, setActiveTab] = useState("Weight"); // All, Weight, Hemoglobin, Blood Pressure, PRQ

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch("http://localhost:3001/api/user/history", {
        method: "GET",
        headers: {
          "Authorization": token || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history (Status ${response.status})`);
      }

      const data = await response.json();
      const sortedHistory = (data.history || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date) // Descending sort (latest first)
      );
      setHistory(sortedHistory);
      if (sortedHistory.length > 0) {
        setActiveReportIndex(0);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeReport = history.length > 0 && activeReportIndex !== null ? history[activeReportIndex] : null;

  // Identify which metrics and organ systems are active based on the actual diagnosed values and specialty
  const getActiveDiagnosed = (tel) => {
    if (!tel) return { activeAxes: [], activeTabs: [], activeCurves: [] };

    const activeCurves = [];
    if (tel.hrDiagnosed) activeCurves.push("Heart Rate");
    if (tel.bpDiagnosed) activeCurves.push("Blood Pressure");
    if (tel.sugarValueDiagnosed) activeCurves.push("Blood Sugar");
    if (tel.sleepHoursDiagnosed) activeCurves.push("Sleep Log");

    const activeTabs = [];
    if (tel.hrDiagnosed) activeTabs.push("All"); // "All" represents Heart Rate
    if (tel.weightDiagnosed) activeTabs.push("Weight");
    if (tel.hemoglobinDiagnosed) activeTabs.push("Hemoglobin");
    if (tel.bpDiagnosed) activeTabs.push("Blood Pressure");
    if (tel.prqDiagnosed) activeTabs.push("PRQ");

    const spec = (tel.specialty || "general-physician").toLowerCase();
    
    let activeAxes = ["Cellular Health", "Inflammation"];
    if (spec.includes("gastro") || spec.includes("stomach")) {
      activeAxes = ["Digestive Health", "Inflammation", "Cellular Health"];
    } else if (spec.includes("endo") || spec.includes("diabet")) {
      activeAxes = ["Hormonal Balance", "Kidney Health", "Cellular Health", "Inflammation"];
    } else if (spec.includes("cardio") || spec.includes("heart") || spec.includes("hypertension")) {
      activeAxes = ["Heart Health", "Kidney Health", "Cellular Health", "Inflammation"];
    } else if (spec.includes("neuro") || spec.includes("migraine") || spec.includes("headache")) {
      activeAxes = ["Cellular Health", "Inflammation", "Hormonal Balance"];
    } else if (spec.includes("physician") || spec.includes("general") || spec.includes("fever") || spec.includes("cold")) {
      activeAxes = ["Immune Health", "Inflammation", "Cellular Health"];
    }
    
    return { activeAxes, activeTabs, activeCurves };
  };

  // Enhance generateTelemetry outputs for our specific cards:
  const getDynamicTelemetry = (report) => {
    const defaultTelemetry = {
      hr: "--",
      hrValue: null,
      hrDiagnosed: false,
      bp: "--",
      bpSystolic: null,
      bpDiastolic: null,
      bpDiagnosed: false,
      weight: "--",
      weightValue: null,
      weightDiagnosed: false,
      hemoglobin: "--",
      hemoglobinValue: null,
      hemoglobinDiagnosed: false,
      prq: "--",
      prqValue: null,
      prqDiagnosed: false,
      sleepHours: null,
      sleepHoursDiagnosed: false,
      sugarValue: null,
      sugarValueDiagnosed: false,
      difficultyLevel: 1,
      totalDuration: "30sec",
      condition: "General Health",
      symptoms: "No symptoms recorded.",
      date: new Date().toLocaleDateString(),
      severity: "low",
      specialty: "general-physician",
      liver: 96,
      kidney: 100,
      heart: 88,
      cellular: 72,
      hormonal: 68,
      immune: 85,
      digestive: 90,
      inflammation: 70
    };

    if (!report) return defaultTelemetry;

    const s = report.symptoms || "";
    const cond = report.condition.toLowerCase();
    const isHigh = report.severity?.toLowerCase() === "high";
    const isMod = report.severity?.toLowerCase() === "moderate";

    // 1. Heart Rate
    let hrValue = null;
    let hrDiagnosed = false;
    if (report.heartRate !== undefined && report.heartRate !== null) {
      hrValue = report.heartRate;
      hrDiagnosed = true;
    } else {
      const match = s.match(/(?:heart\s*rate|pulse|bpm|heartbeat|hr)\s*(?::|is|=)?\s*(\d+)/i) || 
                    s.match(/(\d+)\s*(?:bpm|pulse|beats)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= 30 && val <= 250) {
          hrValue = val;
          hrDiagnosed = true;
        }
      }
    }

    // 2. Blood Pressure
    let bpSystolic = null;
    let bpDiastolic = null;
    let bpDiagnosed = false;
    if (report.bloodPressureSystolic !== undefined && report.bloodPressureSystolic !== null) {
      bpSystolic = report.bloodPressureSystolic;
      bpDiastolic = report.bloodPressureDiastolic;
      bpDiagnosed = true;
    } else {
      const match = s.match(/(?:blood\s*pressure|bp)\s*(?::|is|=)?\s*(\d+)\s*[\/\s-]\s*(\d+)/i) || 
                    s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (match) {
        const sys = parseInt(match[1], 10);
        const dia = parseInt(match[2], 10);
        if (sys >= 70 && sys <= 220 && dia >= 40 && dia <= 130) {
          bpSystolic = sys;
          bpDiastolic = dia;
          bpDiagnosed = true;
        }
      }
    }

    // 3. Blood Sugar
    let sugarValue = null;
    let sugarValueDiagnosed = false;
    if (report.bloodSugar !== undefined && report.bloodSugar !== null) {
      sugarValue = report.bloodSugar;
      sugarValueDiagnosed = true;
    } else {
      const match = s.match(/(?:blood\s*sugar|glucose|sugar|diabetes|fasting|random)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)/i) || 
                    s.match(/(\d+(?:\.\d+)?)\s*(?:mg\/dL|mg\/dl)/i);
      if (match) {
        const val = parseFloat(match[1]);
        if (val >= 20 && val <= 600) {
          sugarValue = val;
          sugarValueDiagnosed = true;
        }
      }
    }

    // 4. Sleep
    let sleepHours = null;
    let sleepHoursDiagnosed = false;
    if (report.sleepHours !== undefined && report.sleepHours !== null) {
      sleepHours = report.sleepHours;
      sleepHoursDiagnosed = true;
    } else {
      const match = s.match(/(?:sleep|slept)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr)/i);
      if (match) {
        const val = parseFloat(match[1]);
        if (val >= 0 && val <= 24) {
          sleepHours = val;
          sleepHoursDiagnosed = true;
        }
      }
    }

    // 5. Weight
    let weightValue = null;
    let weightDiagnosed = false;
    if (report.weight !== undefined && report.weight !== null) {
      weightValue = report.weight;
      weightDiagnosed = true;
    } else {
      const match = s.match(/(?:weight|wt)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms|lbs|pounds)/i);
      if (match) {
        let val = parseFloat(match[1]);
        if (s.toLowerCase().includes("lbs") || s.toLowerCase().includes("pounds")) {
          val = val * 0.45359237;
        }
        if (val >= 2 && val <= 500) {
          weightValue = Math.round(val);
          weightDiagnosed = true;
        }
      }
    }

    // 6. Hemoglobin
    let hemoglobinValue = null;
    let hemoglobinDiagnosed = false;
    if (report.hemoglobin !== undefined && report.hemoglobin !== null) {
      hemoglobinValue = report.hemoglobin;
      hemoglobinDiagnosed = true;
    } else {
      const match = s.match(/(?:hemoglobin|hb)\s*(?::|is|=)?\s*(\d+(?:\.\d+)?)\s*(?:g\/dL|g\/dl|mg\/dl)/i);
      if (match) {
        const val = parseFloat(match[1]);
        if (val >= 2 && val <= 25) {
          hemoglobinValue = val;
          hemoglobinDiagnosed = true;
        }
      }
    }

    // 7. PRQ
    let prqValue = null;
    let prqDiagnosed = false;
    if (report.prq !== undefined && report.prq !== null) {
      prqValue = report.prq;
      prqDiagnosed = true;
    } else {
      const match = s.match(/(?:prq|respiration|respiratory\s*rate|breaths)\s*(?::|is|=)?\s*(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= 5 && val <= 60) {
          prqValue = val;
          prqDiagnosed = true;
        }
      }
    }

    // Difficulty level and duration
    let difficultyLevel = isHigh ? 3 : isMod ? 2 : 1;
    let totalDuration = isHigh ? "60sec" : isMod ? "45sec" : "30sec";

    // Organ Scores
    let liver = report.liver !== undefined && report.liver !== null ? report.liver : (isHigh ? 76 : isMod ? 86 : 96);
    let kidney = report.kidney !== undefined && report.kidney !== null ? report.kidney : (isHigh ? 80 : isMod ? 90 : 100);
    let heart = report.heart !== undefined && report.heart !== null ? report.heart : (isHigh ? 73 : isMod ? 80 : 88);
    let cellular = report.cellular !== undefined && report.cellular !== null ? report.cellular : (isHigh ? 57 : isMod ? 64 : 72);
    let hormonal = report.hormonal !== undefined && report.hormonal !== null ? report.hormonal : (isHigh ? 53 : isMod ? 60 : 68);
    let immune = report.immune !== undefined && report.immune !== null ? report.immune : (isHigh ? 65 : isMod ? 75 : 85);
    let digestive = report.digestive !== undefined && report.digestive !== null ? report.digestive : (isHigh ? 70 : isMod ? 80 : 90);
    let inflammation = report.inflammation !== undefined && report.inflammation !== null ? report.inflammation : (isHigh ? 50 : isMod ? 60 : 70);

    return {
      hr: hrDiagnosed ? `${hrValue} bpm` : "--",
      hrValue,
      hrDiagnosed,
      bp: bpDiagnosed ? `${bpSystolic}/${bpDiastolic} mmHg` : "--",
      bpSystolic,
      bpDiastolic,
      bpDiagnosed,
      weight: weightDiagnosed ? `${weightValue} kg` : "--",
      weightValue,
      weightDiagnosed,
      hemoglobin: hemoglobinDiagnosed ? `${hemoglobinValue} g/dL` : "--",
      hemoglobinValue,
      hemoglobinDiagnosed,
      prq: prqDiagnosed ? `${prqValue} bpm` : "--",
      prqValue,
      prqDiagnosed,
      sleepHours,
      sleepHoursDiagnosed,
      sugarValue,
      sugarValueDiagnosed,
      difficultyLevel,
      totalDuration,
      condition: report.condition,
      symptoms: report.symptoms || "No symptoms recorded.",
      date: new Date(report.date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
      severity: report.severity || "low",
      specialty: report.specialty || "general-physician",
      liver,
      kidney,
      heart,
      cellular,
      hormonal,
      immune,
      digestive,
      inflammation
    };
  };

  const telemetry = getDynamicTelemetry(activeReport);
  const diagnosed = getActiveDiagnosed(telemetry);

  // Dynamic selector safety tab reset if activeTab is not in active report's diagnosed metrics
  useEffect(() => {
    if (activeReport) {
      const tel = getDynamicTelemetry(activeReport);
      const reportDiagnosed = getActiveDiagnosed(tel);
      
      if (!reportDiagnosed.activeTabs.includes(activeTab)) {
        const availableTabs = reportDiagnosed.activeTabs;
        if (availableTabs.length > 0) {
          if (availableTabs.includes("All") && tel.hrDiagnosed) {
            setActiveTab("All");
          } else {
            const nonAllTab = availableTabs.find(t => t !== "All");
            setActiveTab(nonAllTab || "All");
          }
        } else {
          setActiveTab("All");
        }
      }
    }
  }, [activeReportIndex]);

  // Parse actual clinical history to generate a real-bound Recovery Tracker curves
  const getDynamicHistoryCurve = (historyData) => {
    const maxPoints = 7;
    const historyList = [...historyData].reverse(); // chronological (oldest first)
    const pointsToUse = historyList.slice(-maxPoints);

    const parsedRed = [];
    const parsedBlue = [];
    const parsedPurple = [];
    const parsedOrange = [];

    for (let i = 0; i < maxPoints; i++) {
      const reportIndex = i - (maxPoints - pointsToUse.length);
      if (reportIndex >= 0 && reportIndex < pointsToUse.length) {
        const report = pointsToUse[reportIndex];
        const tel = getDynamicTelemetry(report);
        
        parsedRed.push(tel.hrDiagnosed ? tel.hrValue : null);
        parsedBlue.push(tel.bpDiagnosed ? tel.bpSystolic : null);
        parsedPurple.push(tel.sugarValueDiagnosed ? tel.sugarValue : null);
        parsedOrange.push(tel.sleepHoursDiagnosed ? tel.sleepHours * 10 : null);
      } else {
        parsedRed.push(null);
        parsedBlue.push(null);
        parsedPurple.push(null);
        parsedOrange.push(null);
      }
    }

    return {
      red: parsedRed,
      blue: parsedBlue,
      purple: parsedPurple,
      orange: parsedOrange
    };
  };

  const curveData = getDynamicHistoryCurve(history);

  // Calculate historical peaks for telemetry metrics (Heart Rate, BP, Sugar, Sleep)
  const getHistoricalPeaks = (historyData) => {
    let maxHR = null;
    let maxBPSystolic = null;
    let maxBPDiastolic = null;
    let maxSugar = null;
    let maxSleep = null;

    historyData.forEach(report => {
      const tel = getDynamicTelemetry(report);
      if (tel.hrDiagnosed && (maxHR === null || tel.hrValue > maxHR)) {
        maxHR = tel.hrValue;
      }
      if (tel.bpDiagnosed) {
        if (maxBPSystolic === null || tel.bpSystolic > maxBPSystolic) {
          maxBPSystolic = tel.bpSystolic;
          maxBPDiastolic = tel.bpDiastolic; // sync diastolic peak with systolic peak
        }
      }
      if (tel.sugarValueDiagnosed && (maxSugar === null || tel.sugarValue > maxSugar)) {
        maxSugar = tel.sugarValue;
      }
      if (tel.sleepHoursDiagnosed && (maxSleep === null || tel.sleepHours > maxSleep)) {
        maxSleep = tel.sleepHours;
      }
    });

    return { maxHR, maxBPSystolic, maxBPDiastolic, maxSugar, maxSleep };
  };

  // Get list of unique diagnosed conditions to display in registry
  const getDiagnosedConditions = (historyData) => {
    const uniqueConditions = {};
    historyData.forEach(report => {
      if (report.condition) {
        const condName = report.condition.trim();
        const condKey = condName.toLowerCase();
        const reportDate = new Date(report.date);
        
        if (!uniqueConditions[condKey]) {
          uniqueConditions[condKey] = {
            name: condName,
            firstDiagnosed: reportDate,
            latestDiagnosed: reportDate,
            count: 1,
            severity: report.severity || "low",
            specialty: report.specialty || "general-physician"
          };
        } else {
          uniqueConditions[condKey].count += 1;
          if (reportDate < uniqueConditions[condKey].firstDiagnosed) {
            uniqueConditions[condKey].firstDiagnosed = reportDate;
          }
          if (reportDate > uniqueConditions[condKey].latestDiagnosed) {
            uniqueConditions[condKey].latestDiagnosed = reportDate;
            uniqueConditions[condKey].severity = report.severity || "low";
          }
        }
      }
    });

    return Object.values(uniqueConditions).sort((a, b) => b.latestDiagnosed - a.latestDiagnosed);
  };

  const peaks = getHistoricalPeaks(history);
  const diagnosedConditions = getDiagnosedConditions(history);

  // Helper component for Recovery Tracker Line Chart (only shows diagnosed metrics active as per feedback)
  const RecoveryTrackerChart = ({ curveData, activeIndex }) => {
    const getReportDateAtIndex = (idx) => {
      const maxPoints = 7;
      const historyList = [...history].reverse();
      const pointsToUse = historyList.slice(-maxPoints);
      const reportIndex = idx - (maxPoints - pointsToUse.length);
      
      if (reportIndex >= 0 && reportIndex < pointsToUse.length) {
        return new Date(pointsToUse[reportIndex].date).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      }
      const baseDates = ["Jan 10", "Jan 18", "Jan 25", "Feb 02", "Feb 10", "Feb 18", "Feb 25"];
      return baseDates[idx];
    };

    const chartData = Array.from({ length: 7 }).map((_, idx) => {
      return {
        name: getReportDateAtIndex(idx),
        "Heart Rate": curveData.red[idx],
        "Blood Pressure": curveData.blue[idx],
        "Blood Sugar": curveData.purple[idx],
        "Sleep Log": curveData.orange[idx],
      };
    });

    const curves = [
      { id: "Heart Rate", color: "#EF4444", dataKey: "Heart Rate", unit: "bpm" },
      { id: "Blood Pressure", color: "#3B82F6", dataKey: "Blood Pressure", unit: "mmHg" },
      { id: "Blood Sugar", color: "#A855F7", dataKey: "Blood Sugar", unit: "mg/dL" },
      { id: "Sleep Log", color: "#F97316", dataKey: "Sleep Log", unit: "hrs", formatVal: (v) => `${(v/10).toFixed(1)} hrs` }
    ].map(c => {
      const isDiagnosed = diagnosed.activeCurves.includes(c.id);
      return { ...c, isDiagnosed };
    });

    const timelineActiveIndex = 6 - activeIndex;

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const activePayload = payload.filter(p => {
          const curve = curves.find(c => c.dataKey === p.name);
          return curve?.isDiagnosed;
        });

        if (activePayload.length === 0) return null;

        return (
          <div className="bg-white/95 backdrop-blur-sm border border-slate-100 rounded-xl p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-[9px] font-bold text-slate-600 pointer-events-none z-30 font-sans">
            <div className="text-[8px] text-slate-400 uppercase tracking-widest mb-1 font-extrabold border-b border-slate-50 pb-1">
              Checkup: {label}
            </div>
            <div className="space-y-1">
              {activePayload.map((entry, idx) => {
                const curve = curves.find(c => c.dataKey === entry.name);
                let displayVal = entry.value;
                if (curve?.formatVal) {
                  displayVal = curve.formatVal(entry.value);
                } else {
                  displayVal = `${entry.value} ${curve?.unit || ""}`;
                }
                return (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                      <span className="text-slate-400">{entry.name}:</span>
                    </div>
                    <span className="text-slate-800 font-extrabold">{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      return null;
    };

    const hasAnyCurve = curves.some(c => c.isDiagnosed);

    return (
      <div className="w-full mt-2 relative">
        {!hasAnyCurve ? (
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl bg-slate-50/50 p-4 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">No Telemetry Logged</span>
            <p className="text-[9px] text-slate-400 font-medium max-w-[280px]">
              No heart rate, blood pressure, blood sugar, or sleep logs were recorded in this checkup.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="name" hide={true} />
              <YAxis
                domain={[0, 150]}
                ticks={[0, 25, 50, 75, 100, 125, 150]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fontWeight: 700, fill: "#94A3B8" }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#CBD5E1', strokeWidth: 1, strokeDasharray: '3 3' }}
                trigger="hover"
              />
              {curves.map((curve) => {
                if (!curve.isDiagnosed) return null;

                return (
                  <Line
                    key={curve.id}
                    type="monotone"
                    dataKey={curve.dataKey}
                    stroke={curve.color}
                    strokeWidth={1.8}
                    strokeDasharray="3 3.5"
                    dot={(dotProps) => {
                      const { cx, cy, index } = dotProps;
                      const isMainNode = index === timelineActiveIndex;

                      if (isMainNode) {
                        return (
                          <circle
                            key={index}
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={curve.color}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                        );
                      }
                      return null;
                    }}
                    activeDot={{
                      r: 5,
                      fill: curve.color,
                      stroke: "#ffffff",
                      strokeWidth: 1.5
                    }}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  // Helper component for Radial Gauge (needle and dot removed as per feedback 8)
  const RadialGauge = ({ value, min = 0, max = 150, unit = "" }) => {
    const ticks = 45;
    const radius = 65;
    const cx = 80;
    const cy = 80;
    
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const activeTicks = Math.round(percentage * ticks);

    const elements = [];
    for (let i = 0; i < ticks; i++) {
      const angleDegree = -210 + (i / (ticks - 1)) * 240;
      const angleRad = (angleDegree * Math.PI) / 180;
      
      const x1 = cx + (radius - 8) * Math.cos(angleRad);
      const y1 = cy + (radius - 8) * Math.sin(angleRad);
      const x2 = cx + radius * Math.cos(angleRad);
      const y2 = cy + radius * Math.sin(angleRad);
      
      const isActive = i <= activeTicks;
      elements.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isActive ? "#002A64" : "#F1F5F9"}
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    }

    return (
      <div className="relative w-48 h-36 mx-auto flex items-center justify-center">
        <svg viewBox="0 0 160 120" className="w-full h-full">
          {elements}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
          <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">{value}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{unit}</span>
        </div>
      </div>
    );
  };

  // Helper component for Radar Chart (Health System Summary - only shows diagnosed organ systems active)
  const RadarChart = ({ telemetry }) => {
    const cx = 175;
    const cy = 150;
    const radius = 75;

    const axes = [
      { name: "Liver Health", val: telemetry.liver, angle: -Math.PI / 2, anchor: "middle" },
      { name: "Kidney Health", val: telemetry.kidney, angle: -Math.PI / 4, anchor: "start" },
      { name: "Heart Health", val: telemetry.heart, angle: 0, anchor: "start" },
      { name: "Cellular Health", val: telemetry.cellular, angle: Math.PI / 4, anchor: "start" },
      { name: "Hormonal Balance", val: telemetry.hormonal, angle: Math.PI / 2, anchor: "middle" },
      { name: "Immune Health", val: telemetry.immune, angle: 3 * Math.PI / 4, anchor: "end" },
      { name: "Digestive Health", val: telemetry.digestive, angle: Math.PI, anchor: "end" },
      { name: "Inflammation", val: telemetry.inflammation, angle: -3 * Math.PI / 4, anchor: "end" },
    ].map(a => {
      const isDiagnosed = diagnosed.activeAxes.includes(a.name);
      return { ...a, isDiagnosed };
    });

    // Concentric circle background grids
    const gridCircles = [0.25, 0.5, 0.75, 1].map((ratio, idx) => (
      <circle
        key={idx}
        cx={cx}
        cy={cy}
        r={radius * ratio}
        fill="none"
        stroke="#F1F5F9"
        strokeWidth="1.2"
        strokeDasharray={idx === 3 ? "none" : "2 2"}
      />
    ));

    // Radial lines
    const radialLines = axes.map((axis, idx) => {
      const x = cx + radius * Math.cos(axis.angle);
      const y = cy + radius * Math.sin(axis.angle);
      const strokeColor = axis.isDiagnosed ? "#F1F5F9" : "#F8FAFC"; // soften undiagnosed grid lines
      return (
        <line
          key={idx}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke={strokeColor}
          strokeWidth="1.2"
        />
      );
    });

    // Calculate points for active report data polygon (undiagnosed axes pull to center/0 value)
    const activePoints = axes.map((axis) => {
      const axisVal = axis.isDiagnosed ? axis.val : 5; // pull inward if not diagnosed
      const r = radius * (axisVal / 100);
      const px = cx + r * Math.cos(axis.angle);
      const py = cy + r * Math.sin(axis.angle);
      return `${px},${py}`;
    });

    const activePointsString = activePoints.join(" ");

    // Calculate label coordinates
    const labelOffset = 22;
    const labels = axes.map((axis, idx) => {
      const lx = cx + (radius + labelOffset) * Math.cos(axis.angle);
      let ly = cy + (radius + labelOffset) * Math.sin(axis.angle);
      
      if (idx === 0) ly -= 5;
      if (idx === 4) ly += 8;

      const fillStyleClass = axis.isDiagnosed ? "fill-slate-500 font-bold opacity-100" : "fill-slate-300 font-medium opacity-40";
      const valueStyleClass = axis.isDiagnosed ? "fill-[#002A64] font-black" : "fill-slate-300 font-medium";

      return (
        <text
          key={idx}
          x={lx}
          y={ly}
          textAnchor={axis.anchor}
          className={`text-[9px] select-none tracking-wide ${fillStyleClass}`}
        >
          {axis.name}
          <tspan x={lx} dy="12" className={`${valueStyleClass} text-[10px] block mt-0.5`}>
            {axis.isDiagnosed ? `${axis.val}%` : "--"}
          </tspan>
        </text>
      );
    });

    return (
      <div className="w-full h-80 flex items-center justify-center relative">
        <svg viewBox="0 0 350 300" className="w-full h-full overflow-visible">
          {/* Background Grids */}
          {gridCircles}
          {radialLines}

          {/* Highlighted Radar Polygon */}
          <polygon
            points={activePointsString}
            fill="rgba(0, 42, 100, 0.07)"
            stroke="#002A64"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertices Dots (Only draw active vertices) */}
          {axes.map((axis, idx) => {
            if (!axis.isDiagnosed) return null;
            const r = radius * (axis.val / 100);
            const px = cx + r * Math.cos(axis.angle);
            const py = cy + r * Math.sin(axis.angle);
            return (
              <circle
                key={idx}
                cx={px}
                cy={py}
                r="3.5"
                fill="#002A64"
                stroke="#ffffff"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Labels overlay */}
          {labels}
        </svg>
      </div>
    );
  };

  // Test Analytics Tab Configs
  const getTabMetricConfig = () => {
    switch (activeTab) {
      case "Weight":
        return { value: telemetry.weightValue, min: 0, max: 120, unit: "kg" };
      case "Hemoglobin":
        return { value: telemetry.hemoglobinValue, min: 0, max: 20, unit: "g/dL" };
      case "Blood Pressure":
        return { value: telemetry.bpSystolic, min: 0, max: 200, unit: "mmHg" };
      case "PRQ":
        return { value: telemetry.prqValue, min: 0, max: 120, unit: "bpm" };
      case "All":
      default:
        return { value: telemetry.hrValue, min: 0, max: 120, unit: "bpm" };
    }
  };

  const metricConfig = getTabMetricConfig();

  // Format month and year of active log for dropdown display
  const activeReportMonthYear = activeReport
    ? new Date(activeReport.date).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "Feb 2025";

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-700 antialiased pb-20 pt-8">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-[#002A64] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Analytics...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-md font-bold text-slate-900 mb-1">Failed to Connect Database</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">{error}</p>
            <button 
              onClick={fetchHistory}
              className="px-5 py-2.5 bg-[#002A64] hover:bg-[#001D45] text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Retry Sync
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white border border-[#F1F5F9] rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
            <Activity className="w-14 h-14 text-slate-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-black text-slate-900 mb-1.5">No Health Records Found</h3>
            <p className="text-xs text-slate-400 font-semibold mb-6 leading-relaxed max-w-xs mx-auto">
              Diagnostic data and body telemetry logs will appear here once you execute your first symptoms analysis report.
            </p>
            <Link 
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#002A64] hover:bg-[#001D45] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
            >
              Analyze Symptoms
            </Link>
          </div>
        ) : (
          <div>
            {/* Top Header Row (Selectors aligned to the right as per feedback 5 & 6) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              {/* Left: Page Title */}
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-500" />
                  Healthcare Analytics
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Clinical Diagnostic Logs</p>
              </div>

              {/* Right: Align selectors on right */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-[#F1F5F9] rounded-full px-4 py-2 shadow-sm">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="24H">24H</option>
                    <option value="7 Days">7 Days</option>
                    <option value="30 Days">30 Days</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white border border-[#F1F5F9] rounded-full px-4 py-2 shadow-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <select
                    value={activeReportIndex !== null ? activeReportIndex : ""}
                    onChange={(e) => setActiveReportIndex(Number(e.target.value))}
                    className="bg-transparent text-slate-700 font-bold text-xs focus:outline-none cursor-pointer max-w-[220px]"
                  >
                    {history.map((item, idx) => (
                      <option key={idx} value={idx}>
                        {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* LEFT COLUMN: Recovery Tracker, Test Analytics, and Metrics Peaks/Current */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-8 flex flex-col">
                
                {/* Recovery Tracker Card (as per newest feedback 1 & 2) */}
                <div className="bg-white border border-[#F1F5F9] rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-blue-50 rounded-xl text-blue-600"><Activity className="w-4 h-4" /></span>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recovery Tracker</h3>
                      </div>
                      
                      {/* Dropdown selector displaying month/year of active log (made functional) */}
                      <div className="relative flex items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm hover:border-slate-300 transition-colors">
                        <span className="text-[10px] font-bold text-slate-600 mr-1.5 select-none">{activeReportMonthYear}</span>
                        <select
                          value={activeReportIndex !== null ? activeReportIndex : ""}
                          onChange={(e) => setActiveReportIndex(Number(e.target.value))}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        >
                          {history.map((item, idx) => (
                            <option key={idx} value={idx}>
                              {new Date(item.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                            </option>
                          ))}
                        </select>
                        <svg className="w-3 h-3 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dynamic Recovery Tracker Chart */}
                  <RecoveryTrackerChart curveData={curveData} activeIndex={activeReportIndex} />

                  {/* Dynamic color mark legend explains meaning of each metric line */}
                  <div className="flex flex-wrap items-center justify-start gap-6 border-t border-slate-100 pt-4 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">
                    {[
                      { id: "Heart Rate", color: "#EF4444" },
                      { id: "Blood Pressure", color: "#3B82F6" },
                      { id: "Blood Sugar", color: "#A855F7" },
                      { id: "Sleep Log", color: "#F97316" }
                    ].map((item, idx) => {
                      const isDiagnosed = diagnosed.activeCurves.includes(item.id);
                      if (!isDiagnosed) return null;
                      return (
                        <span key={idx} className="flex items-center gap-1.5 transition-opacity duration-300">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                          <span>{item.id}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Body Metrics Analysis Card */}
                <div className="bg-white border border-[#F1F5F9] rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between min-h-[380px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-blue-50 rounded-xl text-blue-500"><Activity className="w-4 h-4" /></span>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Test Analytics</h3>
                      </div>
                    </div>

                    {/* Metric tabs (displays only relevant diagnosed metrics) */}
                    {diagnosed.activeTabs.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl bg-slate-50/50 p-4 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">No Test Metrics Logged</span>
                        <p className="text-[9px] text-slate-400 font-medium max-w-[280px]">
                          No body weight, hemoglobin, blood pressure, or respiration metrics were logged in this checkup.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
                          {diagnosed.activeTabs.map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                activeTab === tab 
                                  ? "bg-[#002A64] text-white border-[#002A64] shadow-sm" 
                                  : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100 hover:text-slate-700"
                              }`}
                            >
                              {tab === "All" ? "Heart Rate" : tab}
                            </button>
                          ))}
                        </div>

                        {/* Radial gauge (needle and dot removed as per feedback 8) */}
                        <div className="py-2">
                          <RadialGauge value={metricConfig.value} min={metricConfig.min} max={metricConfig.max} unit={metricConfig.unit} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dynamic diagnosis overview & stats border-t footer section removed as per feedback 9 */}
                </div>

                {/* Metrics Peaks & Current Levels Card */}
                <div className="bg-white border border-[#F1F5F9] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                    <span className="p-2 bg-blue-50 rounded-xl text-[#002A64]"><Activity className="w-4 h-4" /></span>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historical Peaks & Current Levels</h3>
                  </div>

                  {Object.values(peaks).every(v => v === null) ? (
                    <p className="text-[10px] text-slate-400 font-medium py-4 text-center">No telemetry metrics have been diagnosed in your clinical logs yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Heart Rate */}
                      {peaks.maxHR !== null && (
                        <div className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#F8FAFC] hover:border-slate-100 rounded-xl transition-all flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Heart Rate</span>
                            <span className="text-xs font-extrabold text-slate-800 block">Current: {telemetry.hrValue ? `${telemetry.hrValue} bpm` : "--"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider bg-red-50/50 border border-red-100 rounded-md px-1.5 py-0.5 block mb-1">Peak</span>
                            <span className="text-xs font-black text-red-600">{peaks.maxHR} bpm</span>
                          </div>
                        </div>
                      )}

                      {/* Blood Pressure */}
                      {peaks.maxBPSystolic !== null && (
                        <div className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#F8FAFC] hover:border-slate-100 rounded-xl transition-all flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Blood Pressure</span>
                            <span className="text-xs font-extrabold text-slate-800 block">Current: {telemetry.bpDiagnosed ? `${telemetry.bpSystolic}/${telemetry.bpDiastolic}` : "--"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-extrabold text-blue-500 uppercase tracking-wider bg-blue-50/50 border border-blue-100 rounded-md px-1.5 py-0.5 block mb-1">Peak</span>
                            <span className="text-xs font-black text-blue-600">{peaks.maxBPSystolic}/{peaks.maxBPDiastolic}</span>
                          </div>
                        </div>
                      )}

                      {/* Blood Sugar */}
                      {peaks.maxSugar !== null && (
                        <div className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#F8FAFC] hover:border-slate-100 rounded-xl transition-all flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Blood Sugar</span>
                            <span className="text-xs font-extrabold text-slate-800 block">Current: {telemetry.sugarValueDiagnosed ? `${telemetry.sugarValue} mg/dL` : "--"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-extrabold text-purple-500 uppercase tracking-wider bg-purple-50/50 border border-purple-100 rounded-md px-1.5 py-0.5 block mb-1">Peak</span>
                            <span className="text-xs font-black text-purple-600">{peaks.maxSugar} mg/dL</span>
                          </div>
                        </div>
                      )}

                      {/* Sleep Log */}
                      {peaks.maxSleep !== null && (
                        <div className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#F8FAFC] hover:border-slate-100 rounded-xl transition-all flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Sleep Log</span>
                            <span className="text-xs font-extrabold text-slate-800 block">Current: {telemetry.sleepHoursDiagnosed ? `${telemetry.sleepHours.toFixed(1)} hrs` : "--"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-extrabold text-orange-500 uppercase tracking-wider bg-orange-50/50 border border-orange-100 rounded-md px-1.5 py-0.5 block mb-1">Peak</span>
                            <span className="text-xs font-black text-orange-600">{peaks.maxSleep.toFixed(1)} hrs</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: Health System Summary Radar Chart & Active Diagnoses Registry */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-8">
                
                {/* Health System Summary Card */}
                <div className="bg-white border border-[#F1F5F9] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Card Header (Info icon removed as per feedback 5) */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-slate-50 rounded-xl text-[#002A64]"><Activity className="w-4 h-4" /></span>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Health System Summary</h3>
                      </div>
                    </div>

                    <div className="px-1 text-center sm:text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">AI estimated health score</span>
                    </div>

                    {/* SVG Radar Chart (displays only active diagnosed systems) */}
                    <div className="flex items-center justify-center py-4">
                      <RadarChart telemetry={telemetry} />
                    </div>

                    {/* Card Footer notes */}
                    <div className="border-t border-slate-100 pt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Physiological diagnostics parsed dynamically from active report
                    </div>
                  </div>
                </div>

                {/* Diagnosed Conditions Registry Card */}
                <div className="bg-white border border-[#F1F5F9] rounded-2xl p-6 shadow-sm">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                      <span className="p-2 bg-blue-50 rounded-xl text-[#002A64]"><Activity className="w-4 h-4" /></span>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Diagnoses Registry</h3>
                    </div>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {diagnosedConditions.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-medium py-4 text-center">No conditions diagnosed yet.</p>
                      ) : (
                        diagnosedConditions.map((cond, idx) => {
                          const isHigh = cond.severity?.toLowerCase() === "high";
                          const isMod = cond.severity?.toLowerCase() === "moderate";
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 border border-[#F8FAFC] hover:border-slate-100 rounded-xl transition-all">
                              <div className="space-y-1">
                                <span className="text-xs font-extrabold text-slate-800 block leading-tight">{cond.name}</span>
                                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">
                                  First diagnosed: {cond.firstDiagnosed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                              
                              <div className="flex flex-col items-end gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wide border ${
                                  isHigh 
                                    ? "bg-red-50 text-red-600 border-red-100" 
                                    : isMod 
                                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                                    : "bg-green-50 text-green-600 border-green-100"
                                }`}>
                                  {cond.severity}
                                </span>
                                {cond.count > 1 && (
                                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    Logged {cond.count}x
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HistoryPage;
