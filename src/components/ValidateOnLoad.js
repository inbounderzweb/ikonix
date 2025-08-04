import { useEffect } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';

export default function ValidateOnLoad() {
  const { setToken, setIsTokenReady } = useAuth();

  // Fetch a fresh token from your validate endpoint
  const fetchToken = async () => {
    try {
      const { data } = await axios.post(
        'https://ikonixperfumer.com/beta/api/validate',
        qs.stringify({
          email: 'api@ikonix.com',
          password: 'dvu1Fl]ZmiRoYlx5',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const tokenValue = data?.token;
      if (tokenValue) {
        localStorage.setItem('authToken', tokenValue);
        localStorage.setItem('authTokenTime', Date.now().toString());
        setToken(tokenValue);
        setIsTokenReady(true);
        console.log('✅ Token fetched & saved:', tokenValue);
      }
    } catch (err) {
      console.error('❌ Token fetch failed:', err?.response?.data || err.message);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const savedToken = localStorage.getItem('authToken');
      const savedTime  = parseInt(localStorage.getItem('authTokenTime') || '0', 10);
      const isExpired  = Date.now() - savedTime >= 24 * 60 * 60 * 1000;

      if (!savedToken || isExpired) {
        await fetchToken();
      } else {
        setToken(savedToken);
        setIsTokenReady(true);
        console.log('⚡ Token restored from localStorage:', savedToken);
      }
    };

    checkToken();  
    // auto-refresh every 24h
    const id = setInterval(fetchToken, 24 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [setToken, setIsTokenReady]);

  return null;
}
