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
  ['an expired token', () => jwt(Math.floor(Date.now() / 1000) - 1), JSON.stringify(customer)],
  ['a malformed token', () => 'broken-token', JSON.stringify(customer)],
  ['broken user JSON', () => jwt(futureExpiry()), '{broken'],
  ['a missing user', () => jwt(futureExpiry()), null],
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
