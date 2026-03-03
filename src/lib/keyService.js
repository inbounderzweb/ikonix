import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureTokenReady } from '../api/client';

export default function ValidateOnLoad() {
  const { setToken } = useAuth();

  useEffect(() => {
    const checkToken = async () => {
      const token = await ensureTokenReady();
      if (token) setToken(token);
    };

    checkToken(); // Initial check

    // Check periodically, e.g., every 50 minutes.
    // ensureTokenReady will only fetch if actually expired.
    const interval = setInterval(checkToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [setToken]);

  return null;
}
