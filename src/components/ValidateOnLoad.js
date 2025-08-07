import { useEffect } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';

const VALIDATE_URL = 'https://ikonixperfumer.com/beta/api/validate';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function ValidateOnLoad() {
  const { setToken, setIsTokenReady } = useAuth();

  // Fetch a fresh token from your validate endpoint
  const fetchToken = async () => {
    try {
      const { data } = await axios.post(
        VALIDATE_URL,
        qs.stringify({
          email: 'api@ikonix.com',
          password: 'dvu1Fl]ZmiRoYlx5',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authTokenTime', Date.now().toString());
        setToken(data.token);
      }
    } catch (err) {
      console.error('❌ Token fetch failed:', err);
    } finally {
      // always let consumers know we're “ready” (whether we fetched or restored)
      setIsTokenReady(true);
    }
  };

  useEffect(() => {
    const restoreOrFetch = () => {
      const savedToken = localStorage.getItem('authToken');
      const savedTime  = parseInt(localStorage.getItem('authTokenTime') || '0', 10);
      const isExpired  = Date.now() - savedTime >= ONE_DAY_MS;

      if (savedToken && !isExpired) {
        // restore immediately
        setToken(savedToken);
        setIsTokenReady(true);
      } else {
        // fetch fresh
        fetchToken();
      }
    };

    restoreOrFetch();
    // refresh every 24h in background
    const id = setInterval(fetchToken, ONE_DAY_MS);
    return () => clearInterval(id);
  }, [setToken, setIsTokenReady]);

  return null;
}
