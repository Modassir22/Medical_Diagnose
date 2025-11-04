import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App'; 

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const url = 'http://localhost:3001/api/user/login';
        const response = await fetch(url, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData),
          credentials: "include"
        });
        
        const result = await response.json();
        if (result.token) {
          login(result.token);
          navigate('/');
        } else {
          setErrors({ 
            password: result.message || 'Login failed. Please try again.' 
          });
        }
      } catch (err) {
        console.log('Login Error:', err);
        setErrors({ 
          password: 'An error occurred. Please try again.' 
        });
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Please enter your username';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter a password';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#e8e4dc' }}>
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8" style={{ backgroundColor: '#f5f3ef' }}>
        <h1 className="text-2xl font-semibold text-center mb-8 text-gray-800">
          Sign In
        </h1>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-600">
                Username
              </label>
              {errors.username && (
                <span className="text-sm text-red-500">
                  {errors.username}
                </span>
              )}
            </div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{ 
                backgroundColor: '#e8e4dc',
                border: errors.username ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-600">
                Password
              </label>
              {errors.password && (
                <span className="text-sm text-red-500">
                  {errors.password}
                </span>
              )}
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{ 
                backgroundColor: '#e8e4dc',
                border: errors.password ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-gray-800 hover:text-gray-600 underline">
              Forgot password?
            </a>
          </div>

          <button
            onClick={(e) => handleSubmit(e)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all hover:bg-gray-50"
            style={{ 
              backgroundColor: '#ffffff',
              color: '#2c2c2c',
              border: '1px solid #d0d0d0'
            }}
          >
            SIGN IN
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>

          <p className="text-center text-sm text-gray-800">
            Don't have an account?{' '}
            <a href="/register" className="underline font-medium hover:text-gray-600">
              Create Account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;