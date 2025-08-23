// src/components/CartDrawer.js
import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartDrawer({ open, onClose }) {
  const [show, setShow] = useState(open);
  const { items, inc, dec, remove, refresh } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const prevOpen = useRef(open);
  const ANIM_MS = 300;

  // 1) refresh on open
  useEffect(() => {
    if (!prevOpen.current && open) refresh();
    prevOpen.current = open;
  }, [open, refresh]);

  // 2) mount/unmount for animation
  useEffect(() => {
    if (open) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 3) keep checkout in sync
  useEffect(() => {
    if (location.pathname === '/checkout') {
      navigate('/checkout', { state: { cartItems: items }, replace: true });
    }
  }, [items, location.pathname, navigate]);

  if (!show) return null;

  // SAFE reduce: coerce qty to numbers
  const totalCount = items.reduce(
    (sum, i) => (Number(sum) || 0) + (Number(i.qty) || 0),
    0
  );

  const goCheckout = () => {
    onClose();
    navigate('/checkout', { state: { cartItems: items } });
  };

  return (
    <div className={`fixed inset-0 z-[100] flex ${!open ? 'pointer-events-none' : ''}`}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        className={`relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Your Cart {totalCount > 0 && <>({totalCount})</>}
          </h2>
          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Your cart is empty.</p>
          ) : (
            items.map(item => (
              <div
                key={`${item.id}-${item.variantid}`} // stable composite key
                className="border rounded p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">Qty: {Number(item.qty) || 0}</p>
                    <p className="text-xs text-gray-500">variationid:{item.variantid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Decrement */}
                  <button
                    onClick={() => dec(item.cartid, item.id, item.variantid)}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >−</button>

                  {/* Current qty */}
                  <span className="w-6 text-center">{Number(item.qty) || 0}</span>

                  {/* Increment */}
                  <button
                    onClick={() => inc(item.cartid, item.id, item.variantid)}
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >+</button>

                  {/* Remove */}
                  <button
                    onClick={() => remove(item.cartid, item.id, item.variantid)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-6">
          <button
            onClick={goCheckout}
            className="w-full py-3 bg-[#b49d91] text-white text-lg rounded-md hover:opacity-90 transition"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
