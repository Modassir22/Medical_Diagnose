import { useState, useRef, useEffect } from "react";
import { Paperclip, Send, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDiagnosis } from '../App.jsx';

const HeroInputPage = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { setDiagnosis} = useDiagnosis();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); 
  const textareaRef = useRef(null);

 
  useEffect(() => {
    fetchLocation();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [value]);

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      console.error("Geolocation is not supported by your browser");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("success");
        console.log("Location fetched:", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        setLocationStatus("error");
        console.error("Error fetching location:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, 
      }
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (value.trim() === "") return;

    try {
      const payload = {
        symptoms: value.trim(),
        ...(userLocation && {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }),
      };
      
      // Clear input first
      setValue("");
      
      // Only clear diagnosis data and navigate if NOT already on details page
      const isOnDetailsPage = location.pathname === '/details';
      
      if (!isOnDetailsPage) {
        // If on home page, navigate first then clear (shows loading state)
        navigate('/details', {replace: true});
        setDiagnosis(null);
      } else {
        // If already on details page, clear immediately (shows loading state)
        setDiagnosis(null);
      }
      
      // Then fetch new diagnosis
      const response = await fetch("http://localhost:5000/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setDiagnosis(result);
    } catch (error) {
      console.error("Error in submitting the symptoms:", error);
    }
  };

  const handleContainerClick = () => {
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="w-full py-4 flex justify-center mt-10">
      <div className="relative max-w-xl w-full mx-auto">
        {locationStatus !== "idle" && (
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-600 px-2">
            <MapPin className="w-3 h-3" />
            {locationStatus === "loading" && "Fetching your location..."}
            {locationStatus === "success" && (
              <span className="text-green-600">
                Location detected ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
              </span>
            )}
            {locationStatus === "error" && (
              <span className="text-amber-600">
                Location unavailable - will search without location data
              </span>
            )}
          </div>
        )}

        <div
          role="textbox"
          tabIndex={0}
          aria-label="Search input container"
          className={`relative flex flex-col rounded-xl transition-all duration-200 w-full text-left cursor-text border ${
            isFocused ? "border-gray-400" : "border-gray-300"
          }`}
          onClick={handleContainerClick}
        >
          <div className="overflow-y-auto max-h-[200px]">
            <textarea
              ref={textareaRef}
              value={value}
              placeholder="Describe your symptoms..."
              className="w-full rounded-xl rounded-b-none px-4 py-3 bg-gray-100 border-none outline-none resize-none leading-[1.2]"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="h-12 bg-gray-100 rounded-b-xl relative">
            <div className="absolute left-3 bottom-3 flex items-center gap-2">
              <label className="cursor-pointer rounded-lg p-2 bg-gray-200 hover:bg-gray-300 transition-colors">
                <input type="file" className="hidden" />
                <Paperclip className="w-4 h-4 text-gray-500" />
              </label>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchLocation();
                }}
                className="rounded-lg p-2 bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Refresh location"
              >
                <MapPin
                  className={`w-4 h-4 ${
                    locationStatus === "success"
                      ? "text-green-600"
                      : locationStatus === "loading"
                      ? "text-blue-500 animate-pulse"
                      : "text-gray-500"
                  }`}
                />
              </button>
            </div>

            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!value.trim()}
                className={`rounded-lg p-2 transition-colors ${
                  value.trim()
                    ? "bg-sky-100 text-sky-500 hover:bg-sky-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroInputPage;