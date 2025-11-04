import { Link } from 'react-router-dom';
import { useAuth } from '../../App'; 

const Navbar = () => {
  const { isAuthenticated, name } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link to="/" className="text-xl font-bold text-gray-800">
            <img src="src/assets/Logo.svg" alt="" />
          </Link>

          
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>

            {isAuthenticated ? (
              <>
               
                <Link 
                  to="/logout" 
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Logout
                </Link>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-2 border border-gray-800 text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;