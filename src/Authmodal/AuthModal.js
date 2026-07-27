// src/components/AuthModal.js
import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  XMarkIcon,
  LockClosedIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

const API_BASE = 'https://ikonixperfumer.com/beta/api';
const RESEND_SECONDS = 30;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const OTP_LENGTH = 4;

export default function AuthModal({ open, onClose }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'otp' | 'reset'

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: '',
    newPassword: '',
  });

  const [otpDigits, setOtp]      = useState(Array(OTP_LENGTH).fill(''));
  const [verifyToken, setVToken] = useState('');
  const [otpFlow, setOtpFlow]    = useState(null); // 'login' | 'register' | 'reset'
  const [mobileError, setMobileError] = useState('');
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn]   = useState(0);

  const otpRefs = useRef([]);
  const { token, setUser, setToken } = useAuth();
  const { refresh } = useCart();

  // clear fields whenever we leave the OTP screen
  useEffect(() => {
    if (tab !== 'otp') {
      setForm({ name: '', mobile: '', password: '', newPassword: '' });
      setOtp(Array(OTP_LENGTH).fill(''));
      setMobileError('');
    }
  }, [tab]);

  // focus first box + start resend countdown when entering OTP screen
  useEffect(() => {
    if (tab === 'otp') {
      otpRefs.current[0]?.focus();
      setResendIn(RESEND_SECONDS);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'otp' || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [tab, resendIn]);

  // auto-verify once all digits are entered
  useEffect(() => {
    if (tab === 'otp' && otpDigits.every(d => d !== '') && !verifying) {
      verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpDigits]);

  const apiPost = (url, payload) =>
    axios.post(url, qs.stringify(payload), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
    });

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const extractError = (e, fallback) => {
    const messages = e.response?.data?.message;
    if (!messages) return fallback;
    if (typeof messages === 'string') return messages;
    if (typeof messages === 'object') return Object.values(messages)[0] || fallback;
    return fallback;
  };

  const validateMobile = () => {
    if (!MOBILE_REGEX.test(form.mobile)) {
      setMobileError('Enter a valid 10-digit mobile number');
      return false;
    }
    setMobileError('');
    return true;
  };

  /* STEP 1: LOGIN / REGISTER / RESET → request OTP */
  const sendOtp = async (flow = tab) => {
    if (!token) return Swal('Auth token missing');
    if (!validateMobile()) return;
    if (flow === 'register' && !form.name.trim()) return Swal('Enter your name');
    if (flow === 'reset' && form.newPassword.length < 6) return Swal('New password must be at least 6 characters');

    setOtpFlow(flow);
    setSending(true);

    let url, payload;
    if (flow === 'login') {
      url = `${API_BASE}/login`;
      payload = { name: form.name, mobile: form.mobile, password: form.password, otp_login: 1 };
    } else if (flow === 'register') {
      url = `${API_BASE}/register`;
      payload = { name: form.name, mobile: form.mobile, password: form.password, otp: 0 };
    } else {
      url = `${API_BASE}/forgot-password`;
      payload = { name: form.name, mobile: form.mobile, password: form.newPassword, otp: 0 };
    }

    try {
      const { data } = await apiPost(url, payload);
      if (data.status === false) {
        Swal(data.message || 'Failed to send OTP');
        return;
      }
      setVToken(data.verify_token || data.vtoken || '');
      setTab('otp');
    } catch (e) {
      console.error(e);
      Swal(extractError(e, 'Error sending OTP'));
    } finally {
      setSending(false);
    }
  };

  /* STEP 2: VERIFY OTP for all flows */
  const verifyOtp = async () => {
    const entered = otpDigits.join('');
    if (entered.length < OTP_LENGTH) return Swal(`Enter the ${OTP_LENGTH}-digit OTP`);

    setVerifying(true);
    try {
      if (otpFlow === 'reset') {
        const payload = {
          name: form.name,
          mobile: form.mobile,
          password: form.newPassword,
          otp: 1,
          verify_token: verifyToken,
        };
        const { data } = await apiPost(`${API_BASE}/forgot-password`, payload);
        if (data.status === true) {
          Swal(data.message || 'Password reset successful');
          setTab('login');
        } else {
          Swal(data.message || 'Reset verification failed');
        }
        return;
      }

      const isLogin = otpFlow === 'login';
      const payload = {
        name: form.name,
        mobile: form.mobile,
        password: form.password,
        otp: entered,
        verify_token: verifyToken,
        ...(isLogin ? { otp_login: 2 } : {}),
      };
      const { data } = await apiPost(isLogin ? `${API_BASE}/login` : `${API_BASE}/register`, payload);
      if (!data.token || !data.user) {
        Swal(data.message || 'Verification failed');
        return;
      }
      await finalizeLogin(data);
    } catch (e) {
      console.error(e);
      Swal(extractError(e, 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  /* FINALIZE login/register */
  const finalizeLogin = async (data) => {
    const userInfo = {
      id:     data.user.id,
      name:   data.user.name,
      email:  data.user.email,
      mobile: data.user.mobile,
    };

    setOtp(Array(OTP_LENGTH).fill(''));
    setTab('login');
    setUser(userInfo);
    setToken(data.token);
    localStorage.setItem('authUser',  JSON.stringify(userInfo));
    localStorage.setItem('authToken', data.token);

    // sync guest cart
    try {
      const srv1 = await apiPost(`${API_BASE}/cart`, { userid: data.user.id });
      const serverItems = Array.isArray(srv1.data.data) ? srv1.data.data : [];
      const serverIds = new Set(serverItems.map(i => i.id));

      const guest = JSON.parse(localStorage.getItem('guestCart') || '[]');
      await Promise.all(
        guest
          .filter(g => !serverIds.has(g.id))
          .map(g =>
            apiPost(`${API_BASE}/cart`, {
              userid: data.user.id,
              productid: g.id,
              qty: g.qty,
            }).catch(err => console.error('Sync fail', g.id, err))
          )
      );

      const srv2 = await apiPost(`${API_BASE}/cart`, { userid: data.user.id });
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
    onClose?.();
  };

  /* OTP input handling: type, backspace, paste */
  const handleOtpField = (e, idx) => {
    const digits = e.target.value.replace(/\D/g, '');
    const next = [...otpDigits];
    next[idx] = digits ? digits[digits.length - 1] : '';
    setOtp(next);
    if (digits && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
      setOtp(d => { const n = [...d]; n[idx - 1] = ''; return n; });
    }
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    text.split('').forEach((c, i) => { next[i] = c; });
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  const resendOtp = () => {
    if (resendIn > 0) return;
    sendOtp(otpFlow);
    setResendIn(RESEND_SECONDS);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>

      <div
        className="relative bg-white w-[92%] max-w-sm rounded-2xl shadow-xl px-6 pb-7 pt-10 animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100">
          <XMarkIcon className="w-5 h-5 text-gray-500"/>
        </button>
        {/* Icon */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#b49d91] text-white rounded-full p-3 shadow-md">
          <LockClosedIcon className="w-6 h-6"/>
        </div>
        {/* Title */}
        <h2 className="text-center text-xl font-semibold text-[#2A3443] mb-6">
          {tab==='login'   ? 'Sign In'
          : tab==='register'? 'Create Account'
          : tab==='otp'     ? 'Verify OTP'
          :                  'Reset Password'}
        </h2>

        {/* Back link */}
        {tab!=='login' && tab!=='otp' && (
          <button
            className="mb-4 text-xs text-[#b49d91] hover:underline"
            onClick={()=>setTab('login')}
          >← Back to Login</button>
        )}

        {/* LOGIN */}
        {tab==='login' && (
          <div>
            <MobileInput value={form.mobile} onChange={v=>handleField('mobile', v)} error={mobileError}/>
            <PrimaryBtn onClick={()=>sendOtp('login')} label="Send OTP" loading={sending} loadingLabel="Sending OTP..." disabled={!MOBILE_REGEX.test(form.mobile)}/>

            <div className="text-center space-y-1 text-xs">
              <p className="text-[#b49d91] cursor-pointer" onClick={()=>setTab('reset')}>Forgot password?</p>
              <p>Don’t have an account?{' '}
                <span className="text-[#b49d91] cursor-pointer underline" onClick={()=>setTab('register')}>Sign up</span>
              </p>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {tab==='register' && (
          <div>
            <Input type="text" placeholder="Full name" value={form.name} onChange={e=>handleField('name',e.target.value)}/>
            <MobileInput value={form.mobile} onChange={v=>handleField('mobile', v)} error={mobileError}/>
            <Input type="password" placeholder="Password" value={form.password} onChange={e=>handleField('password',e.target.value)}/>
            <PrimaryBtn onClick={()=>sendOtp('register')} label="Send verification code" loading={sending} loadingLabel="Sending..." disabled={!form.name.trim() || !MOBILE_REGEX.test(form.mobile)}/>
          </div>
        )}

        {/* OTP */}
        {tab==='otp' && (
          <div>
            <button
              className="mb-4 text-xs text-[#b49d91] hover:underline"
              onClick={() => setTab(otpFlow || 'login')}
            >
              ← Change number
            </button>

            <p className="text-center text-xs text-gray-500 mb-1">Enter the {OTP_LENGTH}-digit code sent to</p>
            <p className="text-center text-sm font-medium text-[#2A3443] mb-5">+91 {form.mobile}</p>

            <div className="flex justify-center gap-4 mb-2" onPaste={handleOtpPaste}>
              {otpDigits.map((d,i) => (
                <input
                  key={i}
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={i===0 ? 'one-time-code' : 'off'}
                  value={d}
                  ref={el => otpRefs.current[i] = el}
                  onChange={e => handleOtpField(e, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  className="w-10 h-10 border border-[#eadcd5] text-center rounded focus:outline-none focus:ring-1 focus:ring-[#b49d91]"
                />
              ))}
            </div>

            <div className="text-center text-xs mb-5">
              {resendIn > 0
                ? <span className="text-gray-400">Resend OTP in {resendIn}s</span>
                : <span className="text-[#b49d91] cursor-pointer hover:underline" onClick={resendOtp}>Resend OTP</span>
              }
            </div>

            <PrimaryBtn onClick={verifyOtp} label="Verify OTP" loading={verifying} loadingLabel="Verifying..." disabled={otpDigits.some(d => d === '')}/>
          </div>
        )}

        {/* RESET */}
        {tab==='reset' && (
          <div>
            <MobileInput value={form.mobile} onChange={v=>handleField('mobile', v)} error={mobileError}/>
            <Input type="password" placeholder="New Password" value={form.newPassword} onChange={e=>handleField('newPassword',e.target.value)}/>
            <PrimaryBtn onClick={()=>sendOtp('reset')} label="Send Reset Code" loading={sending} loadingLabel="Sending..." disabled={!MOBILE_REGEX.test(form.mobile) || form.newPassword.length < 6}/>
          </div>
        )}
      </div>
    </div>
  );
}

/* UI helpers */
const Input = props => (
  <input {...props} className="w-full p-3 mb-4 border border-[#eadcd5] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#b49d91]" />
);

const MobileInput = ({ value, onChange, error }) => (
  <div>
    <div className={`flex items-center border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#b49d91] ${error ? 'border-red-400' : 'border-[#eadcd5]'}`}>
      <span className="flex items-center gap-1 px-3 py-3 bg-[#faf6f4] text-sm text-[#6d5a52] border-r border-[#eadcd5]">
        <DevicePhoneMobileIcon className="w-4 h-4"/>
        +91
      </span>
      <input
        type="tel"
        inputMode="numeric"
        maxLength={10}
        placeholder="Mobile number"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        className="flex-1 p-3 text-sm focus:outline-none"
      />
    </div>
    <p className={`text-xs mt-1 mb-3 ${error ? 'text-red-500' : 'invisible'}`}>{error || 'placeholder'}</p>
  </div>
);

const PrimaryBtn = ({ onClick, label, loading, loadingLabel, disabled }) => (
  <button
    onClick={onClick}
    disabled={loading || disabled}
    className={`w-full p-3 rounded-lg text-sm mb-4 ${loading || disabled ? 'bg-[#b49d91]/60 text-white cursor-not-allowed' : 'bg-[#b49d91] text-white hover:opacity-90'}`}
  >
    {loading ? (loadingLabel || 'Please wait...') : label}
  </button>
);
