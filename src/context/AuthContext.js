// src/context/AuthContext.js
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(
    () => localStorage.getItem('authToken') || ''
  );
  const [user, setUserState] = useState(() => {
    const u = localStorage.getItem('authUser');
    return u ? JSON.parse(u) : null;
  });

  // NEW: flag for when our token has been validated/fetched
  const [isTokenReady, setIsTokenReady] = useState(false);

  const setToken = (t) => {
    if (t) localStorage.setItem('authToken', t);
    else  localStorage.removeItem('authToken');
    setTokenState(t);
  };

  const setUser = (u) => {
    if (u) localStorage.setItem('authUser', JSON.stringify(u));
    else  localStorage.removeItem('authUser');
    setUserState(u);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setToken,
        setUser,
        // ← expose these so ValidateOnLoad and ProductList can use them:
        isTokenReady,
        setIsTokenReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
