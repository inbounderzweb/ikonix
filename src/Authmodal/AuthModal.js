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
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

export default function AuthModal({ open, onClose }) {
  const [tab, setTab]            = useState('register');    // 'login' | 'register' | 'otp' | 'reset'
  const [authMethod, setMethod]  = useState('email');    // 'email' | 'mobile'
  const [usePassword, setUsePwd] = useState(false);

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    mobile:   '',
    password: '',
    newPassword: '',
  });

  const [otpDigits, setOtp]      = useState(Array(6).fill(''));
  const [verifyToken, setVToken] = useState('');
  const [otpFlow, setOtpFlow]    = useState(null);       // 'login' | 'register' | 'reset'

  const otpRefs = useRef([]);
  const { token, setUser, setToken } = useAuth();
  const { refresh } = useCart();

  // clear on tab change (but not wiping when entering OTP)
  useEffect(() => {
    if (tab !== 'otp') {
      setForm({ name:'', email:'', mobile:'', password:'', newPassword:'' });
      setOtp(Array(6).fill(''));
      setUsePwd(false);
    }
  }, [tab]);

  const apiPost = (url, payload) =>
    axios.post(url, qs.stringify(payload), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
    });

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* STEP 1a: LOGIN or REGISTER → request OTP */
  const sendOtp = async () => {
    if (!token) return Swal('Auth token missing');
    const isLogin = tab === 'login';
    setOtpFlow(isLogin ? 'login' : 'register');

    // always include all fields
    const base = {
      name:     form.name,
      email:    form.email,
      mobile:   form.mobile,
      password: form.password,
    };

    const payload = isLogin
      ? { ...base, otp_login: 1 }
      : { ...base, otp: 0 };

    try {
      const { data } = await apiPost(
        isLogin ? `${API_BASE}/login` : `${API_BASE}/register`,
        payload
      );
      if (data.otp) {
        setVToken(data.verify_token || data.vtoken);
        setTab('otp');
        Swal(`Your code is ${data.otp}`);
      } else {
        Swal(data.message || 'OTP not received');
    
      }
    } catch (e) {
      console.error(e);
      // alert(e.response?.data?.message || 'Error sending OTP');
      console.log(e.response.data.message)
      if (e.response && e.response.data && e.response.data.message) {
  const messages = e.response.data.message;
  // Get the first error message (regardless of field: email, password, etc.)
  const firstError = Object.values(messages)[0];
  Swal(firstError);
}
      // alert('testing')
    }
  };

  /* STEP 1b: LOGIN with password */
  const loginWithPassword = async () => {
    if (!token) return Swal('Auth token missing');

    const payload = {
      name:     form.name,
      email:    form.email,
      mobile:   form.mobile,
      password: form.password,
      pass_login: 1,
    };

    try {
      const { data } = await apiPost(`${API_BASE}/login`, payload);
      if (!data.token || !data.user) {
        Swal(data.message || 'Login failed');
        return;
      }
      await finalizeLogin(data);
    } catch (e) {
 console.error(e);

if (e.response && e.response.data && e.response.data.message) {
  const messages = e.response.data.message;

  let firstError;

  if (typeof messages === "string") {
    // If it's already a string
    firstError = messages;
  } else if (typeof messages === "object") {
    // If it's an object with field errors
    firstError = Object.values(messages)[0];
  }

  Swal(firstError);
}
      // alert('Network error during password login');
    }
  };

  /* STEP 1c: RESET PASSWORD → request code (otp:0) */
  const resetPwd = async () => {
    if (!token) return Swal('Auth token missing');
    setOtpFlow('reset');

    const payload = {
      name:     form.name,
      email:    form.email,
      mobile:   form.mobile,
      password: form.newPassword, // use password for the new one
      otp:      0,
    };

    try {
      const { data } = await apiPost(`${API_BASE}/forgot-password`, payload);
      if (data.otp) {
        setVToken(data.verify_token || data.vtoken);
        setTab('otp');
        Swal(`Your reset code is ${data.otp}`);
      } else {
        Swal(data.message || 'Failed to send reset code');
      }
    } catch (e) {
      console.error(e);
      Swal('Network error during reset request');
    }
  };

  /* STEP 2: VERIFY OTP for all flows */
  const verifyOtp = async () => {
    const entered = otpDigits.join('');
    if (!entered) return Swal('Enter OTP');

    // RESET flow verify with same payload + otp:1
    if (otpFlow === 'reset') {
      const payload = {
        name:     form.name,
        email:    form.email,
        mobile:   form.mobile,
        password: form.newPassword,  // again new password here
        otp:      1,
        verify_token: verifyToken,
      };
      try {
        const { data } = await apiPost(`${API_BASE}/forgot-password`, payload);
        if (data.status === true) {
          Swal(data.message);
          setTab('login');
        } else {
          Swal(data.message || 'Reset verification failed');
        }
      } catch (e) {
        console.error(e);
        Swal('Server error on reset verify');
      }
      return;
    }

    // LOGIN or REGISTER verify
    const isLogin = otpFlow === 'login';
    const payload = {
      name:     form.name,
      email:    form.email,
      mobile:   form.mobile,
      password: form.password,
      otp:      entered,
      verify_token: verifyToken,
      ...(isLogin ? { otp_login: 2 } : {}),
    };

    try {
      const { data } = await apiPost(
        isLogin ? `${API_BASE}/login` : `${API_BASE}/register`,
        payload
      );
      if (!data.token || !data.user) {
        Swal(data.message || 'Verification failed');
        return;
      }
      await finalizeLogin(data);
    } catch (e) {
      console.error(e);
      Swal('Server error on verify');
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
    
    setOtp('')
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

  /* OTP input handling */
  const handleOtpField = (e, idx) => {
    if (/[^0-9]/.test(e.target.value)) return;
    const next = [...otpDigits];
    next[idx] = e.target.value;
    setOtp(next);
    if (e.target.value && idx < 5) otpRefs.current[idx + 1].focus();
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
          : tab==='otp'     ? 'Enter OTP'
          :                  'Reset Password'}
        </h2>

        {/* Back link */}
        {tab!=='login' && tab!=='otp' && (
          <button
            className="mb-4 text-xs text-[#b49d91] hover:underline"
            onClick={()=>setTab('login')}
          >← Back to Login</button>
        )}

        {/* Method toggle */}
        {['login','register','reset'].includes(tab) && (
          <div className="flex mb-5 rounded-lg overflow-hidden border border-[#eadcd5]">
            <ToggleBtn
              active={authMethod==='email'}
              onClick={()=>{
                setMethod('email');
                setForm(f=>({...f,mobile:''}));
              }}
              icon={<EnvelopeIcon className="w-4 h-4"/>}
              label="Email"
            />
            <ToggleBtn
              active={authMethod==='mobile'}
              onClick={()=>{
                setMethod('mobile');
                setForm(f=>({...f,email:''}));
              }}
              icon={<DevicePhoneMobileIcon className="w-4 h-4"/>}
              label="Mobile"
            />
          </div>
        )}

        {/* LOGIN */}
        {tab==='login' && (
          <div>
            {authMethod==='email'
              ? <Input type="email" placeholder="Email" value={form.email} onChange={e=>handleField('email',e.target.value)}/>
              : <Input type="tel"   placeholder="Mobile" value={form.mobile} onChange={e=>handleField('mobile',e.target.value)}/>
            }

            {!usePassword
              ? <PrimaryBtn onClick={sendOtp} label="Login with OTP"/>
              : <>
                  <Input type="password" placeholder="Password" value={form.password} onChange={e=>handleField('password',e.target.value)}/>
                  <PrimaryBtn onClick={loginWithPassword} label="Login"/>
                </>
            }

            <p className="text-xs text-center text-[#b49d91] cursor-pointer mb-3" onClick={()=>setUsePwd(p=>!p)}>
              {usePassword ? 'Use OTP instead' : 'Use password instead'}
            </p>

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
            {authMethod==='email'
              ? <Input type="email" placeholder="Email" value={form.email} onChange={e=>handleField('email',e.target.value)}/>
              : <Input type="tel"   placeholder="Mobile" value={form.mobile} onChange={e=>handleField('mobile',e.target.value)}/>
            }
            <Input type="password" placeholder="Password" value={form.password} onChange={e=>handleField('password',e.target.value)}/>
            <PrimaryBtn onClick={sendOtp} label="Send verification code"/>
          </div>
        )}

      
       {/* OTP */}
{tab==='otp' && (
  <div>
    {/* ← Back to Login */}
    <button
      className="mb-4 text-xs text-[#b49d91] hover:underline"
      onClick={() => setTab('login')}
    >
      ←  Login
    </button>

    <p className="text-center text-xs text-gray-500 mb-4">Enter the 6-digit code</p>
    <div className="flex justify-between mb-6">
      {otpDigits.map((d,i) => (
        <input
          key={i}
          maxLength={1}
          value={d}
          ref={el => otpRefs.current[i] = el}
          onChange={e => handleOtpField(e, i)}
          className="w-10 h-10 border border-[#eadcd5] text-center rounded focus:ring-1 focus:ring-[#b49d91]"
        />
      ))}
    </div>
    <PrimaryBtn onClick={verifyOtp} label="Verify OTP" />
  </div>
)}





        {/* RESET */}
        {tab==='reset' && (
          <div>
            {authMethod==='email'
              ? <Input type="email" placeholder="Email" value={form.email} onChange={e=>handleField('email',e.target.value)}/>
              : <Input type="tel"   placeholder="Mobile" value={form.mobile} onChange={e=>handleField('mobile',e.target.value)}/>
            }
            <Input type="password" placeholder="New Password" value={form.newPassword} onChange={e=>handleField('newPassword',e.target.value)}/>
            <PrimaryBtn onClick={resetPwd} label="Send Reset Code"/>
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
const PrimaryBtn = ({ onClick, label }) => (
  <button onClick={onClick} className="w-full p-3 bg-[#b49d91] text-white rounded-lg text-sm hover:opacity-90 mb-4">{label}</button>
);
const ToggleBtn = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs ${active?'bg-[#b49d91] text-white':'bg-white text-[#6d5a52]'}`}>{icon}<span>{label}</span></button>
);
