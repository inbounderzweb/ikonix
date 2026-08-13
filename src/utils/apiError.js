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
  return toMessageString(data?.message) || toMessageString(data?.error) || fallback;
}

// Extracts a safe, renderable message from a caught axios error.
export function getApiErrorMessage(err, fallback) {
  return getResponseMessage(err?.response?.data, fallback);
}

// A 401/403 on a request made with the user's own JWT means their session
// is invalid/expired — there's no backend refresh-token endpoint for user
// sessions yet, so this can't be silently recovered from.
export function isAuthError(err) {
  const status = err?.response?.status;
  return status === 401 || status === 403;
}
