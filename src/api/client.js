// src/api/client.js
import axios from "axios";
import qs from "qs";

const VALIDATE_URL = "/beta/api/validate";

let refreshingPromise = null;

export async function fetchNewToken() {
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

export function isTokenExpired() {
  const tokenTime = localStorage.getItem("authTokenTime");
  if (!tokenTime) return true; // No token time means it's expired or never set

  const now = Date.now();
  const tokenAge = now - parseInt(tokenTime, 10);
  // Token expires in 1 hour on backend, so refresh after 55 minutes buffer
  return tokenAge > 55 * 60 * 1000;
}

export function clearToken() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authTokenTime");
}

export async function ensureTokenReady() {
  let token = localStorage.getItem("authToken");

  if (!token || isTokenExpired()) {
    clearToken(); // Clear potentially expired or invalid token
    if (!refreshingPromise) {
      refreshingPromise = fetchNewToken()
        .then((newToken) => {
          return newToken;
        })
        .finally(() => {
          refreshingPromise = null;
        });
    }

    try {
      token = await refreshingPromise;
    } catch (error) {
      console.error("Failed to fetch new token:", error);
      return null;
    }
  }
  return token;
}

export function createApiClient({ getToken, setToken, setIsTokenReady, baseUrl }) {
  const api = axios.create({
    baseURL: baseUrl !== undefined ? baseUrl : '', 
  });

  // Attach token to every request, ensuring token is fresh
  api.interceptors.request.use(async (config) => {
    const t = getToken?.() || await ensureTokenReady();
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
