import { useEffect } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';

export default function ValidateOnLoad() {
  const { setToken } = useAuth();

  // Validate function
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
        localStorage.setItem('authToken', tokenValue); // ✅ store locally
        localStorage.setItem('authTokenTime', Date.now().toString()); // ✅ save timestamp
        setToken(tokenValue); // ✅ update context
        console.log('✅ Token fetched & saved:', tokenValue);
      }
    } catch (err) {
      console.error('❌ Token fetch failed:', err?.response?.data || err.message);
    }
  };


// protective check every 1 hour if the token is expired or not 
  useEffect(() => {
    const checkAndRefreshToken = () => {
      const savedToken = localStorage.getItem('authToken');
      const savedTime = localStorage.getItem('authTokenTime');
      const now = Date.now();
      const shouldFetch =
        !savedToken || !savedTime || now - parseInt(savedTime, 10) >= 86400000;
  
      if (shouldFetch) fetchToken();
      else setToken(savedToken);
    };
  
    checkAndRefreshToken(); // initial check
  
    const interval = setInterval(checkAndRefreshToken, 60 * 60 * 1000); // check every 1 hour
    return () => clearInterval(interval);
  }, [setToken]);

// end protective check every 1 hour if the token is expired or not 









  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedTime = localStorage.getItem('authTokenTime');
    const now = Date.now();

    // Condition to refresh token: not present or expired (24 hrs = 86400000 ms)
    const shouldFetch =
      !savedToken || !savedTime || now - parseInt(savedTime, 10) >= 86400000;

    if (shouldFetch) {
      fetchToken(); // ✅ get new token
    } else {
      setToken(savedToken); // ✅ restore from localStorage
      console.log('⚡ Token restored from localStorage:', savedToken);
    }

    // Auto refresh every 24 hrs
    const interval = setInterval(fetchToken, 86400000); // 24 hrs
    return () => clearInterval(interval); // Cleanup
  }, [setToken]);

  return null;
}
