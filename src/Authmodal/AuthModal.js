// src/components/AuthModal.js
import React, { useState, useRef } from 'react';
import axios from 'axios';
import qs    from 'qs';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

export default function AuthModal({ open, onClose }) {
  /* ─── form + UI state ───────────────────────────── */
  const [currentTab, setTab]    = useState('login');        // 'login' | 'register' | 'otp' | 'resetPassword'
  const [authMethod, setMethod] = useState('email');        // 'email' | 'mobile'
  const [isPwdLogin, setPwd]    = useState(false);          // password vs OTP
  const [otpDigits, setOtp]     = useState(Array(6).fill(''));
  const [srvOtp, setSrvOtp]     = useState('');
  const [otpFlow, setOtpFlow]   = useState(null);           // null | 'login' | 'register'
  const [form, setForm]         = useState({
    name:'', email:'', mobile:'', password:''
  });
  const otpRefs = useRef([]);
  const { token, setUser } = useAuth();

  /* ─── helper to POST form-urlencoded w/ token ─── */
  const api = (url,payload) => axios.post(
    url,
    qs.stringify(payload),
    {
      headers:{
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  /* ─── send initial OTP (step 1) ───────────────── */
  const sendOtp = async () => {
    if (!token) {
      alert('Auth token missing'); 
      return;
    }
    const isLogin = currentTab === 'login';
    setOtpFlow(isLogin ? 'login' : 'register');

    const url = isLogin
      ? `${API_BASE}/login`
      : `${API_BASE}/register`;

    const payload = isLogin
      ? (authMethod==='email'
          ? { email: form.email,   otp_login: 1 }
          : { mobile: form.mobile, otp_login: 1 })
      : (authMethod==='email'
          ? { name: form.name, email: form.email,   password: form.password, otp: 0 }
          : { name: form.name, mobile: form.mobile, password: form.password, otp: 0 });

    try {
      const { data } = await api(url, payload);
      if (data.otp) {
        setSrvOtp(String(data.otp));
        setTab('otp');
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  /* ─── verify OTP and login/register (step 2) ─── */
  const verifyOtp = async () => {
    const entered = otpDigits.join('');
    if (!entered) {
      alert('Enter OTP');
      return;
    }
    if (entered !== srvOtp) {
      alert('Invalid OTP');
      return;
    }

    const isLogin = otpFlow === 'login';
    const url = isLogin
      ? `${API_BASE}/login`
      : `${API_BASE}/register`;
    const payload = isLogin
      ? (authMethod==='email'
          ? { email: form.email,   otp_login: 2 }
          : { mobile: form.mobile, otp_login: 2 })
      : (authMethod==='email'
          ? { name: form.name, email: form.email,   password: form.password, otp: 1 }
          : { name: form.name, mobile: form.mobile, password: form.password, otp: 1 });

    try {
      const { data } = await api(url, payload);

      // 1) save user/token
      const userInfo = {
        token : data.token,
        id    : data.user.id,
        name  : data.user.name,
        email : data.user.email,
        mobile: data.user.mobile,
      };
      localStorage.setItem('authUser', JSON.stringify(userInfo));
      setUser(userInfo);

      // 2) MERGE server-side cart into existing guestCart
      const guestRaw = JSON.parse(localStorage.getItem('guestCart') || '[]');
      const server   = (await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: data.user.id }),
        {
          headers:{
            Authorization: `Bearer ${data.token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )).data.data || [];

      // build map from guest items
      const map = new Map();
      guestRaw.forEach(item => {
        map.set(item.id, { ...item, qty: Number(item.qty) });
      });

      // overlay server items
      server.forEach(item => {
        const existing = map.get(item.id);
        if (existing) {
          existing.qty += Number(item.qty);
          map.set(item.id, existing);
        } else {
          map.set(item.id, {
            id:    item.id,
            image: item.image,
            name:  item.name,
            price: item.price,
            qty:   Number(item.qty)
          });
        }
      });

      // persist merged back to guestCart
      const merged = Array.from(map.values());
      localStorage.setItem('guestCart', JSON.stringify(merged));

      // 3) reset UI
      setOtp(Array(6).fill(''));
      setTab('login');
      alert('Logged in successfully!');
    } catch (e) {
      console.error(e);
      alert('Server error');
    }
  };

  /* ─── reset password ─────────────────────────── */
  const resetPwd = async () => {
    if (!token) {
      alert('Auth token missing');
      return;
    }
    try {
      const { data } = await api(
        `${API_BASE}/reset-password`,
        { email: form.email, mobile: form.mobile }
      );
      alert(data.success ? 'Reset link sent' : 'Failed');
      if (data.success) setTab('login');
    } catch (e) {
      console.error(e);
      alert('Network error');
    }
  };

  /* ─── OTP input handler ─────────────────────── */
  const handleOtpField = (e,i) => {
    if (/[^0-9]/.test(e.target.value)) return;
    const next = [...otpDigits];
    next[i] = e.target.value;
    setOtp(next);
    if (e.target.value && i < 5) otpRefs.current[i+1].focus();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-96 p-8 rounded-lg shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-semibold">
            { currentTab==='login'        ? 'SIGN IN'
            : currentTab==='register'     ? 'CREATE ACCOUNT'
            : currentTab==='otp'          ? 'ENTER OTP'
            :                              'RESET PASSWORD'}
          </h2>
          <button onClick={onClose}>X</button>
        </div>

        {/* back */}
        {currentTab !== 'login' && (
          <button
            className="mb-4 text-sm text-blue-600"
            onClick={() => setTab('login')}
          >
            ← Back
          </button>
        )}

        {/* email vs mobile toggle */}
        {['login','register','resetPassword'].includes(currentTab) && (
          <div className="flex mb-4">
            {['email','mobile'].map(m => (
              <button
                key={m}
                className={`w-1/2 p-2 ${
                  authMethod===m ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
                onClick={() => setMethod(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* ───────── LOGIN UI ───────── */}
        {currentTab === 'login' && (
          <div>
            <p className="text-center text-sm mb-4">Login with OTP</p>
            {authMethod==='email'
              ? (
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )
              : (
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={form.mobile}
                  onChange={e=>setForm({...form,mobile:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )}
            {!isPwdLogin && (
              <button
                onClick={sendOtp}
                className="w-full p-3 bg-blue-500 text-white rounded mb-4"
              >
                Login with OTP
              </button>
            )}
            {isPwdLogin && (
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e=>setForm({...form,password:e.target.value})}
                className="w-full p-3 border rounded mb-4"
              />
            )}
            <p
              className="text-sm text-blue-600 text-center cursor-pointer mb-4"
              onClick={()=>setPwd(!isPwdLogin)}
            >
              {isPwdLogin ? 'Use OTP instead' : 'Use password instead'}
            </p>
            <div className="text-center space-y-1">
              <p
                className="text-sm text-blue-600 cursor-pointer"
                onClick={()=>setTab('resetPassword')}
              >
                Forgot password?
              </p>
              <p className="text-sm">
                Don’t have an account?{' '}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={()=>setTab('register')}
                >
                  Sign up
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ───────── REGISTER UI ───────── */}
        {currentTab === 'register' && (
          <div>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={e=>setForm({...form,name:e.target.value})}
              className="w-full p-3 border rounded mb-4"
            />
            {authMethod==='email'
              ? (
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )
              : (
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={form.mobile}
                  onChange={e=>setForm({...form,mobile:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )}
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
              className="w-full p-3 border rounded mb-4"
            />
            <button
              onClick={sendOtp}
              className="w-full p-3 bg-blue-500 text-white rounded"
            >
              Send verification code
            </button>
          </div>
        )}

        {/* ───────── OTP UI ───────── */}
        {currentTab === 'otp' && (
          <div>
            <p className="text-center mb-4">Enter the 6-digit code</p>
            <div className="flex justify-between mb-4">
              {otpDigits.map((d,i)=>(
                <input
                  key={i}
                  maxLength={1}
                  value={d}
                  ref={el=>otpRefs.current[i]=el}
                  onChange={e=>handleOtpField(e,i)}
                  className="w-10 h-10 border text-center rounded"
                />
              ))}
            </div>
            <button
              onClick={verifyOtp}
              className="w-full p-3 bg-blue-500 text-white rounded"
            >
              Verify OTP
            </button>
          </div>
        )}

        {/* ───────── RESET PASSWORD UI ───────── */}
        {currentTab === 'resetPassword' && (
          <div>
            {authMethod==='email'
              ? (
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )
              : (
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={form.mobile}
                  onChange={e=>setForm({...form,mobile:e.target.value})}
                  className="w-full p-3 border rounded mb-4"
                />
              )}
            <button
              onClick={resetPwd}
              className="w-full p-3 bg-blue-500 text-white rounded"
            >
              Send reset link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
