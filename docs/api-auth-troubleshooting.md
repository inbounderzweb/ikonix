# Investigating API 401/403 responses

The browser fixes in this project handle expired/rejected guest tokens, expired
account sessions, concurrent renewal, and stale responses. A 403 caused by
backend authorization, credentials, or a firewall still requires a server fix.
There is no backend source or refresh-token contract in this repository.

## Find the actual failure

1. In the affected browser, open Developer Tools → Network and reproduce the
   action. Record the request path, method, status, response Content-Type, and
   any server request ID. Record whether Authorization was present, without
   copying its value. Do not share passwords, tokens, or customer request bodies.
2. Check whether the failed request was `/beta/api/validate` itself or a resource
   such as `/beta/api/products`, `/cart`, `/login`, or `/payment/callback`.
3. Look for `[api] auth failure` in the console. Its metadata includes `path`,
   `method`, `status`, `tokenType` (guest/user), `reason`, and `requestId` when
   provided. Tokens, query strings, credentials, and raw response bodies are
   omitted. This same metadata is available through the `api:auth-failure`
   browser event for an existing error tracker to subscribe to.
4. Match the path, time, status, and request ID to API and Apache/firewall logs.
   For guest authentication, correlate `/validate` with the resource failure.
   Compare an affected browser with a working one; do not blanket-clear all
   browser storage because it also contains the guest cart.

## Interpret the result

| Failure | Browser behavior | Server investigation |
| --- | --- | --- |
| Resource 401, or 403 explicitly naming an invalid/expired token | Guests renew once and replay once; accounts clear the failed session and prompt login | JWT expiry, issuer/signing key, revocation and server clock |
| 403 with only Forbidden/permission denial | Preserve the account; surface the error without renewing credentials | Route permissions and ownership checks; use server logs if the API uses generic 403 for expired tokens |
| HTML 403 | Preserve the account; no token renewal for a generic firewall denial | Apache/ModSecurity/CDN rules, IP blocks, rate limits |
| `/validate` rejects with 401/403 | Stop before dispatching a tokenless resource request; short cooldown | Guest service account credentials and permissions |
| `/validate` network error, 429, or 5xx | At most two delayed retries; short cooldown | Availability, rate limit and request volume |
| `/validate` response lacks a valid unexpired JWT | Stop before resource dispatch | Validate API response contract |
| HTTP 200 JSON reporting an invalid/expired token | Handle as an authentication failure, not a successful mutation | Return consistent auth HTTP statuses and machine-readable error codes |

Guest renewal is shared across simultaneous requests in the same tab. A cached
JWT is checked against its actual `exp`; the stored age only triggers early
renewal. A temporary early-renewal failure may reuse a still-valid JWT, but a
rejected or expired JWT is never reused. Guest cart reads and changes stay local;
only confirmed guest-to-account transfers remove local quantities.

Account cart/payment requests also carry the session token expected by their
caller. If another login replaced that session while a callback was waiting,
the request is blocked locally with 409 instead of sending the previous
account's payload with the new account's credential. Guest payment callbacks
keep their anonymous credential even if the visitor signs in while paying.

## Backend changes needed for durable prevention

- Return 401 for missing/expired/invalid JWTs and 403 for real authorization
  denials, with a stable code such as `TOKEN_EXPIRED` and a request ID. If the
  backend currently returns bare 403 for dead sessions, fix that contract or
  document a precise code the frontend can classify.
- Verify the guest account can access catalog and guest checkout routes. If
  signing in that shared account invalidates its previous JWT, visitors can
  invalidate one another's tokens; browser retries cannot solve that server
  policy. Use independently valid anonymous credentials or public catalog
  routes instead.
- Move the guest service account credentials out of the shipped JavaScript to
  a server-controlled anonymous-session endpoint, then rotate the existing
  credentials. This repository currently supplies those credentials from the
  browser, so they are visible in the production bundle.
- If accounts should remain signed in beyond JWT expiry, provide a documented
  user refresh-session flow. No user refresh endpoint is configured here;
  the frontend must request login instead of swapping an account for a guest.
- Confirm `/guest-payment/callback` exists and verify its access contract. The
  current frontend contains an existing assumption about that route; no backend
  specification is present to verify it. Test real guest and account payments
  in the provider's test environment before releasing checkout changes.

## Local verification

Browser refresh restores the saved customer token and user before rendering
account pages. An old or absent `authTokenTime` does not expire an otherwise
valid customer JWT; the token's actual `exp` and confirmed backend rejection
control expiration. Product-detail reads use the same guest identity as the
catalog and search, so guest-token recovery cannot clear a saved customer login.
Successful boolean, string, and numeric response flags are recognized before
classifying token-error messages. Explicitly failed OTP responses never save
credentials or advance to the verification screen.

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Regression suites exercise the real Axios interceptors with controlled adapters,
RTK product/search requests, account storage, guest cart transfer, and payment
callback handling. They make no live login, cart, order, or payment changes.
Login verification and full application remounts also exercise stored-session
restoration on profile and product pages without requesting another OTP.
They also complete OTP login and press both desktop and mobile profile buttons
repeatedly. Login dialogs close whenever a session is established, including
through another dialog or tab. Late OTP responses cannot replace that session
or display a stale verification error on the profile page.

Login user records are normalized before session storage and when restored.
Compatibility handling accepts `id`, `userid`, or `user_id` from one unambiguous
user record (including a single-record array), with a positive customer ID.
Missing, zero, malformed, or conflicting IDs cannot establish a session. This
prevents an apparently successful login from sending the shared `userid=0`
in its first authenticated cart request and being rejected immediately.
Incomplete verification responses remain on OTP and do not report the backend's
generic "Success" message as an established login.
