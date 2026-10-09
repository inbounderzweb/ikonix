// src/utils/apiError.js
// The backend is inconsistent about shape in two ways:
//  1. the field name — `message` vs `error` (e.g. /cart's 401/403s use `error`)
//  2. the value type — usually a plain string, but validation failures
//     (e.g. /guest-checkout's phone check) return an OBJECT of
//     {field: "message"} pairs instead, such as {"phone":"Valid 10-digit
//     phone is required"}.
// Rendering that object directly as a React child crashes the app
// ("Objects are not valid as a React child"), so every backend message
// must be routed through toMessageString()/getResponseMessage() before
// it reaches setError()/toastError()/Swal.fire() — never read
// `data.message` directly.
export function toMessageString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return toMessageString(value[0]);
  if (typeof value === 'object') return toMessageString(Object.values(value)[0]);
  return String(value);
}

// Extracts a safe, renderable message from a response body
// (e.g. {status:false, message:...} or {error:...}).
export function getResponseMessage(data, fallback) {
  if (typeof data === 'string') return data || fallback;
  return toMessageString(data?.message) || toMessageString(data?.error) || fallback;
}

export function isFailedResponse(data) {
  return [data?.status, data?.success].some((value) => (
    value === false || value === 0 ||
    (typeof value === 'string' && /^(false|0)$/i.test(value.trim()))
  ));
}

export function isSuccessfulResponse(data) {
  if (isFailedResponse(data)) return false;
  return [data?.status, data?.success].some((value) => (
    value === true || value === 1 ||
    (typeof value === 'string' && /^(true|1)$/i.test(value.trim()))
  ));
}

// Extracts a safe, renderable message from a caught axios error.
export function getApiErrorMessage(err, fallback) {
  return getResponseMessage(err?.response?.data, fallback);
}

// A 403 may be a permission or firewall denial. Only explicit token failures
// should trigger token renewal or invalidate the current account session.
export function isTokenErrorResponse(data) {
  const code = data && typeof data === 'object' ? data.code || data.error_code : '';
  const tokenCode = /^(?:(?:AUTH_|ACCESS_)?(?:TOKEN|JWT)_(?:EXPIRED|INVALID|MISSING|REVOKED|MALFORMED)|(?:EXPIRED|INVALID|MISSING|REVOKED|MALFORMED)_(?:TOKEN|JWT)|SESSION_EXPIRED)$/i;
  const tokenMessage = /\b(?:invalid|expired|missing|bad|malformed|revoked)\b.{0,40}\b(?:token|jwt)\b|\b(?:token|jwt)\b.{0,40}\b(?:invalid|expired|missing|malformed|revoked|not valid|required)\b|\bsession\s+(?:has\s+)?expired\b|\bjwt\b.{0,30}\bsignature\b.{0,20}\b(?:invalid|failed)\b/i;
  const messages = typeof data === 'string' ? [data] : [data?.message, data?.error];
  return tokenCode.test(String(code)) || messages.some((value) => {
    const message = toMessageString(value);
    return tokenCode.test(message) || tokenMessage.test(message);
  });
}

// The shared API client sets this after confirming the account session failed.
// Guest authentication and genuine permission errors must not log out users.
export function isAuthError(err) {
  return err?.__sessionExpired === true;
}
