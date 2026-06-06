import { useState, useRef, useEffect } from "react";
import { Paperclip, Send, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDiagnosis } from '../App.jsx';
import Tesseract from "tesseract.js";
import Cookies from "js-cookie";

const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const HeroInputPage = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { setDiagnosis} = useDiagnosis();
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); 
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [attachedReportText, setAttachedReportText] = useState(null);
  const [attachedFileName, setAttachedFileName] = useState(null);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setIsExtracting(true);
      setOcrProgress(0);
      try {
        const { data: { text } } = await Tesseract.recognize(
          file,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100));
              }
            }
          }
        );
        if (text && text.trim() !== '') {
          setAttachedReportText(text);
          setAttachedFileName(file.name);
        } else {
          alert("Could not detect any clear text in the image. Please verify quality.");
        }
      } catch (err) {
        console.error("OCR Error:", err);
        alert("Failed to extract text from the report image.");
      } finally {
        setIsExtracting(false);
      }
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setAttachedReportText(text);
        setAttachedFileName(file.name);
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      setIsExtracting(true);
      setOcrProgress(0);
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          setOcrProgress(Math.round((i / pdf.numPages) * 100));
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += `[Page ${i}]:\n${pageText}\n\n`;
        }

        if (fullText.trim() !== '') {
          setAttachedReportText(fullText.trim());
          setAttachedFileName(file.name);
        } else {
          alert("Could not extract any selectable text from the PDF. Is it a scanned image PDF?");
        }
      } catch (err) {
        console.error("PDF Extraction Error:", err);
        alert("Failed to extract text from the PDF file.");
      } finally {
        setIsExtracting(false);
      }
    } else {
      alert("Unsupported file type. Please attach a PNG, JPG, TXT, or PDF file.");
    }
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (value.trim() === "" && !attachedReportText) return;

    try {
      const combinedSymptoms = value.trim() + (attachedReportText ? `\n\n[Extracted Medical Report Text]:\n${attachedReportText}` : "");
      const payload = {
        symptoms: combinedSymptoms,
        ...(userLocation && {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }),
      };
      
      // Clear input and attachments first
      setValue("");
      setAttachedReportText(null);
      setAttachedFileName(null);
      
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

      // Save to user history if logged in
      const token = Cookies.get('token');
      if (token && result.condition) {
        fetch("http://localhost:3001/api/user/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          },
          body: JSON.stringify({
            symptoms: payload.symptoms,
            condition: result.condition,
            severity: result.severity,
            specialty: result.specialty,
            suggestion: result.suggestion,
            nearby: result.nearby
          }),
        }).catch(err => console.error("Failed to save diagnosis to history:", err));
      }
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

        {isExtracting && (
          <div className="mb-2 flex items-center gap-2 text-xs text-blue-600 px-2 bg-blue-50 py-1.5 rounded-lg border border-blue-100 animate-pulse">
            <div className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            <span>Extracting text from report... {ocrProgress}%</span>
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
              placeholder="Describe your symptoms or upload a medical report image..."
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

          {attachedFileName && (
            <div className="flex items-center justify-between mx-4 my-2 px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-800">
              <div className="flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-sky-500 animate-bounce" />
                <span className="font-semibold truncate max-w-[280px]">{attachedFileName}</span>
              </div>
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachedReportText(null);
                  setAttachedFileName(null);
                }} 
                className="text-sky-600 hover:text-sky-800 font-bold ml-2 focus:outline-none text-sm"
                title="Remove file"
              >
                ✕
              </button>
            </div>
          )}

          <div className="h-12 bg-gray-100 rounded-b-xl relative">
            <div className="absolute left-3 bottom-3 flex items-center gap-2">
              <label className={`cursor-pointer rounded-lg p-2 bg-gray-200 hover:bg-gray-300 transition-colors ${isExtracting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="file" 
                  accept="image/*,text/plain,application/pdf" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={isExtracting}
                />
                <Paperclip className={`w-4 h-4 text-gray-500 ${isExtracting ? 'animate-pulse' : ''}`} />
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
                disabled={!value.trim() && !attachedReportText}
                className={`rounded-lg p-2 transition-colors ${
                  (value.trim() || attachedReportText)
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