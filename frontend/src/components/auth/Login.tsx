import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, setAuthToken } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { setIsAuth, setUsername: setContextUsername } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const { access_token, username } = await login(formData);
      setAuthToken(access_token, username);
      setIsAuth(true);
      setContextUsername(username);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1b2e]">
      <div className="max-w-md w-full m-4 p-8 bg-[#242538] rounded-xl shadow-xl space-y-6 border border-[#383a5c]">
        <div className="text-center">
          <Link to="/" className="inline-block mb-6">
            <h1 className="text-2xl font-semibold text-white hover:text-[#6366f1] transition-colors">
              Imagix AI
            </h1>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-[#8e8fb5]">Sign in to continue to Imagix AI</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#8e8fb5] mb-1">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                className="appearance-none block w-full px-3 py-2.5 border border-[#383a5c] rounded-lg text-white placeholder-[#8e8fb5] bg-[#2a2c42] focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent transition-all duration-200"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#8e8fb5] mb-1">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="appearance-none block w-full px-3 py-2.5 border border-[#383a5c] rounded-lg text-white placeholder-[#8e8fb5] bg-[#2a2c42] focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent transition-all duration-200"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#6366f1] hover:bg-[#4f46e5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6366f1] transition-all duration-200 shadow-sm"
            >
              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
        <div className="text-center text-white">
          <span>Don't have an account? </span>
          <Link to="/register" className="text-[#6366f1] hover:text-[#4f46e5] font-bold transition-colors duration-200">
             Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
