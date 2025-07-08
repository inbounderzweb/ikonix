// src/ValidateOnLoad.jsx
import React, { useEffect } from 'react';
import axios from 'axios';

const ValidateOnLoad = () => {
  useEffect(() => {
    const validate = async () => {
      // body you typed in Postman
      const payload = {
        email: 'api@ikonix.com',
        password: 'dvu1Fl|ZmiRoYIx5',
      };

      try {
        const { data } = await axios.post(
          'https://ikonixperfumer.com/beta/api/validate',
          payload,                                // ← JSON body
          {
            headers: {
              'Content-Type': 'application/json', // mirrors Postman
              Accept: 'application/json',
            },
          }
        );

        console.log('✅ validate response →', data); // see what API returns
      } catch (err) {
        console.error(
          '❌ validate failed →',
          err?.response?.data || err.message
        );
      }
    };

    validate(); // run once when component mounts
  }, []);

  return null; // this “service” component doesn’t render UI
};

export default ValidateOnLoad;
