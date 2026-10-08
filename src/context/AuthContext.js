import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AUTH_EXPIRED_EVENT, isJwtExpired, clearStoredSession } from '../api/client';

const AuthContext = createContext();
const emptySession = () => ({ token: '', user: null });
const SESSION_KEYS = new Set(['authToken', 'authUser', 'authTokenTime']);

function readStoredSession() {
  const token = localStorage.getItem('authToken') || '';
  const rawUser = localStorage.getItem('authUser');

  if (!token || isJwtExpired(token)) {
    clearStoredSession();
    return emptySession();
  }

  try {
    const user = JSON.parse(rawUser);
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      clearStoredSession();
      return emptySession();
    }
    return { token, user };
  } catch {
    // Broken or incomplete browser storage must not leave a token attached to
    // requests while the UI treats the visitor as a guest.
    clearStoredSession();
    return emptySession();
  }
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(readStoredSession);
  const [isTokenReady, setIsTokenReady] = useState(false);

  useEffect(() => {
    const onExpired = () => setSessionState(emptySession());
    const onStorage = (event) => {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key === null || SESSION_KEYS.has(event.key)) {
        setSessionState(readStoredSession());
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    setIsTokenReady(true);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setSession = useCallback((token, user) => {
    if (!token || isJwtExpired(token) || !user || typeof user !== 'object' || Array.isArray(user)) {
      clearStoredSession();
      setSessionState(emptySession());
      return false;
    }

    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
    localStorage.setItem('authTokenTime', Date.now().toString());
    setSessionState({ token, user });
    return true;
  }, []);

  const setToken = useCallback((token) => {
    if (!token || isJwtExpired(token)) {
      clearStoredSession();
      setSessionState(emptySession());
      return;
    }
    localStorage.setItem('authToken', token);
    localStorage.setItem('authTokenTime', Date.now().toString());
    setSessionState((previous) => ({ ...previous, token }));
  }, []);

  const setUser = useCallback((user) => {
    if (!user) {
      clearStoredSession();
      setSessionState(emptySession());
      return;
    }
    localStorage.setItem('authUser', JSON.stringify(user));
    setSessionState((previous) => ({ ...previous, user }));
  }, []);

  // No refresh-token endpoint is configured here. Do not report a successful
  // refresh when no replacement credential has actually been issued.
  const refreshToken = useCallback(async () => false, []);

  return (
    <AuthContext.Provider
      value={{
        ...session,
        setToken,
        setUser,
        setSession,
        isTokenReady,
        setIsTokenReady,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
