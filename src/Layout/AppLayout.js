import { useEffect } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';
import { Outlet } from 'react-router-dom';
import Home from '../pages/Home/Home';

export default function AppLayout() {
  const { setToken } = useAuth();

  const fetchToken = async () => {
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
        console.log('✅ Token fetched & saved globally');
      }
    } catch (err) {
      console.error('❌ Global token fetch failed:', err?.response?.data || err.message);
    }
  };

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
  }, [setToken]);

  return (
    <>
      {/* Common layout: header, nav, footer (optional) */}
      <Home /> {/* Child routes render here */}
    </>
  );
}
