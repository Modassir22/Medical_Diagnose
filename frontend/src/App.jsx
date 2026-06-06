import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import './App.css'
import Home from './pages/HomePage/Home'
import PageNotFound from './PageNotFound'
import ProtectedRoute from './pages/AuthPage/ProtectedRoute'
import Register from './pages/AuthPage/Register'
import LoginPage from './pages/AuthPage/LoginPage'
import Cookies from 'js-cookie'
import LogoutPage from './pages/AuthPage/LogoutPage'
import Navbar from './pages/Layouts/Navbar'
import DetailCard from './pages/Suggestion/DetailCard'
import ExpertCall from './pages/ExpertCall/ExpertCall'
import HistoryPage from './pages/History/AnalysisPage'
import LanguageSelection from './pages/LanguageSelection/LanguageSelection'
import { Agentation } from 'agentation';


export const AuthContext = createContext();
export const DiagnosisContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useDiagnosis = () => {
  const context = useContext(DiagnosisContext);
  if (!context) {
    throw new Error('useDiagnosis must be used within DiagnisisProvider');
  }
  return context;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [name, setName] = useState('');


  useEffect(() => {
    const checkAuth = () => {
      const token = Cookies.get('token');
      const name = Cookies.get('name');

      setIsAuthenticated(!!token);
      setName(name || '');
    };

    checkAuth();
  }, []);

  const login = (token, name) => {
    setIsAuthenticated(true);
  };

  const setDiagnosis = (data) => {
    setDiagnosisData(data);
  }

  const logout = () => {
    Cookies.remove('token');
    Cookies.remove('name');
    setIsAuthenticated(false);
    setName('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, name, login, logout }}>
      <DiagnosisContext.Provider value={{ diagnosisData, setDiagnosis }}>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path='/greeting'
              element={
                <ProtectedRoute>
                  <h2 className='text-center text-3xl mt-20'>Hello, {name}!</h2>
                </ProtectedRoute>
              }
            />
            <Route path='/details' element={
              <ProtectedRoute>
                <DetailCard />
              </ProtectedRoute>
            } />
            <Route path='/analysis' element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/language-selection" element={
              <ProtectedRoute>
                <LanguageSelection />
              </ProtectedRoute>
            } />
            <Route path="/expert-call" element={
              <ProtectedRoute>
                <ExpertCall />
              </ProtectedRoute>
            } />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          {import.meta.env.DEV && <Agentation />}
        </Router>
      </DiagnosisContext.Provider>
    </AuthContext.Provider>
  )
}

export default App