// src/components/AuthModal.js
import React, { useState, useRef } from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  XMarkIcon,
  LockClosedIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { data } from 'react-router-dom';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

export default function AuthModal({ open, onClose }) {
  const [tab, setTab]               = useState('login');   // 'login' | 'register' | 'otp' | 'reset'
  const [authMethod, setMethod]     = useState('email');   // 'email' | 'mobile'
  const [usePassword, setUsePwd]    = useState(false);

  const [otpDigits, setOtp]         = useState(Array(6).fill(''));
  const [serverOtp, setServerOtp]   = useState('');
  const [verifyToken, setVToken]    = useState('');        // backend-provided verification token
  const [otpFlow, setOtpFlow]       = useState(null);      // 'login' | 'register'

  const [form, setForm]             = useState({
    name:'', email:'', mobile:'', password:''
  });

  const otpRefs = useRef([]);

  const { token, setUser, setToken } = useAuth();
  const { refresh } = useCart();

  /* ----------------- generic POST ----------------- */
  const apiPost = (url, payload, bearer = token) =>
    axios.post(url, qs.stringify(payload), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
    });

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ----------------- STEP 1: SEND OTP ----------------- */
  const sendOtp = async () => {
    if (!token) { alert('Auth token missing'); return; }
    const isLogin = tab === 'login';
    setOtpFlow(isLogin ? 'login' : 'register');

    const url = isLogin ? `${API_BASE}/login` : `${API_BASE}/register`;
    const payload = isLogin
      ? authMethod === 'email'
        ? { email: form.email,  otp_login: 1 }
        : { mobile: form.mobile, otp_login: 1 }
      : authMethod === 'email'
        ? { name: form.name, email: form.email, password: form.password, otp: 0 }
        : { name: form.name, mobile: form.mobile, password: form.password, otp: 0 };

    try {
      const { data } = await apiPost(url, payload, token);
      if (data.otp) {
        setServerOtp(String(data.otp));
        setVToken(data.verify_token || data.verification_token || data.vtoken || '');
        setTab('otp');
        alert(data.otp)
      } else {
        alert(data.message || 'OTP not received');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  /* ----------------- PASSWORD LOGIN ----------------- */
  const loginWithPassword = async () => {
    if (!token) { alert('Auth token missing'); return; }
    const url = `${API_BASE}/login`;
    const payload =
      authMethod === 'email'
        ? { email: form.email,  password: form.password, pass_login: 1 }
        : { mobile: form.mobile, password: form.password, pass_login: 1 };

    try {
      const { data } = await apiPost(url, payload, token);
      if (!data?.token || !data?.user) {
        alert(data.message || 'Login failed');
        return;
      }
      await finalizeLogin(data);
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  /* ----------------- STEP 2: VERIFY OTP ----------------- */
  const verifyOtp = async () => {
    const entered = otpDigits.join('');
    if (!entered) return alert('Enter OTP');

    const isLogin = otpFlow === 'login';
    const url = isLogin ? `${API_BASE}/login` : `${API_BASE}/register`;

    const base = isLogin
      ? authMethod === 'email'
        ? { email: form.email,  otp_login: 2 }
        : { mobile: form.mobile, otp_login: 2 }
      : authMethod === 'email'
        ? { name: form.name, email: form.email, password: form.password, otp: 1 }
        : { name: form.name, mobile: form.mobile, password: form.password, otp: 1 };

    const payload = { ...base, otp: entered };
    if (verifyToken) payload.verify_token = verifyToken;

    try {
      const { data } = await apiPost(url, payload, token);
    
      if (!data?.token || !data?.user) {
        alert(data.message || 'Verification failed');
        return;
      }
      await finalizeLogin(data);
    } catch (e) {
      console.error(e);
      alert('Server error');
    }
  };

  /* ----------------- RESET PASSWORD ----------------- */
  const resetPwd = async () => {
    if (!token) { alert('Auth token missing'); return; }
    try {
      const { data } = await apiPost(
        `${API_BASE}/reset-password`,
        { email: form.email, mobile: form.mobile },
        token
      );
      alert(data.success ? 'Reset link sent' : (data.message || 'Failed'));
      if (data.success) setTab('login');
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  /* ----------------- FINALIZE LOGIN ----------------- */
  const finalizeLogin = async (data) => {
    const userInfo = {
      id:     data.user.id,
      name:   data.user.name,
      email:  data.user.email,
      mobile: data.user.mobile,
    };
    setUser(userInfo);
    setToken(data.token);
    localStorage.setItem('authUser',  JSON.stringify(userInfo));
    localStorage.setItem('authToken', data.token);

    // Guest cart sync
    try {
      const srv1 = await apiPost(`${API_BASE}/cart`, { userid: data.user.id }, data.token);
      const serverItems = Array.isArray(srv1.data.data) ? srv1.data.data : [];
      const serverIds   = new Set(serverItems.map(i => i.id));

      const guest = JSON.parse(localStorage.getItem('guestCart') || '[]');
      await Promise.all(
        guest
          .filter(g => !serverIds.has(g.id))
          .map(g =>
            apiPost(
              `${API_BASE}/cart`,
              { userid: data.user.id, productid: g.id, qty: g.qty },
              data.token
            ).catch(err => console.error('Sync fail', g.id, err))
          )
      );

      const srv2 = await apiPost(`${API_BASE}/cart`, { userid: data.user.id }, data.token);
      const fresh = Array.isArray(srv2.data.data) ? srv2.data.data : [];
      const normalized = fresh.map(i => ({
        id:    i.id,
        image: i.image,
        name:  i.name,
        price: i.price,
        qty:   Number(i.qty),
      }));
      localStorage.setItem('guestCart', JSON.stringify(normalized));
    } catch (err) {
      console.error('Cart sync error:', err);
    }

    await refresh();
    setOtp(Array(6).fill(''));
    setTab('login');
    onClose?.();
  };

  /* ----------------- OTP inputs ----------------- */
  const handleOtpField = (e, idx) => {
    if (/[^0-9]/.test(e.target.value)) return;
    const next = [...otpDigits];
    next[idx] = e.target.value;
    setOtp(next);
    if (e.target.value && idx < 5) otpRefs.current[idx + 1].focus();
  };

  /* ----------------- RENDER ----------------- */
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative bg-white w-[92%] max-w-sm rounded-2xl shadow-xl px-6 pb-7 pt-10 animate-fadeIn scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>

        {/* Top icon */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#b49d91] text-white rounded-full p-3 shadow-md">
          <LockClosedIcon className="w-6 h-6" />
        </div>

        {/* Title */}
        <h2 className="text-center text-xl font-semibold text-[#2A3443] mb-6">
          {tab === 'login'    ? 'Sign In'
          : tab === 'register' ? 'Create Account'
          : tab === 'otp'      ? 'Enter OTP'
          : 'Reset Password'}
        </h2>

        {/* Back link */}
        {tab !== 'login' && tab !== 'otp' && (
          <button
            className="mb-4 text-xs text-[#b49d91] hover:underline"
            onClick={() => setTab('login')}
          >
            ← Back to Login
          </button>
        )}

        {/* Method toggle */}
        {['login','register','reset'].includes(tab) && (
          <div className="flex mb-5 rounded-lg overflow-hidden border border-[#eadcd5]">
            <ToggleBtn
              active={authMethod === 'email'}
              onClick={() => setMethod('email')}
              icon={<EnvelopeIcon className="w-4 h-4" />}
              label="Email"
            />
            <ToggleBtn
              active={authMethod === 'mobile'}
              onClick={() => setMethod('mobile')}
              icon={<DevicePhoneMobileIcon className="w-4 h-4" />}
              label="Mobile"
            />
          </div>
        )}

        {/* LOGIN */}
        {tab === 'login' && (
          <div>
            {authMethod==='email' ? (
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e)=>handleField('email', e.target.value)}
              />
            ) : (
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={form.mobile}
                onChange={(e)=>handleField('mobile', e.target.value)}
              />
            )}

            {!usePassword ? (
              <PrimaryBtn onClick={sendOtp} label="Login with OTP" />
            ) : (
              <>
                <Input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e)=>handleField('password', e.target.value)}
                />
                <PrimaryBtn onClick={loginWithPassword} label="Login" />
              </>
            )}

            <p
              className="text-xs text-center text-[#b49d91] cursor-pointer mb-3"
              onClick={() => setUsePwd(p => !p)}
            >
              {usePassword ? 'Use OTP instead' : 'Use password instead'}
            </p>

            <div className="text-center space-y-1 text-xs">
              <p
                className="text-[#b49d91] cursor-pointer"
                onClick={() => setTab('reset')}
              >
                Forgot password?
              </p>
              <p>
                Don’t have an account?{' '}
                <span
                  className="text-[#b49d91] cursor-pointer underline"
                  onClick={() => setTab('register')}
                >
                  Sign up
                </span>
              </p>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {tab === 'register' && (
          <div>
            <Input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e)=>handleField('name', e.target.value)}
            />
            {authMethod==='email' ? (
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e)=>handleField('email', e.target.value)}
              />
            ) : (
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={form.mobile}
                onChange={(e)=>handleField('mobile', e.target.value)}
              />
            )}
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e)=>handleField('password', e.target.value)}
            />
            <PrimaryBtn onClick={sendOtp} label="Send verification code" />
          </div>
        )}

        {/* OTP */}
        {tab === 'otp' && (
          <div>
            <p className="text-center text-xs text-gray-500 mb-4">
              Enter the 6-digit code
            </p>
            <div className="flex justify-between mb-6">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  maxLength={1}
                  value={d}
                  ref={el => otpRefs.current[i] = el}
                  onChange={e => handleOtpField(e, i)}
                  className="w-10 h-10 border border-[#eadcd5] text-center rounded focus:outline-none focus:ring-1 focus:ring-[#b49d91]"
                />
              ))}
            </div>
            <PrimaryBtn onClick={verifyOtp} label="Verify OTP" />
          </div>
        )}

        {/* RESET PASSWORD */}
        {tab === 'reset' && (
          <div>
            {authMethod==='email' ? (
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e)=>handleField('email', e.target.value)}
              />
            ) : (
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={form.mobile}
                onChange={(e)=>handleField('mobile', e.target.value)}
              />
            )}
            <PrimaryBtn onClick={resetPwd} label="Send reset link" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

const Input = (props) => (
  <input
    {...props}
    className={`w-full p-3 mb-4 border border-[#eadcd5] rounded-lg text-sm
      focus:outline-none focus:ring-1 focus:ring-[#b49d91] ${props.className || ''}`}
  />
);

const PrimaryBtn = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="w-full p-3 bg-[#b49d91] text-white rounded-lg text-sm hover:opacity-90 transition mb-4"
  >
    {label}
  </button>
);

const ToggleBtn = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs
      ${active ? 'bg-[#b49d91] text-white' : 'bg-white text-[#6d5a52]'}`}
  >
    {icon}
    {label}
  </button>
);

/* Tailwind animation (optional):
   Add this to your globals if you want fadeIn:
   @keyframes fadeIn { from {opacity:0; transform:scale(.98)} to {opacity:1; transform:scale(1)} }
   .animate-fadeIn { animation: fadeIn .25s ease-out; }
*/
