import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * CartDrawer – pure‑Tailwind slide‑in cart (no HeadlessUI dependency).
 *
 * Props
 * ▸ open          : boolean – controls visibility
 * ▸ onClose       : () => void – close handler (backdrop ➜ onClose, X ➜ onClose)
 * ▸ cart          : array  – [{ id, title, price, qty, img }]
 * ▸ onInc / onDec : (id)   – quantity adjust callbacks
 * ▸ onRemove      : (id)   – remove line‑item callback
 * ▸ recommended   : array  – [{ id, title, img }] (optional)
 *
 * This component stays mounted long enough to play the close animation,
 * then unmounts itself automatically (using local `show` flag).
 */
export default function CartDrawer({
  open,
  onClose,
  cart = [],
  onInc = () => {},
  onDec = () => {},
  onRemove = () => {},
  recommended = [],
}) {
  // keep DOM mounted until slide‑out finishes
  const [show, setShow] = useState(open);

  useEffect(() => {
    if (open) setShow(true);
  }, [open]);

  const handleTransitionEnd = () => {
    if (!open) setShow(false);
  };

  if (!show && !open) return null; // fully hidden → unmount

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* ─── Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* ─── Panel */}
      <div
        className={`relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b flex justify-between items-start">
          <h2 className="text-2xl font-medium">
            Cart <span className="text-lg text-gray-500">({cart.length} {cart.length === 1 ? "item" : "items"})</span>
          </h2>
          <button onClick={onClose} aria-label="Close cart">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto divide-y px-6">
          {cart.length === 0 ? (
            <p className="py-20 text-center text-gray-500">Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="py-6 flex gap-4">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-24 h-28 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-1 mb-2 text-xl font-semibold">Rs.{item.price}/-</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Qty</span>
                    <div className="flex border rounded-md">
                      <button className="px-3 select-none" onClick={() => onDec(item.id)}>
                        –
                      </button>
                      <span className="w-8 text-center select-none">{item.qty}</span>
                      <button className="px-3 select-none" onClick={() => onInc(item.id)}>
                        +
                      </button>
                    </div>
                    <button className="ml-3 underline" onClick={() => onRemove(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discover More */}
        {recommended.length > 0 && (
          <div className="border-t px-6 pb-6 pt-4">
            <h3 className="text-xl font-medium mb-4">Discover More</h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
              {recommended.map((p) => (
                <div key={p.id} className="w-32 flex-shrink-0">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="w-full aspect-[1/1] object-cover rounded-md bg-[#f5ece8]"
                  />
                  <p className="text-[13px] mt-2 text-center leading-tight line-clamp-2">
                    {p.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checkout */}
        <div className="border-t px-6 py-6">
          <button
            className="w-full py-3 rounded-md bg-[#b49d91] text-white text-lg font-medium hover:opacity-90 transition"
            onClick={() => {
              onClose();
              window.location.href = "/checkout";
            }}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
