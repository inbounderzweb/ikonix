// // src/components/ValidateOnLoad.js
// import { useEffect, useRef } from 'react';
// import axios from 'axios';
// import qs from 'qs';
// import { useAuth } from '../context/AuthContext';

// const VALIDATE_URL = 'https://ikonixperfumer.com/beta/api/validate';
// const ONE_DAY_MS   = 24 * 60 * 60 * 1000;
// const MAX_RETRIES  = 5;
// const RETRY_DELAY  = 500; // ms between initial retry attempts

// export default function ValidateOnLoad() {
//   const { setToken, setIsTokenReady } = useAuth();
//   const retryRef = useRef(0);

//   const fetchToken = async () => {
//     try {
//       const { data } = await axios.post(
//         VALIDATE_URL,
//         qs.stringify({
//           email:    'api@ikonix.com',
//           password: 'dvu1Fl]ZmiRoYlx5',
//         }),
//         { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
//       );

//       if (data.token) {
//         localStorage.setItem('authToken', data.token);
//         localStorage.setItem('authTokenTime', Date.now().toString());
//         setToken(data.token);
//         // first successful fetch means we’re ready
//         setIsTokenReady(true);
//         // alert(data.token)
//         return true;
//       }
//       throw new Error('No token in response');
//     } catch (err) {
//       console.error('❌ Token fetch failed:', err);
//       return false;
//     }
//   };

//   useEffect(() => {
//     let intervalId;

//     // 1️⃣ initial retry loop up to MAX_RETRIES
//     const attemptFetch = async () => {
//       const ok = await fetchToken();
//       if (!ok && ++retryRef.current < MAX_RETRIES) {
//         // schedule next retry
//         setTimeout(attemptFetch, RETRY_DELAY);
//       } else if (!ok) {
//         // give up and let downstream know we’re “ready” anyway
//         setIsTokenReady(true);
//       } else {
//         // succeed: start daily interval
//         intervalId = setInterval(fetchToken, ONE_DAY_MS);
//       }
//     };

//     attemptFetch();

//     return () => {
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, [setToken, setIsTokenReady]);

//   return null;
// }




import { useEffect, useRef } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';

const VALIDATE_URL = 'https://ikonixperfumer.com/beta/api/validate';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

// optional: treat token older than ~22h as expired (safe)
const MAX_TOKEN_AGE_MS = 22 * 60 * 60 * 1000;

export default function ValidateOnLoad() {
  const { setToken, setIsTokenReady } = useAuth();
  const retryRef = useRef(0);
  const startedRef = useRef(false);

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

      if (data?.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authTokenTime', Date.now().toString());
        setToken(data.token);
        setIsTokenReady(true);
        return true;
      }

      throw new Error('No token in response');
    } catch (err) {
      console.error('❌ Token fetch failed:', err);
      return false;
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let intervalId;

    // 0) If token exists & not too old, use it immediately
    const stored = localStorage.getItem('authToken');
    const tStr = localStorage.getItem('authTokenTime');
    const tokenTime = Number(tStr || 0);
    const tokenAgeOk = tokenTime && Date.now() - tokenTime < MAX_TOKEN_AGE_MS;

    if (stored && tokenAgeOk) {
      setToken(stored);
      setIsTokenReady(true);

      // keep refreshing daily in background
      intervalId = setInterval(fetchToken, ONE_DAY_MS);

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }

    // 1) If missing/old → validate with retries
    const attemptFetch = async () => {
      const ok = await fetchToken();
      if (!ok && ++retryRef.current < MAX_RETRIES) {
        setTimeout(attemptFetch, RETRY_DELAY);
      } else if (!ok) {
        // Don't block UI forever; allow app to proceed
        setIsTokenReady(true);
      } else {
        intervalId = setInterval(fetchToken, ONE_DAY_MS);
      }
    };

    attemptFetch();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [setToken, setIsTokenReady]);

  return null;
}
