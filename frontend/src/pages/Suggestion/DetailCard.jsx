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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">AI Health Diagnosis</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{suggestion}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Severity</h3>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${severityConfig.color} mb-2`}>
              <span>{severityConfig.icon}</span>
              <span>{severityConfig.text}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mt-2">{severityConfig.advice}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nearby</h3>
            </div>
            {hasAnyNearbyData ? (
              <div className="space-y-2">
                {hasDoctors && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Doctors</span>
                    <span className="font-semibold text-emerald-600">{nearby.doctors.length}</span>
                  </div>
                )}
                {hasHospitals && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Hospitals</span>
                    <span className="font-semibold text-blue-600">{nearby.hospitals.length}</span>
                  </div>
                )}
                {hasPharmacies && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Pharmacies</span>
                    <span className="font-semibold text-purple-600">{nearby.pharmacies.length}</span>
                  </div>
                )}
                {hasAmbulance && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Emergency</span>
                    <span className="font-semibold text-red-600">{nearby.ambulance_services.length}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No nearby facilities found</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {hasDoctors && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-600" />
                Doctors Nearby ({nearby.doctors.length})
              </h3>
              <div className="space-y-2">
                {nearby.doctors.map((doctor, idx) => (
                  <a
                    key={idx}
                    href={doctor.coordinates 
                      ? `https://www.google.com/maps/search/?api=1&query=${doctor.coordinates.lat},${doctor.coordinates.lon}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.name + ' ' + (doctor.location || ''))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-emerald-50 p-3 rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1">{doctor.name}</p>
                    <p className="text-xs text-emerald-700 font-medium mb-1">{doctor.specialty}</p>
                    {doctor.experience && doctor.experience !== "Not Available" && (
                      <p className="text-xs text-gray-500">Exp: {doctor.experience}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-2">
                      {doctor.distance && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{doctor.distance}</span>
                        </div>
                      )}
                      {doctor.location && !doctor.distance && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{doctor.location}</span>
                        </div>
                      )}
                      {doctor.phone && doctor.phone !== "Not Available" && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{doctor.phone}</span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasHospitals && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Hospitals Nearby ({nearby.hospitals.length})
              </h3>
              <div className="space-y-2">
                {nearby.hospitals.map((hospital, idx) => (
                  <a
                    key={idx}
                    href={hospital.coordinates 
                      ? `https://www.google.com/maps/search/?api=1&query=${hospital.coordinates.lat},${hospital.coordinates.lon}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.name + ' ' + (hospital.address || ''))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-blue-50 p-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1">{hospital.name}</p>
                    <div className="space-y-1">
                      {hospital.address && hospital.address !== "Not Available" && (
                        <div className="flex items-start gap-1 text-xs text-gray-600">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{hospital.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium text-blue-600">{hospital.distance}</span>
                        {hospital.phone && hospital.phone !== "Not Available" && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{hospital.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasPharmacies && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-purple-600" />
                Pharmacies Nearby ({nearby.pharmacies.length})
              </h3>
              <div className="space-y-2">
                {nearby.pharmacies.map((pharmacy, idx) => (
                  <a
                    key={idx}
                    href={pharmacy.coordinates 
                      ? `https://www.google.com/maps/search/?api=1&query=${pharmacy.coordinates.lat},${pharmacy.coordinates.lon}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharmacy.name + ' ' + (pharmacy.address || ''))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-purple-50 p-3 rounded-xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1">{pharmacy.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium text-purple-600">{pharmacy.distance}</span>
                      </div>
                      {pharmacy.phone && pharmacy.phone !== "Not Available" && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{pharmacy.phone}</span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {hasAmbulance && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-red-600" />
                Emergency Services ({nearby.ambulance_services.length})
              </h3>
              <div className="space-y-2">
                {nearby.ambulance_services.map((service, idx) => (
                  <a
                    key={idx}
                    href={service.coordinates 
                      ? `https://www.google.com/maps/search/?api=1&query=${service.coordinates.lat},${service.coordinates.lon}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.name + ' ' + (service.address || ''))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-red-50 p-3 rounded-xl border border-red-100 hover:border-red-300 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <p className="font-semibold text-gray-900 text-sm mb-1">{service.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="font-medium text-red-600">{service.distance}</span>
                      </div>
                      {service.phone && service.phone !== "Not Available" && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span className="font-bold">{service.phone}</span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!hasAnyNearbyData && (
            <>
              <EmptyState 
                icon={Stethoscope}
                title="No Doctors Found"
                message="No doctors found in your area. Try expanding your search or check back later."
              />
              <EmptyState 
                icon={Building2}
                title="No Hospitals Found"
                message="No hospitals found in your area. Consider searching in a nearby city."
              />
            </>
          )}
        </div>
      </div>
      <div>
        <HeroInputPage/>
      </div>
    </div>
  );
};

export default DetailCard;