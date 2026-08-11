// src/api/client.js
import axios from "axios";
import qs from "qs";

const VALIDATE_URL = "/beta/api/validate";

// The anonymous "service account" token below is only ever used to let
// unauthenticated visitors browse (product list, product detail, etc.)
// before they log in. It must never share storage or state with a real
// user's JWT (set only by AuthModal on login) — mixing the two was the
// root cause of a bug where a logged-in user's session silently turned
// into the anonymous session after a refresh.
const GUEST_TOKEN_KEY = "guestToken";
const GUEST_TOKEN_TIME_KEY = "guestTokenTime";
// Backend token expires in 1 hour; refresh a little early.
const GUEST_TOKEN_MAX_AGE_MS = 55 * 60 * 1000;

let refreshingGuestPromise = null;

async function fetchGuestToken() {
  const { data } = await axios.post(
    VALIDATE_URL,
    qs.stringify({
      email: "api@ikonix.com",
      password: "dvu1Fl]ZmiRoYlx5",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!data?.token) throw new Error("No token in validate response");

  localStorage.setItem(GUEST_TOKEN_KEY, data.token);
  localStorage.setItem(GUEST_TOKEN_TIME_KEY, Date.now().toString());

  return data.token;
}

function isGuestTokenExpired() {
  const tokenTime = localStorage.getItem(GUEST_TOKEN_TIME_KEY);
  if (!tokenTime) return true;
  return Date.now() - parseInt(tokenTime, 10) > GUEST_TOKEN_MAX_AGE_MS;
}

export async function ensureGuestTokenReady() {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);

  if (!token || isGuestTokenExpired()) {
    if (!refreshingGuestPromise) {
      refreshingGuestPromise = fetchGuestToken().finally(() => {
        refreshingGuestPromise = null;
      });
    }

    try {
      token = await refreshingGuestPromise;
    } catch (error) {
      console.error("Failed to fetch guest token:", error);
      return null;
    }
  }
  return token;
}

export function createApiClient({ getToken, baseUrl }) {
  const api = axios.create({
    baseURL: baseUrl !== undefined ? baseUrl : '',
  });

  // Attach the real user's JWT when logged in; otherwise fall back to the
  // anonymous guest token. Tag which one was used so the response
  // interceptor below knows whether a 401/403 is safe to auto-recover from.
  api.interceptors.request.use(async (config) => {
    const userToken = getToken?.();
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      config.__usedUserToken = true;
    } else {
      const guestToken = await ensureGuestTokenReady();
      if (guestToken) config.headers.Authorization = `Bearer ${guestToken}`;
      config.__usedUserToken = false;
    }
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      const status = err?.response?.status;
      const original = err?.config;

      if (!original || original.__isRetry) return Promise.reject(err);
      if (status !== 401 && status !== 403) return Promise.reject(err);

      // A logged-in user's own JWT was rejected. There's no backend
      // refresh-token endpoint yet, so we can't silently renew a real
      // session — and we must NOT paper over this by swapping in the
      // anonymous guest token, which is exactly what used to make a
      // user's orders/addresses silently disappear after a refresh.
      // Surface the failure so the caller/UI can prompt re-login.
      if (original.__usedUserToken) {
        return Promise.reject(err);
      }

      // Guest token expired/invalid — safe to refresh, no user identity
      // at risk — then retry the original request once.
      original.__isRetry = true;
      try {
        if (!refreshingGuestPromise) {
          refreshingGuestPromise = fetchGuestToken().finally(() => {
            refreshingGuestPromise = null;
          });
        }
        const newGuestToken = await refreshingGuestPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newGuestToken}`;
        return api(original);
      } catch (e) {
        return Promise.reject(err);
      }
    }
  );

  return api;
}
