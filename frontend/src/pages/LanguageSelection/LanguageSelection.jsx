import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, ArrowRight } from 'lucide-react';

const LanguageSelection = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  const languages = [
    {
      code: 'en',
      name: 'English',
      flag: '🇬🇧',
      nativeName: 'English'
    },
    {
      code: 'hi',
      name: 'Hindi',
      flag: '🇮🇳',
      nativeName: 'हिंदी'
    }
  ];

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    // Navigate to expert call with language parameter
    navigate(`/expert-call?lang=${langCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Languages className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Select Language</h2>
          <p className="text-gray-600">Choose your preferred language for the medical consultation</p>
        </div>

        <div className="space-y-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                selectedLanguage === lang.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{lang.flag}</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">{lang.name}</p>
                  <p className="text-sm text-gray-600">{lang.nativeName}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            You can change the language during the call if needed
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;

