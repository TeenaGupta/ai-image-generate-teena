import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAuthenticated, getUsername } from '../services/auth';

interface AuthContextType {
  isAuth: boolean;
  username: string | null;
  email: string | null;
  isLoading: boolean;
  setIsAuth: (value: boolean) => void;
  setUsername: (value: string | null) => void;
  setEmail: (value: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [username, setUsername] = useState<string | null>(getUsername());
  const [email, setEmail] = useState<string | null>(localStorage.getItem('userEmail'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status on mount and when localStorage changes
    const checkAuth = () => {
      setIsAuth(isAuthenticated());
      setUsername(getUsername());
      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail !== email) {
        setEmail(storedEmail);
      }
    };

    // Check auth status and set loading to false after check
    checkAuth();
    setIsLoading(false);

    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuth, 
      username, 
      email,
      isLoading, 
      setIsAuth, 
      setUsername,
      setEmail 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
