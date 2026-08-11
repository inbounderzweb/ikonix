// src/components/ValidateOnLoad.js
//
// Warms the anonymous guest token (used for unauthenticated browsing, e.g.
// product listing before login) as soon as the app mounts, so the first
// real request doesn't pay the extra round trip.
//
// Deliberately does NOT touch AuthContext's `token`/`user` or the
// `authToken` localStorage key at all — those belong exclusively to a real
// logged-in user's JWT (set only by AuthModal on login). Keeping the two
// fully separate is what fixes the previous bug where this component could
// overwrite a logged-in user's session with the anonymous token after a
// refresh.
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ensureGuestTokenReady } from '../api/client';

const REFRESH_INTERVAL_MS = 50 * 60 * 1000; // ensureGuestTokenReady() only refetches if actually expired

export default function ValidateOnLoad() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) return; // real session already established, nothing to warm

    ensureGuestTokenReady();
    const intervalId = setInterval(ensureGuestTokenReady, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user]);

  return null;
}
