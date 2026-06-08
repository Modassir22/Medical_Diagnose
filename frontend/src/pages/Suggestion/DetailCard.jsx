import React from "react";
import { Lightbulb, Stethoscope, Building2, Ambulance, MapPin, Phone, Pill, AlertCircle } from "lucide-react";
import { useDiagnosis } from "../../App";
import { useNavigate } from "react-router-dom";
import HeroInputPage from "../HeroInputPage";

const SkeletonCard = ({ span }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-5 flex flex-col justify-between ${span}`}>
    <div>
      <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse mb-4" />
      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
    </div>
    <div className="space-y-2 mt-3">
      <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
    </div>
  </div>
);

const SkeletonListCard = () => (
  <div className="bg-white rounded-2xl p-5 border border-gray-200">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
      <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
    </div>
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="bg-gray-50 p-3 rounded-xl">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, title, message }) => (
  <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-xs text-gray-500">{message}</p>
  </div>
);

const DetailCard = () => {
  const { diagnosisData } = useDiagnosis();
  const navigate = useNavigate();

  // State for interactive features
  const [showOptions, setShowOptions] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState(null); // 'doctors', 'hospitals', 'ambulance'
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchProgress, setSearchProgress] = React.useState(0);
  const [searchStatus, setSearchStatus] = React.useState("");

  const isLoading = !diagnosisData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <SkeletonCard span="lg:col-span-2" />
            <SkeletonCard span="lg:col-span-1" />
            <SkeletonCard span="lg:col-span-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SkeletonListCard />
            <SkeletonListCard />
          </div>
        </div>
        <div>
          <HeroInputPage/>
        </div>
      </div>
    );
  }

  const { suggestion, severity, nearby } = diagnosisData;

  const conditionMatch = suggestion.match(/You have (.+?) and it is/);
  const condition = conditionMatch ? conditionMatch[1] : "Health Condition";

  const getSeverityConfig = (sev) => {
    switch(sev) {
      case 'high': 
        return {
          color: 'text-red-600 bg-red-50 border-red-200',
          text: 'High Severity',
          advice: 'Seek immediate medical attention. Visit the nearest emergency facility.',
          icon: '🚨'
        };
      case 'moderate': 
        return {
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          text: 'Moderate Severity',
          advice: 'Consider consulting a doctor soon. Monitor your symptoms closely.',
          icon: '⚠️'
        };
      case 'low': 
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          text: 'Low Severity',
          advice: 'Rest and monitor symptoms. Seek medical help if condition worsens.',
          icon: '✓'
        };
      default: 
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          text: 'Unknown',
          advice: 'Please consult a healthcare professional.',
          icon: 'ℹ'
        };
    }
  };

  const severityConfig = getSeverityConfig(severity);

  const hasDoctors = nearby.doctors && nearby.doctors.length > 0;
  const hasHospitals = nearby.hospitals && nearby.hospitals.length > 0;
  const hasPharmacies = nearby.pharmacies && nearby.pharmacies.length > 0;
  const hasAmbulance = nearby.ambulance_services && nearby.ambulance_services.length > 0;
  const hasAnyNearbyData = hasDoctors || hasHospitals || hasPharmacies || hasAmbulance;

  const handleCardClick = () => {
    setShowOptions(prev => !prev);
    if (!showOptions) {
      // Clear category when opening to let them choose
      setActiveCategory(null);
      setIsSearching(false);
    } else {
      setActiveCategory(null);
      setIsSearching(false);
    }
  };

  const handleCategoryClick = (category) => {
    if (isSearching) return;
    setActiveCategory(category);
    setIsSearching(true);
    setSearchProgress(0);
    setSearchStatus("Initializing Search...");

    const statuses = [
      "Accessing location coordinates...",
      "Connecting to OpenStreetMap...",
      "Scanning regional medical logs...",
      "Filtering active specialties...",
      "Calculating distance proximities...",
      "Sorting by distance...",
      "Finalizing care options..."
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setSearchProgress(currentProgress);
      
      const statusIndex = Math.min(
        Math.floor((currentProgress / 100) * statuses.length),
        statuses.length - 1
      );
      setSearchStatus(statuses[statusIndex]);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSearching(false);
        }, 400);
      }
    }, 120);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          
          {/* AI Health Diagnosis Card - Clickable */}
          <div 
            onClick={handleCardClick}
            className={`md:col-span-3 bg-white rounded-2xl border p-6 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md select-none ${
              showOptions ? "border-emerald-500 ring-2 ring-emerald-50" : "border-gray-200 hover:border-emerald-400"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">AI Health Diagnosis</h3>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all duration-300 ${
                showOptions ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}>
                {showOptions ? "Care Panel Open" : "Click to Find Care →"}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">{suggestion}</p>
            
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Active Medical Feedback
              </span>
              <span className="font-semibold text-emerald-600 hover:text-emerald-700">
                {showOptions ? "Hide Care Panel" : "Click to find Doctors, Hospitals or Ambulance"}
              </span>
            </div>
          </div>

          {/* Severity Card */}
          <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Severity</h3>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${severityConfig.color} mb-3`}>
              <span>{severityConfig.icon}</span>
              <span>{severityConfig.text}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">{severityConfig.advice}</p>
          </div>

        </div>

        {/* Care Category Select Options */}
        {showOptions && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm transition-all duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h4 className="text-base font-bold text-gray-900">Choose Care Service to Locate</h4>
                <p className="text-xs text-gray-500 mt-1">Select a facility to scan for nearby services in your region.</p>
              </div>
              {activeCategory && !isSearching && (
                <button 
                  onClick={() => {
                    setActiveCategory(null);
                  }}
                  className="text-xs text-gray-500 hover:text-emerald-600 mt-2 md:mt-0 font-medium underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Doctor Option */}
              <div 
                onClick={() => handleCategoryClick('doctors')}
                className={`flex flex-col justify-between p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer select-none ${
                  activeCategory === 'doctors' 
                    ? "border-emerald-500 bg-emerald-50/50 shadow-sm" 
                    : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {nearby.doctors ? `${nearby.doctors.length} Found` : '0 found'}
                  </span>
                </div>
                <div className="mt-4">
                  <h5 className="font-bold text-gray-900 text-sm">Find Doctor</h5>
                  <p className="text-xs text-gray-500 mt-1">Specialists and practitioners matching your diagnosis.</p>
                </div>
              </div>

              {/* Hospital Option */}
              <div 
                onClick={() => handleCategoryClick('hospitals')}
                className={`flex flex-col justify-between p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer select-none ${
                  activeCategory === 'hospitals' 
                    ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-600">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {nearby.hospitals ? `${nearby.hospitals.length} Found` : '0 found'}
                  </span>
                </div>
                <div className="mt-4">
                  <h5 className="font-bold text-gray-900 text-sm">Find Hospital</h5>
                  <p className="text-xs text-gray-500 mt-1">Multi-specialty emergency clinics and medical centers.</p>
                </div>
              </div>

              {/* Ambulance Option */}
              <div 
                onClick={() => handleCategoryClick('ambulance')}
                className={`flex flex-col justify-between p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer select-none ${
                  activeCategory === 'ambulance' 
                    ? "border-red-500 bg-red-50/50 shadow-sm" 
                    : "border-gray-200 hover:border-red-300 hover:bg-gray-50/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600">
                    <Ambulance className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {nearby.ambulance_services ? `${nearby.ambulance_services.length} Found` : '0 found'}
                  </span>
                </div>
                <div className="mt-4">
                  <h5 className="font-bold text-gray-900 text-sm">Ambulance & Emergency</h5>
                  <p className="text-xs text-gray-500 mt-1">Fast emergency transport services and contact logs.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Scanning Loader State */}
        {showOptions && isSearching && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center shadow-sm min-h-[300px] mb-6 transition-all duration-300">
            <div className="relative w-28 h-28 flex items-center justify-center mb-6">
              {/* Outer Radiating Scan Circles */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-2 rounded-full border-2 border-emerald-500/30 animate-pulse"></div>
              
              {/* Central Pulsating Radar Icon */}
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                {activeCategory === 'doctors' && <Stethoscope className="w-10 h-10 animate-bounce text-emerald-600" />}
                {activeCategory === 'hospitals' && <Building2 className="w-10 h-10 animate-pulse text-blue-600" />}
                {activeCategory === 'ambulance' && <Ambulance className="w-10 h-10 animate-bounce text-red-600" />}
              </div>
            </div>
            
            <h4 className="text-lg font-bold text-gray-900">
              Locating Nearby {activeCategory === 'doctors' ? 'Doctors' : activeCategory === 'hospitals' ? 'Hospitals' : 'Emergency Services'}...
            </h4>
            <p className="text-xs text-emerald-600 font-semibold mt-1.5 animate-pulse min-h-[16px]">
              {searchStatus}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full max-w-md bg-gray-100 h-2.5 rounded-full overflow-hidden mt-6 border border-gray-200">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-150 ease-out" 
                style={{ width: `${searchProgress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500 font-bold mt-2">{searchProgress}%</span>
          </div>
        )}

        {/* Detailed Results Output */}
        {showOptions && !isSearching && activeCategory && (
          <div className="mb-6 transition-all duration-300">
            
            {/* Render Doctors */}
            {activeCategory === 'doctors' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-600" />
                  Doctors Nearby ({nearby.doctors ? nearby.doctors.length : 0})
                </h3>
                {hasDoctors ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nearby.doctors.map((doctor, idx) => (
                      <a
                        key={idx}
                        href={doctor.coordinates 
                          ? `https://www.google.com/maps/search/?api=1&query=${doctor.coordinates.lat},${doctor.coordinates.lon}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.name + ' ' + (doctor.location || ''))}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
                      >
                        <p className="font-semibold text-gray-900 text-sm mb-1">{doctor.name}</p>
                        <p className="text-xs text-emerald-700 font-bold mb-1">{doctor.specialty}</p>
                        {doctor.experience && doctor.experience !== "Not Available" && (
                          <p className="text-xs text-gray-500">Exp: {doctor.experience}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-3 border-t border-emerald-100/40 pt-2">
                          {doctor.distance && (
                            <div className="flex items-center gap-1 font-medium text-emerald-800">
                              <MapPin className="w-3 h-3 text-emerald-600" />
                              <span>{doctor.distance}</span>
                            </div>
                          )}
                          {doctor.location && !doctor.distance && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-500" />
                              <span>{doctor.location}</span>
                            </div>
                          )}
                          {doctor.phone && doctor.phone !== "Not Available" && (
                            <div className="flex items-center gap-1 font-medium text-emerald-800">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{doctor.phone}</span>
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Stethoscope}
                    title="No Doctors Found"
                    message="No matching specialists were found in your region. Check location permissions."
                  />
                )}
              </div>
            )}

            {/* Render Hospitals */}
            {activeCategory === 'hospitals' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Hospitals Nearby ({nearby.hospitals ? nearby.hospitals.length : 0})
                </h3>
                {hasHospitals ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nearby.hospitals.map((hospital, idx) => (
                      <a
                        key={idx}
                        href={hospital.coordinates 
                          ? `https://www.google.com/maps/search/?api=1&query=${hospital.coordinates.lat},${hospital.coordinates.lon}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + (hospital.address || ''))}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-blue-50/50 p-4 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
                      >
                        <p className="font-semibold text-gray-900 text-sm mb-1">{hospital.name}</p>
                        <div className="space-y-1 mt-2">
                          {hospital.address && hospital.address !== "Not Available" && (
                            <div className="flex items-start gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
                              <span className="line-clamp-2">{hospital.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-xs pt-2 border-t border-blue-100/40">
                            <span className="font-bold text-blue-700">{hospital.distance}</span>
                            {hospital.phone && hospital.phone !== "Not Available" && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="w-3 h-3 text-blue-500" />
                                <span>{hospital.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Building2}
                    title="No Hospitals Found"
                    message="No healthcare facilities or emergency clinics found in your immediate coordinates."
                  />
                )}
              </div>
            )}

            {/* Render Ambulance */}
            {activeCategory === 'ambulance' && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Ambulance className="w-5 h-5 text-red-600" />
                  Emergency Services ({nearby.ambulance_services ? nearby.ambulance_services.length : 0})
                </h3>
                {hasAmbulance ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {nearby.ambulance_services.map((service, idx) => (
                      <a
                        key={idx}
                        href={service.coordinates 
                          ? `https://www.google.com/maps/search/?api=1&query=${service.coordinates.lat},${service.coordinates.lon}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name + ' ' + (service.address || ''))}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-red-50/50 p-4 rounded-xl border border-red-100 hover:border-red-300 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
                      >
                        <p className="font-semibold text-gray-900 text-sm mb-1">{service.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-3 pt-2 border-t border-red-100/40">
                          <div className="flex items-center gap-1 font-medium text-red-800">
                            <MapPin className="w-3 h-3 text-red-500" />
                            <span>{service.distance}</span>
                          </div>
                          {service.phone && service.phone !== "Not Available" && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-red-500" />
                              <span className="font-bold text-red-600">{service.phone}</span>
                            </div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Ambulance}
                    title="No Emergency Transport Found"
                    message="No direct ambulance listings found. Dial local national emergency numbers in urgent crises."
                  />
                )}
              </div>
            )}

          </div>
        )}

      </div>
      <div>
        <HeroInputPage/>
      </div>
    </div>
  );
};

export default DetailCard;