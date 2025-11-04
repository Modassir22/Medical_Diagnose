import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App'; // Adjust path as needed

const LogoutPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  }, [logout, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Logging you out...
        </h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
      </div>
    </div>
  );
};

export default LogoutPage;