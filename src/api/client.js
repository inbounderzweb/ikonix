// src/api/client.js
import axios from "axios";
import qs from "qs";

const VALIDATE_URL = "https://ikonixperfumer.com/beta/api/validate";

let refreshingPromise = null;

async function fetchNewToken() {
  const { data } = await axios.post(
    VALIDATE_URL,
    qs.stringify({
      email: "api@ikonix.com",
      password: "dvu1Fl]ZmiRoYlx5",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!data?.token) throw new Error("No token in validate response");

  localStorage.setItem("authToken", data.token);
  localStorage.setItem("authTokenTime", Date.now().toString());

  return data.token;
}

export function createApiClient({ getToken, setToken, setIsTokenReady }) {
  const api = axios.create();

  // Attach token to every request if present
  api.interceptors.request.use((config) => {
    const t = getToken?.() || localStorage.getItem("authToken");
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  });

  // Auto-refresh on 401/403 and retry once
  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err?.response?.status;
      const original = err?.config;

      // Only handle auth errors, and avoid infinite retry loops
      if (!original || original.__isRetry) return Promise.reject(err);
      if (status !== 401 && status !== 403) return Promise.reject(err);

      original.__isRetry = true;

      try {
        // Lock refresh so multiple failing requests don’t refresh multiple times
        if (!refreshingPromise) {
          refreshingPromise = fetchNewToken()
            .then((newToken) => {
              // update context if provided
              if (setToken) setToken(newToken);
              if (setIsTokenReady) setIsTokenReady(true);
              return newToken;
            })
            .finally(() => {
              refreshingPromise = null;
            });
        }

        const newToken = await refreshingPromise;

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;

        return api(original); // retry original request
      } catch (e) {
        // If validate itself fails, allow UI to proceed; still reject
        if (setIsTokenReady) setIsTokenReady(true);
        return Promise.reject(err);
      }
    }
  );

  return api;
}
