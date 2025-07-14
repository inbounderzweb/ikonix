import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import qs from 'qs';

export default function CartDrawer({ open, onClose }) {
  const [show, setShow]   = useState(open);
  const [cartItems, setItems] = useState([]);

  const { user, token } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();

  const ANIM_MS = 300; // matches `duration-300` in transition classes
  /* ───────── push fresh state to /checkout on every change ───────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.pathname === '/checkout') {
      navigate('/checkout', { state: { cartItems }, replace: true });
    }
  }, [cartItems, location.pathname, navigate]);
  /* ───────── handle open / close ───────── */
  useEffect(() => {
    if (open) {
      setShow(true);
      fetchCart();
    } else {
      /* guarantee overlay removal even if transitionend fails */
      const t = setTimeout(() => setShow(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [open]);                                             // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null; // overlay removed → header clickable again

  /* ───────── fetch cart from server once ───────── */
  async function fetchCart() {
    if (!token || !user) return;
    try {
      const { data } = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({ userid: user.id }),
        { headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/x-www-form-urlencoded' } }
      );
      if (data.status && Array.isArray(data.data)) {
        setItems(data.data.map(it => ({ ...it, qty: Number(it.qty) })));
      } else setItems([]);
    } catch (e) { console.error('Fetch cart error', e); }
  }

  /* ───────── local increment / decrement ───────── */
  const inc = id => setItems(p => p.map(it =>
    it.cartid === id ? { ...it, qty: it.qty + 1 } : it
  ));
  const dec = id => setItems(p => p.map(it =>
    it.cartid === id ? { ...it, qty: Math.max(1, it.qty - 1) } : it
  ));

  /* ───────── remove line-item (API) ───────── */
  async function remove(cartid) {
    if (!token || !user) return;
    try {
      await axios.post(
        'https://ikonixperfumer.com/beta/api/delete-cart',
        qs.stringify({ userid: user.id, cartid }),
        { headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/x-www-form-urlencoded' } }
      );
      setItems(p => p.filter(it => it.cartid !== cartid));
    } catch (e) { console.error('Delete failed', e); }
  }



  /* ───────── proceed to checkout ───────── */
  const handleCheckout = () => {
    onClose();
    navigate('/checkout', { state: { cartItems } });
  };

  /* ───────── Render ───────── */
  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Your cart is empty.</p>
          ) : cartItems.map(item => (
            <div key={item.cartid} className="border rounded p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => dec(item.cartid)} className="px-2 py-1 bg-gray-200 rounded">−</button>
                <span className="w-6 text-center">{item.qty}</span>
                <button onClick={() => inc(item.cartid)} className="px-2 py-1 bg-gray-200 rounded">+</button>
                <button onClick={() => remove(item.cartid)} className="text-red-500 text-sm">Remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-6">
          <button
            onClick={handleCheckout}
            className="w-full py-3 bg-[#b49d91] text-white text-lg rounded-md hover:opacity-90 transition"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
