
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(
    () => localStorage.getItem('authToken') || ''
  );
  const [user, setUserState] = useState(() => {
    const u = localStorage.getItem('authUser');
    return u ? JSON.parse(u) : null;
  });

  // flag for when token has been restored/fetched
  const [isTokenReady, setIsTokenReady] = useState(false);

  // Mark token as ready after initial state is loaded from localStorage
  useEffect(() => {
    setIsTokenReady(true);
  }, []);

  const setToken = (t) => {
    if (t) localStorage.setItem('authToken', t);
    else localStorage.removeItem('authToken');
    setTokenState(t);
  };

  const setUser = (u) => {
    if (u) localStorage.setItem('authUser', JSON.stringify(u));
    else localStorage.removeItem('authUser');
    setUserState(u);
  };

  const refreshToken = async () => {
    console.log('Attempting to refresh token...');
    // In a real application, this would involve an API call to your backend
    // For example:
    // try {
    //   const response = await fetch('/api/refresh-token', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       // You might send a refresh token here, or rely on a session cookie
    //       'Authorization': `Bearer ${ localStorage.getItem('refreshToken') } `
    //     },
    //   });
    //   const data = await response.json();
    //   if (response.ok && data.accessToken) {
    //     setToken(data.accessToken);
    //     // Optionally update user if new user data comes with refresh
    //     // setUser(data.user);
    //     console.log('Token refreshed successfully!');
    //     return true;
    //   } else {
    //     console.error('Failed to refresh token:', data.message || response.statusText);
    //     setToken(''); // Clear token on refresh failure
    //     setUser(null); // Clear user on refresh failure
    //     return false;
    //   }
    // } catch (error) {
    //   console.error('Error during token refresh:', error);
    //   setToken('');
    //   setUser(null);
    //   return false;
    // }

    // Placeholder for demonstration:
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    console.log('Token refresh simulated.');
    // If refresh was successful, you would call setToken and potentially setUser
    // setToken('new_refreshed_token');
    return true; // Indicate success
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setToken,
        setUser,
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

