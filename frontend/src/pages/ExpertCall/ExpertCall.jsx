import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDiagnosis } from '../../App';
import { PhoneOff, Mic, MicOff, Pause, Home, Volume2, Languages } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserDoctor } from '@fortawesome/free-solid-svg-icons';

const ExpertCall = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setDiagnosis } = useDiagnosis();
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const lang = searchParams.get('lang');
    return lang === 'hi' ? 'hi' : 'en';
  });
  const [isQuestionSpeaking, setIsQuestionSpeaking] = useState(false);
  const [hasReceivedResponse, setHasReceivedResponse] = useState(false);
  
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // Use refs to avoid stale closures in callbacks
  const isCallActiveRef = useRef(isCallActive);
  const currentQuestionIndexRef = useRef(currentQuestionIndex);
  const isOnHoldRef = useRef(isOnHold);
  const isMutedRef = useRef(isMuted);
  const isQuestionSpeakingRef = useRef(isQuestionSpeaking);
  const hasReceivedResponseRef = useRef(hasReceivedResponse);
  const selectedLanguageRef = useRef(selectedLanguage);
  const conversationRef = useRef(conversation);
  const isListeningRef = useRef(isListening);
  
  // Keep refs in sync with state
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
    currentQuestionIndexRef.current = currentQuestionIndex;
    isOnHoldRef.current = isOnHold;
    isMutedRef.current = isMuted;
    isQuestionSpeakingRef.current = isQuestionSpeaking;
    hasReceivedResponseRef.current = hasReceivedResponse;
    selectedLanguageRef.current = selectedLanguage;
    conversationRef.current = conversation;
    isListeningRef.current = isListening;
  }, [isCallActive, currentQuestionIndex, isOnHold, isMuted, isQuestionSpeaking, hasReceivedResponse, selectedLanguage, conversation, isListening]);

  // AI Questions in Hindi and English - Memoized to prevent recreation
  const questions = useMemo(() => [
    {
      en: "Hello! I'm your medical assistant. What symptoms are you experiencing today?",
      hi: "हां जी! मैं आपका चिकित्सा सहायक हूं। आज आपको क्या लक्षण हैं?"
    },
    {
      en: "How long have you been experiencing these symptoms?",
      hi: "आपको ये लक्षण कब से हैं?"
    },
    {
      en: "Can you describe the severity of your symptoms? (mild, moderate, or severe)",
      hi: "कृपया अपने लक्षणों की गंभीरता बताएं? (हल्के, मध्यम, या गंभीर)"
    },
    {
      en: "Have you taken any medication for this condition?",
      hi: "क्या आपने इस स्थिति के लिए कोई दवा ली है?"
    },
    {
      en: "Do you have any pre-existing medical conditions or allergies?",
      hi: "क्या आपको कोई पहले से मौजूद चिकित्सा स्थिति या एलर्जी है?"
    },
    {
      en: "Is there anything else you'd like to tell me about your condition?",
      hi: "क्या आप अपनी स्थिति के बारे में कुछ और बताना चाहेंगे?"
    }
  ], []);

  // Function to stop the call completely
  const stopCallCompletely = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsCallActive(false);
    setIsListening(false);
    setIsQuestionSpeaking(false);
  }, []);

  const translateToEnglish = useCallback(async (text, fromLang) => {
    if (fromLang === 'en') return text;
    
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=en&dt=t&q=${encodeURIComponent(text)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const translated = data[0]?.[0]?.[0];
        if (translated && translated.trim() !== '') {
          return translated;
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      try {
        const fallbackResponse = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|en`
        );
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.responseData?.translatedText) {
            return fallbackData.responseData.translatedText;
          }
        }
      } catch (fallbackError) {
        console.error('Fallback translation error:', fallbackError);
      }
    }
    
    console.warn('Translation failed, using original text:', text);
    return text;
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current && !isOnHoldRef.current && !isMutedRef.current && isCallActiveRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
      }
    }
  }, []);

  const speakQuestion = useCallback((enText, hiText) => {
    if ('speechSynthesis' in window && !isMutedRef.current) {
      window.speechSynthesis.cancel();
      setIsQuestionSpeaking(true);
      
      const textToSpeak = selectedLanguageRef.current === 'hi' ? hiText : enText;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      
      utterance.rate = 0.85;
      utterance.pitch = 1.3;
      utterance.volume = 1;
      utterance.lang = selectedLanguageRef.current === 'hi' ? 'hi-IN' : 'en-US';
      
      const voices = window.speechSynthesis.getVoices();
      const targetLang = selectedLanguageRef.current === 'hi' ? 'hi' : 'en';
      
      const femaleVoice = voices.find(voice => {
        const voiceName = voice.name.toLowerCase();
        const voiceLang = voice.lang.toLowerCase();
        return (voiceLang.startsWith(targetLang) && 
                (voiceName.includes('female') || voiceName.includes('zira') || 
                 voiceName.includes('samantha') || voiceName.includes('karen') ||
                 voiceName.includes('susan') || voiceName.includes('veena') ||
                 voiceName.includes('hazel') || voiceName.includes('google uk english female')));
      });
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      } else {
        const langVoice = voices.find(voice => voice.lang.toLowerCase().startsWith(targetLang));
        if (langVoice) {
          utterance.voice = langVoice;
        }
      }
      
      utterance.onend = () => {
        setIsQuestionSpeaking(false);
        if (isCallActiveRef.current && !isOnHoldRef.current && currentQuestionIndexRef.current < questions.length) {
          setTimeout(() => startListening(), 500);
        }
      };

      utterance.onerror = () => {
        setIsQuestionSpeaking(false);
        if (isCallActiveRef.current && !isOnHoldRef.current && currentQuestionIndexRef.current < questions.length) {
          setTimeout(() => startListening(), 500);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else if (!isMutedRef.current && isCallActiveRef.current && !isOnHoldRef.current && currentQuestionIndexRef.current < questions.length) {
      setIsQuestionSpeaking(false);
      setTimeout(() => startListening(), 500);
    }
  }, [questions.length, startListening]);

  const handleVoiceResponse = useCallback(async (transcript) => {
    if (!transcript.trim()) {
      setTimeout(() => {
        if (isCallActiveRef.current && !isOnHoldRef.current && !isMutedRef.current) {
          startListening();
        }
      }, 1000);
      return;
    }

    stopListening();
    setHasReceivedResponse(true);

    const userMessage = {
      type: 'user',
      text: transcript,
      originalLanguage: selectedLanguageRef.current,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setConversation(prev => [...prev, userMessage]);

    if (currentQuestionIndexRef.current < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 1500);
    } else {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 1500);
    }
  }, [questions.length, startListening, stopListening]);

  const completeCall = useCallback(async () => {
    setIsLoading(true);
    stopListening();
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const conv = conversationRef.current;
      const translatedConversation = [];
      for (const msg of conv) {
        if (msg.type === 'ai') {
          translatedConversation.push(`AI: ${msg.en}`);
        } else {
          const translatedText = await translateToEnglish(msg.text, msg.originalLanguage || selectedLanguageRef.current);
          translatedConversation.push(`User: ${translatedText}`);
        }
      }

      const conversationText = translatedConversation.join('\n');

      let location = null;
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch (error) {
        console.log('Location not available');
      }

      const payload = {
        symptoms: conversationText,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude
        })
      };

      const response = await fetch('http://localhost:5000/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setDiagnosis(result);
      
      setIsCallActive(false);
      navigate('/details');
    } catch (error) {
      console.error('Error in submitting diagnosis:', error);
      alert('Error submitting diagnosis. Please try again.');
      setIsLoading(false);
    }
  }, [stopListening, navigate, setDiagnosis, translateToEnglish]);

  // Combined initialization useEffect
  useEffect(() => {
    // Language check
    const lang = searchParams.get('lang');
    if (!lang || (lang !== 'en' && lang !== 'hi')) {
      stopCallCompletely();
      navigate('/language-selection');
      return;
    }

    // Initialize Speech Recognition (only once)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceResponse(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && isCallActiveRef.current && currentQuestionIndexRef.current < questions.length) {
          setTimeout(() => {
            if (!isOnHoldRef.current && !isMutedRef.current) {
              startListening();
            }
          }, 2000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (!hasReceivedResponseRef.current && isCallActiveRef.current && 
            currentQuestionIndexRef.current < questions.length && 
            !isOnHoldRef.current && !isMutedRef.current && !isQuestionSpeakingRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isOnHoldRef.current && !isMutedRef.current && 
                currentQuestionIndexRef.current < questions.length) {
              startListening();
            }
          }, 1500);
        }
      };

      recognitionRef.current = recognition;
    }

    // Update recognition language when selectedLanguage changes
    if (recognitionRef.current && selectedLanguage) {
      recognitionRef.current.lang = selectedLanguage === 'hi' ? 'hi-IN' : 'en-US';
    }

    // Browser event listeners
    const handlePopState = () => stopCallCompletely();
    const handleBeforeUnload = () => stopCallCompletely();

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Load voices
    const loadVoices = () => {
      if (window.speechSynthesis.getVoices().length === 0) {
        setTimeout(() => window.speechSynthesis.getVoices(), 100);
      }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== loadVoices) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      stopCallCompletely();
    };
  }, [searchParams, navigate, selectedLanguage, handleVoiceResponse, startListening, questions.length, stopCallCompletely]);

  // Ask question when index changes
  useEffect(() => {
    setHasReceivedResponse(false);
    if (isCallActive && currentQuestionIndex < questions.length && !isOnHold) {
      const question = questions[currentQuestionIndex];
      const aiMessage = {
        type: 'ai',
        en: question.en,
        hi: question.hi,
        timestamp: new Date().toLocaleTimeString()
      };
      setConversation(prev => [...prev, aiMessage]);
      speakQuestion(question.en, question.hi);
    } else if (currentQuestionIndex >= questions.length && isCallActive) {
      completeCall();
    }
  }, [currentQuestionIndex, isCallActive, isOnHold, questions, speakQuestion, completeCall]);

  // Auto scroll chat - debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [conversation.length]);

  const handleStopCall = () => {
    stopCallCompletely();
    
    if (conversationRef.current.length > 0) {
      completeCall();
    } else {
      navigate('/');
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
    if (window.speechSynthesis) {
      if (!isMuted) {
        window.speechSynthesis.cancel();
        stopListening();
        setIsQuestionSpeaking(false);
      } else {
        if (currentQuestionIndex < questions.length && isCallActive && !isOnHold) {
          const question = questions[currentQuestionIndex];
          speakQuestion(question.en, question.hi);
        }
      }
    }
  };

  const handleHoldToggle = () => {
    setIsOnHold(prev => !prev);
    if (window.speechSynthesis) {
      if (isOnHold) {
        window.speechSynthesis.resume();
        if (currentQuestionIndex < questions.length && isCallActive && !isQuestionSpeaking) {
          setTimeout(() => startListening(), 500);
        } else if (isQuestionSpeaking) {
          setTimeout(() => {
            if (currentQuestionIndex < questions.length && isCallActive) {
              startListening();
            }
          }, 2000);
        }
      } else {
        window.speechSynthesis.pause();
        stopListening();
      }
    }
  };

  const handleLanguageToggle = () => {
    const newLang = selectedLanguage === 'en' ? 'hi' : 'en';
    setSelectedLanguage(newLang);
    
    stopListening();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsQuestionSpeaking(false);
    
    if (currentQuestionIndex < questions.length && isCallActive && !isOnHold) {
      const question = questions[currentQuestionIndex];
      speakQuestion(question.en, question.hi);
    }
  };

  const handleHome = () => {
    stopCallCompletely();
    navigate('/');
  };

  return (
    <div className="min-h-[90vh] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Main Content Area - Side by Side Layout */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full p-4 flex gap-4">
        {/* Main Call Interface */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg flex-1 flex flex-col overflow-hidden">
            {/* Main Display Area */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faUserDoctor} className="text-[#12BC53] text-5xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Goodwell</h2>
                
                {/* Voice Status Indicator */}
                {isCallActive && !isLoading && currentQuestionIndex < questions.length && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    {isListening ? (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <p className="text-gray-600 font-medium">Listening... Please speak your response</p>
                      </>
                    ) : isQuestionSpeaking ? (
                      <>
                        <div className="w-3 h-3 bg-[#12BC53] rounded-full animate-pulse"></div>
                        <p className="text-gray-600 font-medium">Question is being asked...</p>
                      </>
                    ) : (
                      <p className="text-gray-500">Waiting for question...</p>
                    )}
                  </div>
                )}
                
                {isLoading && (
                  <div className="mt-6">
                    <div className="bg-gray-100 rounded-2xl p-4">
                      <p className="text-gray-600">Processing your responses and translating...</p>
                    </div>
                  </div>
                )}
                
                {conversation.length === 0 && (
                  <div className="mt-6">
                    <Volume2 className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500">Connecting to medical expert...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Side Chat Panel */}
        <div className="w-96 bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
          <div className="bg-[#12BC53] text-white p-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FontAwesomeIcon icon={faUserDoctor} />
              Conversation
            </h3>
          </div>
          <div className="flex-1 overflow-y-scroll p-4 space-y-3">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 ${
                      msg.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.type === 'ai' ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={faUserDoctor} className="text-xs" />
                          <span className="text-xs font-semibold">Doctor</span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {selectedLanguage === 'hi' ? msg.hi : msg.en}
                        </p>
                        {selectedLanguage === 'hi' && (
                          <p className="text-xs opacity-70 italic">{msg.en}</p>
                        )}
                        {selectedLanguage === 'en' && (
                          <p className="text-xs opacity-70 italic">{msg.hi}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">You</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    )}
                    <span className={`text-xs mt-1 block ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-center">
                <div className="bg-gray-100 rounded-xl p-3">
                  <p className="text-sm text-gray-600">Processing...</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="bg-white shadow-lg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center gap-4">
            {/* Mute Button */}
            <button
              onClick={handleMuteToggle}
              className={`p-4 rounded-full transition-all ${
                isMuted
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Hold Button */}
            <button
              onClick={handleHoldToggle}
              className={`p-4 rounded-full transition-all ${
                isOnHold
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={isOnHold ? 'Resume' : 'Hold'}
            >
              <Pause size={24} />
            </button>

            {/* Language Toggle Button */}
            <button
              onClick={handleLanguageToggle}
              className={`p-4 rounded-full transition-all ${
                'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              title={`Switch to ${selectedLanguage === 'en' ? 'Hindi' : 'English'}`}
            >
              <Languages size={24} />
            </button>
            <span className="text-sm text-gray-600 font-medium">
              {selectedLanguage === 'en' ? 'EN' : 'HI'}
            </span>

            {/* Stop Call Button */}
            <button
              onClick={handleStopCall}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>

            {/* Home Button */}
            <button
              onClick={handleHome}
              className="p-4 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
              title="Go Home"
            >
              <Home size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertCall;
