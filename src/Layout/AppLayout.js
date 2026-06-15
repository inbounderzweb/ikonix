import { useEffect, useCallback } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';
import Home from '../pages/Home/Home';

export default function AppLayout() {
  const { setToken } = useAuth();
  const fetchToken = useCallback(async () => {
    try {
      const response = await axios.post(
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

      const tokenValue = response.data?.token;
      if (tokenValue) {
        localStorage.setItem('authToken', tokenValue);
        localStorage.setItem('authTokenTime', Date.now().toString());
        setToken(tokenValue);
        console.log('✅ Token fetched & saved globally',tokenValue);
      }
    } catch (err) {
      console.error('❌ Global token fetch failed:', err?.response?.data || err.message);
    }
  }, [setToken]);

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedTime = localStorage.getItem('authTokenTime');
    const now = Date.now();

    const isExpired =
      !savedToken || !savedTime || now - parseInt(savedTime, 10) >= 86400000;

    if (isExpired) {
      fetchToken();
    } else {
      setToken(savedToken);
    }
  }, [setToken, fetchToken]);

  return (
    <>
      {/* Common layout: header, nav, footer (optional) */}
      <Home /> {/* Child routes render here */}
    </>
  );
}
