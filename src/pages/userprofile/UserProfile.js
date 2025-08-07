// src/pages/account/UserProfile.js
import React, { useState } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function UserProfile() {
  const { user, setUser, setToken } = useAuth();
  const navigate = useNavigate();

  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authUser');
    setUser(null);
    // setToken('');
    navigate('/');
  };

  const copyToClipboard = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#6d5a52]">
        Loading…
      </div>
    );
  }

  const masked = (str = '') =>
    str.length <= 8 ? '********' : `${str.slice(0, 4)}…${str.slice(-4)}`;

  return (
    <div className="min-h-screen bg-[#fdf8f5] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb (optional) */}
        <nav className="text-xs text-gray-500 mb-6">
          <Link to="/" className="hover:underline">Home</Link>
          <span> / </span>
          <span className="text-gray-700">My Profile</span>
        </nav>

        <h1 className="text-4xl font-semibold text-[#6d5a52] mb-8">My Profile</h1>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#eadcd5] overflow-hidden">
          {/* Header */}
          <div className="bg-[#eadcd5] px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#6d5a52]">Account Details</h2>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm bg-[#1e2633] text-white px-4 py-2 rounded-xl hover:opacity-90 transition"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5 text-[#6d5a52]">
            <Row label="Name" value={user.name || 'Guest'} />
            {user.email && <Row label="Email" value={user.email} />}
            {user.mobile && <Row label="Mobile" value={user.mobile} />}
            
            <Row label="User ID" value={user.id} copyable onCopy={copyToClipboard} copied={copied} />
            <TokenRow
              label="Token"
              value={user.token}
              show={showToken}
              onToggle={() => setShowToken(s => !s)}
              onCopy={copyToClipboard}
              copied={copied}
            />
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink to="/orders" title="My Orders" />
          <QuickLink to="/addresses" title="My Addresses" />
          <QuickLink to="/wishlist" title="My Wishlist" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Small sub components ---------- */

function Row({ label, value, copyable = false, onCopy, copied }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
      <span className="font-medium text-[#2A3443]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="break-all">{value}</span>
        {copyable && (
          <button
            onClick={() => onCopy(value)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Copy"
          >
            <ClipboardDocumentIcon className="w-4 h-4 text-[#6d5a52]" />
          </button>
        )}
        {copied && <span className="text-xs text-green-600 ml-1">Copied!</span>}
      </div>
    </div>
  );
}

function TokenRow({ label, value, show, onToggle, onCopy, copied }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
      <span className="font-medium text-[#2A3443]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="break-all">
          {show ? value : masked(value)}
        </span>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded"
          title={show ? 'Hide' : 'Show'}
        >
          {show ? (
            <EyeSlashIcon className="w-4 h-4 text-[#6d5a52]" />
          ) : (
            <EyeIcon className="w-4 h-4 text-[#6d5a52]" />
          )}
        </button>
        <button
          onClick={() => onCopy(value)}
          className="p-1 hover:bg-gray-100 rounded"
          title="Copy token"
        >
          <ClipboardDocumentIcon className="w-4 h-4 text-[#6d5a52]" />
        </button>
        {copied && <span className="text-xs text-green-600 ml-1">Copied!</span>}
      </div>
    </div>
  );
}

/* Quick link card */
function QuickLink({ to, title }) {
  return (
    <Link
      to={to}
      className="bg-white border border-[#eadcd5] rounded-2xl px-6 py-5 text-[#6d5a52] hover:shadow-md transition flex items-center justify-between text-sm font-medium"
    >
      {title}
      <span className="text-[#b49d91]">→</span>
    </Link>
  );
}

/* util */
function masked(str = '') {
  return str.length <= 8 ? '********' : `${str.slice(0, 4)}…${str.slice(-4)}`;
}
