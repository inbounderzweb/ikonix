// Shared authentication and bounded guest-token recovery for all first-party API calls.
import axios from "axios";
import qs from "qs";
import { getResponseMessage, isTokenErrorResponse } from "../utils/apiError";

const VALIDATE_URL = "/beta/api/validate";
const GUEST_TOKEN_KEY = "guestToken";
const GUEST_TOKEN_TIME_KEY = "guestTokenTime";
const GUEST_TOKEN_MAX_AGE_MS = 55 * 60 * 1000;
const GUEST_FETCH_COOLDOWN_MS = 10 * 1000;
const GUEST_FETCH_RETRIES = 2;

export const AUTH_EXPIRED_EVENT = "auth:expired";
export const API_AUTH_FAILURE_EVENT = "api:auth-failure";

let refreshingGuestPromise = null;
let guestFetchFailedAt = null;
let lastGuestFetchError = null;
const rejectedUserTokens = new Set();

function jwtPayload(token) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("Malformed JWT");
  const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const payload = JSON.parse(atob(padded));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Malformed JWT payload");
  }
  return payload;
}

export function isJwtExpired(token) {
  try {
    const { exp } = jwtPayload(token);
    if (exp === undefined) return false;
    return typeof exp !== "number" || !Number.isFinite(exp) || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function clearStoredSession() {
  ["authToken", "authUser", "authTokenTime"].forEach((key) => localStorage.removeItem(key));
}

function handleSessionExpired(token) {
  if (!token || rejectedUserTokens.has(token)) return;
  rejectedUserTokens.add(token);
  // A late failure from a previous login must not clear the new session.
  const current = localStorage.getItem("authToken");
  if (current && current !== token) return;
  clearStoredSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

function sessionExpiredError(config) {
  const err = new Error("Session expired. Please log in again.");
  err.response = { status: 401, data: { error: "Session expired. Please log in again." } };
  err.__sessionExpired = true;
  err.request = config;
  return err;
}

function sessionChangedError(config) {
  const err = new Error("Your account session changed. Please retry from your current account.");
  err.response = { status: 409, data: { error: err.message } };
  err.__sessionChanged = true;
  err.request = config;
  return err;
}

function requestPath(config) {
  try {
    return new URL(axios.getUri(config), window.location.origin).pathname;
  } catch {
    return "unknown";
  }
}

function requestUserId(data) {
  if (data instanceof FormData || data instanceof URLSearchParams) return data.get("userid");
  if (typeof data === "string") return qs.parse(data).userid;
  return data?.userid;
}

function requiresUser(config) {
  const path = requestPath(config);
  if (config.requireUser || /\/(orders|address|addresses|checkout|payment|profile|account)(\/|$)/.test(path)) {
    return true;
  }
  const userid = requestUserId(config.data);
  return /\/(cart|delete-cart)\/?$/.test(path) && userid != null && String(userid) !== "0" && String(userid) !== "";
}

// Emit only metadata. Never include tokens, query strings, credentials, request
// bodies, or raw server responses (which can contain customer information).
function logAuthFailure(err, config, reason, tokenType) {
  const requestId = err?.response?.headers?.["x-request-id"];
  const detail = {
    path: requestPath(config),
    method: (config?.method || "get").toUpperCase(),
    status: err.originalStatus || err?.response?.status || null,
    tokenType: tokenType || (config?.__usedUserToken ? "user" : "guest"),
    reason,
    ...(typeof requestId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(requestId) ? { requestId } : {}),
  };
  console.warn("[api] auth failure", detail);
  window.dispatchEvent(new CustomEvent(API_AUTH_FAILURE_EVENT, { detail }));
}

function isTransientFailure(err) {
  const status = err?.response?.status;
  return !status || status === 429 || status >= 500;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGuestToken() {
  if (guestFetchFailedAt !== null && Date.now() - guestFetchFailedAt < GUEST_FETCH_COOLDOWN_MS) {
    throw lastGuestFetchError;
  }
  let lastErr;
  for (let attempt = 0; attempt <= GUEST_FETCH_RETRIES; attempt++) {
    try {
      const { data } = await axios.post(
        VALIDATE_URL,
        qs.stringify({
          email: "api@ikonix.com",
          password: "dvu1Fl]ZmiRoYlx5",
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
        }
      );
      if (!data?.token || isJwtExpired(data.token)) {
        const error = new Error("Guest authentication is unavailable. Please try again.");
        error.__invalidGuestToken = true;
        throw error;
      }
      localStorage.setItem(GUEST_TOKEN_KEY, data.token);
      localStorage.setItem(GUEST_TOKEN_TIME_KEY, Date.now().toString());
      guestFetchFailedAt = null;
      lastGuestFetchError = null;
      return data.token;
    } catch (err) {
      lastErr = err;
      if (err.__invalidGuestToken || !isTransientFailure(err)) break;
      if (attempt < GUEST_FETCH_RETRIES) await sleep(500 * 2 ** attempt);
    }
  }
  guestFetchFailedAt = Date.now();
  lastGuestFetchError = lastErr;
  lastErr.__guestTokenFailure = true;
  logAuthFailure(lastErr, { url: VALIDATE_URL, method: "post" }, "guest-validation-failed", "guest");
  throw lastErr;
}

function startGuestRefresh() {
  if (!refreshingGuestPromise) {
    refreshingGuestPromise = fetchGuestToken().finally(() => {
      refreshingGuestPromise = null;
    });
  }
  return refreshingGuestPromise;
}

function shouldRefreshGuest(token) {
  if (!token || isJwtExpired(token)) return true;
  const rawTime = localStorage.getItem(GUEST_TOKEN_TIME_KEY);
  const timestamp = Number(rawTime);
  if (!rawTime || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > Date.now()) return true;
  const { exp } = jwtPayload(token);
  return Date.now() - timestamp >= GUEST_TOKEN_MAX_AGE_MS ||
    (typeof exp === "number" && exp * 1000 - Date.now() <= 30000);
}

export async function ensureGuestTokenReady() {
  const cached = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!shouldRefreshGuest(cached)) return cached;
  try {
    return await startGuestRefresh();
  } catch (err) {
    // A proactive renewal may fail briefly while the old JWT is still valid.
    // Expired/rejected tokens and definite /validate rejections never fall back.
    if (cached && !isJwtExpired(cached) && !err.__invalidGuestToken && isTransientFailure(err) &&
        localStorage.getItem(GUEST_TOKEN_KEY) === cached) return cached;
    throw err;
  }
}

async function renewRejectedGuestToken(rejectedToken) {
  const cached = localStorage.getItem(GUEST_TOKEN_KEY);
  if (cached && cached !== rejectedToken && !shouldRefreshGuest(cached)) return cached;
  if (cached === rejectedToken) {
    localStorage.removeItem(GUEST_TOKEN_KEY);
    localStorage.removeItem(GUEST_TOKEN_TIME_KEY);
  }
  return startGuestRefresh();
}

export function createApiClient({ getToken, baseUrl } = {}) {
  const api = axios.create({ baseURL: baseUrl !== undefined ? baseUrl : "" });

  const currentUserToken = () => {
    const stored = localStorage.getItem("authToken");
    if (!getToken) return stored;
    const supplied = getToken();
    // Explicit null is reserved for guest-only clients (products/login).
    return supplied ? stored || supplied : null;
  };

  api.interceptors.request.use(async (config) => {
    config.headers = config.headers || {};
    const protectedRequest = requiresUser(config);
    // Retrying an anonymous request must preserve its original identity.
    let userToken = config.__isRetry || config.authMode === "guest" ? null : currentUserToken();
    // A long-lived payment/cart callback may belong to the previous account.
    // Reject it before sending that account's payload with a newer credential.
    if (config.expectedUserToken && userToken && config.expectedUserToken !== userToken) {
      throw sessionChangedError(config);
    }
    if (userToken && (isJwtExpired(userToken) || rejectedUserTokens.has(userToken))) {
      handleSessionExpired(userToken);
      // Mutations started by an account must never be sent as the guest.
      if (protectedRequest || !/^(get|head|options)$/i.test(config.method || "get")) {
        throw sessionExpiredError(config);
      }
      userToken = null;
    }
    if (protectedRequest && !userToken) throw sessionExpiredError(config);
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
      config.__usedUserToken = true;
      config.__userToken = userToken;
    } else {
      const guestToken = await ensureGuestTokenReady();
      config.headers.Authorization = `Bearer ${guestToken}`;
      config.__usedUserToken = false;
      config.__guestToken = guestToken;
      config.__userToken = null;
    }
    return config;
  });

  async function recoverAuthFailure(err) {
    const original = err?.config;
    const status = err?.response?.status;
    if (!original || err.__guestTokenFailure || (status !== 401 && status !== 403)) throw err;
    const tokenRejected = status === 401 || isTokenErrorResponse(err.response.data);
    logAuthFailure(err, original, tokenRejected ? "token-rejected" : "forbidden");
    if (original.__usedUserToken) {
      if (tokenRejected) {
        err.__sessionExpired = true;
        handleSessionExpired(original.__userToken);
      }
      throw err;
    }
    // Permission errors and HTML firewall denials cannot be repaired by login.
    if (!tokenRejected) throw err;
    if (original.__isRetry) {
      // Do not keep a newly issued token which the API has already rejected.
      if (localStorage.getItem(GUEST_TOKEN_KEY) === original.__guestToken) {
        localStorage.removeItem(GUEST_TOKEN_KEY);
        localStorage.removeItem(GUEST_TOKEN_TIME_KEY);
      }
      guestFetchFailedAt = Date.now();
      lastGuestFetchError = err;
      err.__guestTokenFailure = true;
      throw err;
    }
    original.__isRetry = true;
    try {
      await renewRejectedGuestToken(original.__guestToken);
    } catch (refreshError) {
      err.guestRefreshStatus = refreshError?.response?.status || null;
      throw err;
    }
    return api(original);
  }

  api.interceptors.response.use((response) => {
    // The backend sometimes returns token failures in a HTTP 200 JSON body.
    if (response.data?.status !== true && isTokenErrorResponse(response.data)) {
      const err = new axios.AxiosError(
        getResponseMessage(response.data, "Access token rejected"),
        "ERR_AUTH_TOKEN",
        response.config,
        response.request,
        { ...response, status: 401 }
      );
      err.originalStatus = response.status;
      return recoverAuthFailure(err);
    }
    return response;
  }, recoverAuthFailure);
  return api;
}
