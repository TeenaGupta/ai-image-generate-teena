import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ImageGenerator from './components/ImageGenerator';
import Profile from './components/Profile';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Header from './components/Header';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const AppRoutes: React.FC = () => {
  const { isAuth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1b2e] flex flex-col items-center justify-center z-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#383a5c] border-t-[#6366f1] rounded-full animate-spin"></div>
          <div className="w-16 h-16 border-4 border-[#383a5c] border-b-[#6366f1] rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <h2 className="text-white font-medium mt-6 text-lg">Loading...</h2>
        <p className="text-[#8e8fb5] mt-2">Please wait while we set things up</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<>
        <Header isAuth={isAuth} />
        <ImageGenerator />
      </>} />
      <Route path="/profile" element={<>
        <Header isAuth={isAuth} />
        <Profile />
      </>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
