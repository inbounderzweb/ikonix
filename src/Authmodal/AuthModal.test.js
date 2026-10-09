import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthModal from './AuthModal';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Swal from 'sweetalert';

const mockPost = jest.fn();
jest.mock('../api/client', () => ({
  ...jest.requireActual('../api/client'),
  createApiClient: () => ({ post: (...args) => mockPost(...args) }),
}));
jest.mock('sweetalert', () => jest.fn());

const customer = { id: 12, name: 'Customer', mobile: '9000000000' };
const token = () => `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
let session;

function Login({ onClose }) {
  session = useAuth();
  return <AuthModal open onClose={onClose} />;
}

function mountLogin(onClose = jest.fn()) {
  const view = render(<AuthProvider><Login onClose={onClose} /></AuthProvider>);
  return { ...view, onClose };
}

async function requestOtp() {
  fireEvent.change(screen.getByPlaceholderText('Mobile number'), { target: { value: customer.mobile } });
  fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
  await screen.findByRole('heading', { name: 'Verify OTP' });
}

function enterOtp() {
  screen.getAllByRole('textbox').forEach((input, index) => {
    fireEvent.change(input, { target: { value: String(index + 1) } });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('successful OTP verification persists the complete customer session before closing login', async () => {
  const loginToken = token();
  mockPost
    .mockResolvedValueOnce({ data: { status: true, verify_token: 'verification-token' } })
    .mockResolvedValueOnce({ data: { status: true, token: loginToken, user: customer } });
  const login = mountLogin();
  await requestOtp();
  enterOtp();
  await waitFor(() => expect(login.onClose).toHaveBeenCalledTimes(1));
  expect(session).toMatchObject({ token: loginToken, user: customer });
  expect(localStorage.getItem('authToken')).toBe(loginToken);
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(customer);
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Verify OTP' })).not.toBeInTheDocument();
});

test.each(['success', 'failure'])('a session established elsewhere dismisses an old OTP dialog and ignores its late %s', async (result) => {
  let resolveVerification;
  let rejectVerification;
  mockPost
    .mockResolvedValueOnce({ data: { status: true, verify_token: 'verification-token' } })
    .mockImplementationOnce(() => new Promise((resolve, reject) => {
      resolveVerification = resolve;
      rejectVerification = reject;
    }));
  mountLogin();
  await requestOtp();
  enterOtp();
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
  const currentToken = token();
  const currentUser = { id: 24, name: 'Current customer' };
  act(() => { session.setSession(currentToken, currentUser); });
  expect(screen.queryByRole('heading', { name: 'Verify OTP' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send OTP' })).not.toBeInTheDocument();
  await act(async () => {
    if (result === 'success') resolveVerification({ data: { status: true, token: token(), user: customer } });
    else rejectVerification(new Error('Previous OTP expired'));
  });
  expect(session).toMatchObject({ token: currentToken, user: currentUser });
  expect(JSON.parse(localStorage.getItem('authUser'))).toEqual(currentUser);
  expect(Swal).not.toHaveBeenCalled();
});

test('a failed OTP verification cannot establish a session even if the response includes credentials', async () => {
  mockPost
    .mockResolvedValueOnce({ data: { status: true, verify_token: 'verification-token' } })
    .mockResolvedValueOnce({ data: { status: 'false', token: token(), user: customer, message: 'Verification denied' } });
  const login = mountLogin();
  await requestOtp();
  enterOtp();
  await waitFor(() => expect(Swal).toHaveBeenCalledWith('Verification denied'));
  expect(session).toMatchObject({ token: '', user: null });
  expect(localStorage.getItem('authToken')).toBeNull();
  expect(login.onClose).not.toHaveBeenCalled();
});

test.each([{}, [], [{}], { id: 0 }, { id: 'invalid' }, { id: 12, userid: 24 }])(
  'an incomplete or ambiguous login identity (%j) stays in OTP and never saves a guest account as a customer', async (user) => {
    mockPost
      .mockResolvedValueOnce({ data: { status: true, verify_token: 'verification-token' } })
      .mockResolvedValueOnce({ data: { status: true, message: 'Success', token: token(), user } });
    const login = mountLogin();
    await requestOtp();
    enterOtp();
    await waitFor(() => expect(Swal).toHaveBeenCalledWith('We could not confirm your account. Please try again.'));
    expect(screen.getByRole('heading', { name: 'Verify OTP' })).toBeInTheDocument();
    expect(session).toMatchObject({ token: '', user: null });
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(login.onClose).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledTimes(2);
  }
);

test('an OTP response without credentials cannot display Success as a completed login', async () => {
  mockPost
    .mockResolvedValueOnce({ data: { status: true, verify_token: 'verification-token' } })
    .mockResolvedValueOnce({ data: { status: true, message: 'Success' } });
  const login = mountLogin();
  await requestOtp();
  enterOtp();
  await waitFor(() => expect(Swal).toHaveBeenCalledWith('We could not confirm your account. Please try again.'));
  expect(Swal).not.toHaveBeenCalledWith('Success');
  expect(screen.getByRole('heading', { name: 'Verify OTP' })).toBeInTheDocument();
  expect(login.onClose).not.toHaveBeenCalled();
  expect(localStorage.getItem('authToken')).toBeNull();
});

test('a failed OTP request remains on sign in instead of opening a verification screen', async () => {
  mockPost.mockResolvedValue({ data: { status: 'false', verify_token: 'verification-token', message: 'OTP unavailable' } });
  mountLogin();
  fireEvent.change(screen.getByPlaceholderText('Mobile number'), { target: { value: customer.mobile } });
  fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
  await waitFor(() => expect(Swal).toHaveBeenCalledWith('OTP unavailable'));
  expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Verify OTP' })).not.toBeInTheDocument();
  expect(localStorage.getItem('authToken')).toBeNull();
});
