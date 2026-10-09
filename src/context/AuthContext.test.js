import React from 'react';
import { act, render } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { AUTH_EXPIRED_EVENT, clearStoredSession } from '../api/client';

const jwt = (exp, subject = 'customer') =>
  `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ exp, sub: subject }))}.signature`;
const futureExpiry = () => Math.floor(Date.now() / 1000) + 3600;
const customer = { id: 12, name: 'Customer' };

function saveSession(token, user = customer) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
  localStorage.setItem('authTokenTime', '123');
}

function mountAuth() {
  let context;
  function Probe() {
    context = useAuth();
    return null;
  }
  const view = render(<AuthProvider><Probe /></AuthProvider>);
  return { ...view, current: () => context };
}

beforeEach(() => localStorage.clear());

test('restores a valid user session and marks initialization ready', () => {
  const token = jwt(futureExpiry());
  saveSession(token);
  const auth = mountAuth();
  expect(auth.current()).toMatchObject({ token, user: customer, isTokenReady: true });
});

test.each([
  ['a string ID', { id: '12', name: 'Customer', mobile: '9000000000' }],
  ['a userid alias', { userid: '12', name: 'Customer', mobile: '9000000000' }],
  ['a user_id alias', { user_id: '12', name: 'Customer', mobile: '9000000000' }],
  ['a singleton user record', [{ user_id: '12', name: 'Customer', mobile: '9000000000' }]],
])('restores %s with a usable account ID instead of treating its cart as a guest', (_, storedUser) => {
  const token = jwt(futureExpiry());
  saveSession(token, storedUser);
  const auth = mountAuth();
  const source = Array.isArray(storedUser) ? storedUser[0] : storedUser;

  expect(auth.current()).toMatchObject({
    token,
    user: { ...source, id: customer.id },
    isTokenReady: true,
  });
  expect(localStorage.getItem('authToken')).toBe(token);
});

test('refresh restores a valid JWT even when its saved login time is missing', () => {
  const token = jwt(futureExpiry());
  saveSession(token);
  localStorage.removeItem('authTokenTime');
  const refreshed = mountAuth();
  expect(refreshed.current()).toMatchObject({ token, user: customer });
  expect(localStorage.getItem('authToken')).toBe(token);
});

test.each([
  ['an expired token', () => jwt(Math.floor(Date.now() / 1000) - 1), JSON.stringify(customer)],
  ['a malformed token', () => 'broken-token', JSON.stringify(customer)],
  ['broken user JSON', () => jwt(futureExpiry()), '{broken'],
  ['a missing user', () => jwt(futureExpiry()), null],
  ['a user without an ID', () => jwt(futureExpiry()), '{}'],
  ['a singleton user without an ID', () => jwt(futureExpiry()), '[{}]'],
  ['the numeric guest ID', () => jwt(futureExpiry()), '{"id":0}'],
  ['the string guest ID', () => jwt(futureExpiry()), '{"userid":"0"}'],
  ['a malformed user ID', () => jwt(futureExpiry()), '{"user_id":"invalid"}'],
  ['a fractional user ID', () => jwt(futureExpiry()), '{"id":12.5}'],
  ['a negative user ID', () => jwt(futureExpiry()), '{"id":-12}'],
  ['multiple user records', () => jwt(futureExpiry()), '[{"id":12},{"id":24}]'],
])('discards %s instead of restoring an inconsistent session', (_, makeToken, rawUser) => {
  localStorage.setItem('authToken', makeToken());
  localStorage.setItem('authTokenTime', '123');
  if (rawUser !== null) localStorage.setItem('authUser', rawUser);
  const auth = mountAuth();
  expect(auth.current()).toMatchObject({ token: '', user: null });
  expect(localStorage.getItem('authToken')).toBeNull();
  expect(localStorage.getItem('authUser')).toBeNull();
  expect(localStorage.getItem('authTokenTime')).toBeNull();
});

test('establishes token and user together and retains stable setter identities', () => {
  const auth = mountAuth();
  const original = auth.current();
  const token = jwt(futureExpiry());
  act(() => {
    expect(original.setSession(token, customer)).toBe(true);
  });

  expect(auth.current()).toMatchObject({ token, user: customer });
  expect(localStorage.getItem('authToken')).toBe(token);
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
  expect(Number(localStorage.getItem('authTokenTime'))).toBeGreaterThan(123);
  ['setSession', 'setToken', 'setUser', 'refreshToken'].forEach((key) => {
    expect(auth.current()[key]).toBe(original[key]);
  });
});

test.each([
  ['a string ID', { id: '12', name: 'Customer', mobile: '9000000000' }],
  ['a userid alias', { userid: '12', name: 'Customer', mobile: '9000000000' }],
  ['a user_id alias', { user_id: '12', name: 'Customer', mobile: '9000000000' }],
  ['a singleton user record', [{ user_id: '12', name: 'Customer', mobile: '9000000000' }]],
])('establishes a session from %s and preserves its customer details', (_, user) => {
  const auth = mountAuth();
  const token = jwt(futureExpiry());
  const source = Array.isArray(user) ? user[0] : user;
  const normalizedUser = { ...source, id: customer.id };
  act(() => {
    expect(auth.current().setSession(token, user)).toBe(true);
  });

  expect(auth.current()).toMatchObject({ token, user: normalizedUser });
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(normalizedUser);
  expect(localStorage.getItem('authToken')).toBe(token);
});

test.each([
  ['an empty user', {}],
  ['an empty singleton user', [{}]],
  ['the guest ID', { id: 0 }],
  ['the string guest ID', { userid: '0' }],
  ['a malformed ID', { user_id: 'invalid' }],
  ['a fractional ID', { id: 12.5 }],
  ['a negative ID', { id: -12 }],
  ['multiple users', [{ id: 12 }, { id: 24 }]],
])('cannot establish an account session from %s', (_, user) => {
  const auth = mountAuth();
  act(() => {
    expect(auth.current().setSession(jwt(futureExpiry()), user)).toBe(false);
  });

  expect(auth.current()).toMatchObject({ token: '', user: null });
  ['authToken', 'authUser', 'authTokenTime'].forEach((key) => {
    expect(localStorage.getItem(key)).toBeNull();
  });
});

test('normalizes a replacement customer record without changing its token', () => {
  const token = jwt(futureExpiry());
  saveSession(token);
  const auth = mountAuth();
  const user = { userid: '12', name: 'Updated customer', mobile: '9000000000' };
  act(() => auth.current().setUser(user));

  expect(auth.current()).toMatchObject({ token, user: { ...user, id: 12 } });
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual({ ...user, id: 12 });
});

test.each([{}, [{}], { id: 0 }, [{ id: 12 }, { id: 24 }]])(
  'rejects an invalid replacement user %j and clears the incomplete session',
  (user) => {
    saveSession(jwt(futureExpiry()));
    const auth = mountAuth();
    act(() => auth.current().setUser(user));

    expect(auth.current()).toMatchObject({ token: '', user: null });
    ['authToken', 'authUser', 'authTokenTime'].forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  }
);

test('keeps a completed login after remount even when its stored login time is old', () => {
  const token = jwt(futureExpiry());
  const original = mountAuth();
  act(() => {
    expect(original.current().setSession(token, customer)).toBe(true);
  });
  original.unmount();

  // The JWT expiry controls the account session, not the guest cache age or
  // an arbitrary lifetime measured from the original login.
  localStorage.setItem('authTokenTime', String(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const refreshed = mountAuth();

  expect(refreshed.current()).toMatchObject({ token, user: customer, isTokenReady: true });
  expect(localStorage.getItem('authToken')).toBe(token);
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
});

test('clearing a token clears the user and every stored session field', () => {
  saveSession(jwt(futureExpiry()));
  const auth = mountAuth();
  act(() => auth.current().setToken(''));
  expect(auth.current()).toMatchObject({ token: '', user: null });
  ['authToken', 'authUser', 'authTokenTime'].forEach((key) => {
    expect(localStorage.getItem(key)).toBeNull();
  });
});

test('rejects a newly issued expired credential without claiming login succeeded', () => {
  const auth = mountAuth();
  act(() => {
    expect(auth.current().setSession(jwt(Math.floor(Date.now() / 1000) - 1), customer)).toBe(false);
  });
  expect(auth.current()).toMatchObject({ token: '', user: null });
  expect(localStorage.getItem('authToken')).toBeNull();
});

test('synchronizes login and logout from another browser tab', () => {
  const auth = mountAuth();
  const token = jwt(futureExpiry(), 'other-tab');
  const user = { id: 24, name: 'Other tab' };
  act(() => {
    saveSession(token, user);
    window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', storageArea: localStorage }));
  });
  expect(auth.current()).toMatchObject({ token, user });

  act(() => {
    clearStoredSession();
    window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', storageArea: localStorage }));
  });
  expect(auth.current()).toMatchObject({ token: '', user: null });
});

test('discards an expired session written by another browser tab', () => {
  saveSession(jwt(futureExpiry()));
  const auth = mountAuth();
  act(() => {
    saveSession(jwt(Math.floor(Date.now() / 1000) - 1));
    window.dispatchEvent(new StorageEvent('storage', { key: 'authUser', storageArea: localStorage }));
  });
  expect(auth.current()).toMatchObject({ token: '', user: null });
  expect(localStorage.getItem('authToken')).toBeNull();
});

test('updates React state after the API expires the current session', () => {
  saveSession(jwt(futureExpiry()));
  const auth = mountAuth();
  act(() => {
    clearStoredSession();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  });
  expect(auth.current()).toMatchObject({ token: '', user: null });
});

test('does not report a successful refresh without a backend replacement token', async () => {
  const auth = mountAuth();
  await expect(auth.current().refreshToken()).resolves.toBe(false);
});
