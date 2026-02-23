// src/components/cartdraw/CartDrawer.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartDrawer({ open, onClose }) {
  const [show, setShow] = useState(open);
  const { items, inc, dec, remove, refresh, loading, syncing } = useCart();

  const navigate = useNavigate();
  const location = useLocation();

  const prevOpen = useRef(open);
  const ANIM_MS = 300;

  // refresh on open (only when opening)
  useEffect(() => {
    if (!prevOpen.current && open) refresh();
    prevOpen.current = open;
  }, [open, refresh]);

  // mount/unmount for animation
  useEffect(() => {
    if (open) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // keep checkout in sync
  useEffect(() => {
    if (location.pathname === '/checkout') {
      navigate('/checkout', { state: { cartItems: items }, replace: true });
    }
  }, [items, location.pathname, navigate]);

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0),
    [items]
  );

  const goCheckout = () => {
    onClose();
    navigate('/checkout', { state: { cartItems: items } });
  };

  if (!show) return null;

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
        className={`relative ml-auto h-[90%] rounded-bl-[40px] w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold font-[luxia] text-[#53443D] flex gap-2 items-center">
            <span className="text-[18px]">Cart</span>
            <p className="text-[#8C7367] text-[14px]">
              {totalCount > 0 ? `(${totalCount} items)` : `(0 items)`}
            </p>
          </div>
          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Loader */}
        {(loading || syncing) && (
          <div className="px-4 py-3 text-sm text-gray-600 border-b">
            {syncing ? "Syncing your cart..." : "Loading cart..."}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Your cart is empty.</p>
          ) : (
            items.map(item => (
              <div
                key={`${item.id}-${item.variantid}`}
                className="flex items-start justify-between border-b border-[#B39384] pb-6"
              >
                <div className="flex items-start gap-3 w-full">
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                    alt={item.name}
                    className="w-40 object-cover rounded"
                  />

                  <div className="flex flex-col gap-3 flex-1">
                    <p className="text-[#8C7367] font-[lato] text-[21px] font-[700] tracking-[0.5px] leading-[150%]">
                      {item.name}
                    </p>

                    <span className="text-[#2A3443] font-[lato] text-[21px] font-[700] tracking-[0.5px] leading-[150%]">
                      Rs.{item.price}
                    </span>

                    <div className="flex gap-2 items-center">
                      <span className="text-[#53443D] font-[lato] text-[16px] tracking-[0.5px] leading-[150%]">
                        Qty
                      </span>

                      <div className="border rounded-[24px] border-[#53443D] w-full text-center">
                        <div className="flex items-center justify-between w-full">
                          <button
                            onClick={() => dec(item.cartid, item.id, item.variantid)}
                            className="w-1/3 py-1"
                          >
                            −
                          </button>

                          <span className="w-1/3 text-center">{Number(item.qty) || 0}</span>

                          <button
                            onClick={() => inc(item.cartid, item.id, item.variantid)}
                            className="w-1/3 py-1"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => remove(item.cartid, item.id, item.variantid)}
                        className="text-[#53443D] underline text-sm hover:underline whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-6">
          <button
            onClick={goCheckout}
            disabled={items.length === 0}
            className={`w-full py-3 text-white text-lg rounded-md transition
              ${items.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#b49d91] hover:opacity-90'}`}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
