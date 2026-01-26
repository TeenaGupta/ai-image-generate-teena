interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
}

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await fetch('http://localhost:8000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  // Store email in localStorage when login is successful
  localStorage.setItem('userEmail', data.email);
  return response.json();
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await fetch('http://localhost:8000/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  // Store email in localStorage when registration is successful
  localStorage.setItem('userEmail', data.email);
  return response.json();
};

export const setAuthToken = (token: string, username: string) => {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('username', username);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  localStorage.removeItem('userEmail');
};

export const getUsername = (): string | null => {
  return localStorage.getItem('username');
};

export const getUserEmail = (): string | null => {
  return localStorage.getItem('userEmail');
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
