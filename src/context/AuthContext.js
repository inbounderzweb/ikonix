// src/context/AuthContext.js
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('authUser');
    return savedUser ? JSON.parse(savedUser) : null; // Fetch user from localStorage
  });

  const saveToken = (newToken) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  const saveUser = (newUser) => {
    if (newUser) {
      localStorage.setItem('authUser', JSON.stringify(newUser));  // Save user to localStorage
      setUser(newUser);  // Save user to context
    } else {
      localStorage.removeItem('authUser');  // Clear user data if logged out
      setUser(null);  // Clear user in context
    }
  };

  return (
    <AuthContext.Provider value={{ token, setToken: saveToken, user, setUser: saveUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);
