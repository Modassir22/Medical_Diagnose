import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {

    const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    age: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(validateForm()) {
        try{
      const url = 'http://localhost:3001/api/user/register'
      const response = await fetch(url,{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:JSON.stringify(formData),
        credentials:"include",
      })
      const result = await response.json();
      console.log(result);
      navigate('/login', {replace:true});
    }catch(err){
        console.log("Register Error", err);
    }
    }
  }

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Please enter your username';
    }

    if (!formData.age.trim()) {
      newErrors.age = 'Please enter your age';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter a password';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#e8e4dc' }}>
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6" style={{ backgroundColor: '#f5f3ef' }}>
        <h1 className="text-xl font-semibold text-center mb-4 text-gray-800">
          Create Account
        </h1>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Name</label>
              {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="zaid"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.name ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Username</label>
              {errors.username && <span className="text-xs text-red-500">{errors.username}</span>}
            </div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="zaid12"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.username ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Age</label>
              {errors.age && <span className="text-xs text-red-500">{errors.age}</span>}
            </div>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="18"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.age ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="zaid@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.email ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.password ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
            {errors.password && <p className="text-xs mt-1 text-red-500">{errors.password}</p>}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block text-gray-600">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
              style={{
                backgroundColor: '#e8e4dc',
                border: errors.confirmPassword ? '1px solid #d9534f' : '1px solid transparent',
                color: '#2c2c2c'
              }}
            />
            {errors.confirmPassword && <p className="text-xs mt-1 text-red-500">{errors.confirmPassword}</p>}
          </div>
        </div>

        <button
          onClick={(e) => handleSubmit(e)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all hover:bg-gray-50 mt-4"
          style={{
            backgroundColor: '#ffffff',
            color: '#2c2c2c',
            border: '1px solid #d0d0d0'
          }}
        >
          CREATE ACCOUNT
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        <p className="text-center text-xs text-gray-800 mt-3">
          Already have an account?{' '}
          <a href="/login" className="underline font-medium hover:text-gray-600">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}

export default Register;