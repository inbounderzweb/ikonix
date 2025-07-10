// utils/authHelpers.js
import axios from "axios";
import qs from "qs";

export const fetchNewToken = async () => {
  try {
    const response = await axios.post(
      "https://ikonixperfumer.com/beta/api/validate",
      qs.stringify({
        email: "api@ikonix.com",
        password: "dvu1Fl]ZmiRoYlx5",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const token = response.data?.token;
    if (token) {
      localStorage.setItem("authToken", token);
      localStorage.setItem("authTokenTime", Date.now().toString());
      return token;
    }
  } catch (err) {
    console.error("❌ Could not refresh token:", err?.response?.data || err.message);
    return null;
  }
};
