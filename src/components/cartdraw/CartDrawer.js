// src/components/cartdraw/CartDrawer.js
import React, { useEffect, useState, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { trackViewCart } from '../../lib/ecommerce';
import OfferCelebration, { useOfferBurst } from '../offer/OfferCelebration';

export default function CartDrawer({ open, onClose }) {
  const [show, setShow] = useState(open);
  const { items, freeItems, inc, dec, remove, refreshIfStale, loading, syncing, cartCount } = useCart();

  const navigate = useNavigate();
  const offerBurst = useOfferBurst();

  const prevOpen = useRef(open);
  const ANIM_MS = 300;

  // refresh on open only if the cart data is stale
  useEffect(() => {
    if (!prevOpen.current && open) refreshIfStale();
    prevOpen.current = open;
  }, [open, refreshIfStale]);

  // view_cart: fire once per open (not on every items change while open).
  const trackedForOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      if (!trackedForOpenRef.current && items.length) {
        trackedForOpenRef.current = true;
        trackViewCart(items);
      }
    } else {
      trackedForOpenRef.current = false;
    }
  }, [open, items]);

  // mount/unmount for animation
  useEffect(() => {
    if (open) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Close the drawer and open the product page for this cart line (same URL shape as the shop)
  const goProduct = (item) => {
    onClose();
    navigate(`/product-details/${item.id}?vid=${item.variantid}`);
  };

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
        className={`relative ml-auto h-[100dvh] sm:h-[90%] sm:rounded-bl-[40px] w-full max-w-md bg-white shadow-xl flex flex-col overflow-hidden transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold font-[luxia] text-[#53443D] flex gap-2 items-center">
            <span className="text-[18px]">Cart</span>
            <p className="text-[#8C7367] text-[14px]">
              {cartCount > 0 ? `(${cartCount} items)` : `(0 items)`}
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
          <OfferCelebration freeItems={freeItems} burst={offerBurst} />
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
                    onClick={() => goProduct(item)}
                    className="w-24 sm:w-40 object-cover rounded cursor-pointer"
                  />

                  <div className="flex flex-col gap-3 flex-1">
                    <div>
                      <button
                        type="button"
                        onClick={() => goProduct(item)}
                        className="text-left text-[#8C7367] font-[lato] text-[16px] sm:text-[21px] font-[700] tracking-[0.5px] leading-[150%] hover:underline"
                      >
                        {item.name}
                      </button>
                      {item.weight ? (
                        <span className="mt-1 block w-fit rounded-full border border-[#B39384] px-2 py-0.5 text-xs text-[#53443D]">
                          {item.weight} ml
                        </span>
                      ) : null}
                    </div>

                    <span className="text-[#2A3443] font-[lato] text-[16px] sm:text-[21px] font-[700] tracking-[0.5px] leading-[150%]">
                      Rs.{item.price}
                    </span>
                    {item.freeQty > 0 && (
                      <div className="text-sm text-[#8C7367] space-y-1">
                        <p>Includes {item.freeQty} free — save Rs.{item.discount.toFixed(2)}/-</p>
                        <p>{item.paidQty} paid + {item.freeQty} free</p>
                        <p className="font-semibold text-green-700">Free bottle: Rs.0.00/-</p>
                        <p className="font-semibold">Total: Rs.{item.total.toFixed(2)}/-</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[#53443D] font-[lato] text-[16px] tracking-[0.5px] leading-[150%]">
                        Qty
                      </span>

                      <div className="border rounded-[24px] border-[#53443D] flex-1 min-w-[96px] text-center">
                        <div className="flex items-center justify-between w-full">
                          <button
                            onClick={() => dec(item.cartid, item.id, item.variantid)}
                            disabled={Number(item.qty) <= 1}
                            className="w-1/3 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
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
        <div className="border-t px-4 sm:px-6 py-4 sm:py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
