// src/components/payments/RazorpayButton.jsx
import React, { useState } from 'react';
import { loadRazorpay } from '../../utils/loadRazorpay';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';


// Helper: rupees → paise
const toPaise = (rupees) => Math.round(Number(rupees) * 100) || 0;

export default function RazorpayButton({
  amountInRupees,          // number (e.g., 999.50)
  orderMeta = {},          // {receipt, notes...} optional
  onSuccess,               // cb(payment) after server verifies
  onError,                 // cb(err)
}) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { clear, ensureServerCartNotEmpty, readGuest } = useCart();

  const handleClick = async () => {
    try {
      setLoading(true);

      // 1) Make sure server cart exists if user is logged in (optional, fits your existing flow)
      await ensureServerCartNotEmpty?.();

      // 2) Load SDK
      await loadRazorpay();

      // 3) Create order on YOUR backend (never trust amount from client)
      //    Your backend should recompute from cart and return { orderId, amount, currency, keyId, customer }
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send minimal hints; backend must recompute amount.
          clientHintAmountPaise: toPaise(amountInRupees),
          receipt: orderMeta.receipt,
          notes: {
            ...orderMeta.notes,
            // Optional: include anon cart hash if guest
            guestCart: !user ? JSON.stringify(readGuest()) : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      const { orderId, amount, currency, keyId, customer } = await res.json();

      // 4) Open Razorpay
      const rzp = new window.Razorpay({
        key: keyId,                 // test_*** or live_***
        amount,                     // paise, from server
        currency,                   // 'INR'
        name: 'Ikonix Perfumer',    // shown on modal
        description: 'Order Payment',
        image: '/favicon.ico',
        order_id: orderId,          // REQUIRED when using Orders API
        prefill: {
          name:   customer?.name   || user?.name || '',
          email:  customer?.email  || user?.email || '',
          contact: customer?.phone || '',
        },
        notes: orderMeta.notes || {},
        theme: { color: '#b49d91' },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        handler: async (resp) => {
          // 5) Send to backend for signature verification
          // resp = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
          try {
            const verify = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(resp),
            });
            const result = await verify.json();
            if (!verify.ok || !result?.verified) {
              throw new Error(result?.message || 'Signature verification failed');
            }

            // 6) Success — clear guest cart, trigger callback, navigate, etc.
            await clear?.();
            onSuccess?.(result);
          } catch (e) {
            onError?.(e);
          } finally {
            setLoading(false);
          }
        },
      });

      // Optional: listen for failures
      rzp.on('payment.failed', function (resp) {
        setLoading(false);
        const reason = resp?.error?.description || 'Payment failed';
        onError?.(new Error(reason));
      });

      rzp.open();
    } catch (e) {
      setLoading(false);
      onError?.(e);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full py-3 bg-[#b49d91] text-white rounded-md disabled:opacity-60"
    >
      {loading ? 'Processing…' : `Pay ₹${Number(amountInRupees).toFixed(2)}`}
    </button>
  );
}
