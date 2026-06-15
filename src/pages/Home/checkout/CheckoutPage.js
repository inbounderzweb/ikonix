// src/pages/CheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import loadRazorpay from '../../../utils/loadRazorpay';
import { ensureTokenReady } from '../../../api/client';
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import AuthModal from '../../../Authmodal/AuthModal';
import Swal from 'sweetalert2';

const API_BASE = '/beta/api';

/**
 * Checkout Page
 * - Creates internal order via /checkout
 * - Creates Razorpay order via /payment/create-order
 * - Opens Razorpay Checkout and verifies via /payment
 */
export default function CheckoutPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const {
    items: cartItems,
    inc,
    dec,
    remove,
    refresh,
    ensureServerCartNotEmpty,
    syncGuestToServer,
    guestId,
    api,
  } = useCart();

  /* Always refresh on mount + on auth change */
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (user && token) refresh(); }, [user, token, refresh]);
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  /* ✅ MANDATORY LOGIN: Show modal if not logged in */
  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
    }
  }, [user]);

  /* Totals (rupees) */
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal;

  /* Modals & steps */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  // 'form' | 'select' | 'confirm'
  const [step, setStep] = useState('form');

  /* Address state */
  const [form, setForm] = useState({
    street: '', city: '',
    pincode: '', district: '', state: '', country: '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.mobile || '',
  });

  // Update form when user defaults change
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
        phone: user.mobile || f.phone,
      }));
    }
  }, [user]);

  const [addresses, setAddresses] = useState([]);
  const [shippingId, setShippingId] = useState(null);
  const [billingId, setBillingId] = useState(null);
  const [sameAsShip, setSameAsShip] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState(1); // 1 std, 2 express

  /* Status */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newAddrId, setNewAddrId] = useState(null);

  /* ✅ LOAD GUEST ADDRESS ONCE */
  useEffect(() => {
    if (!user) {
      try {
        const saved = JSON.parse(localStorage.getItem('guest_address') || '{}');
        if (saved && saved.street) {
          setForm(f => ({ ...f, ...saved }));
        }
      } catch { }
    }
  }, [user]);

  /* Ensure selection if addresses exist */
  useEffect(() => {
    if (addresses.length > 0) {
      const shipExists = addresses.some(a => String(a.id) === String(shippingId));
      if (!shippingId || !shipExists) {
        setShippingId(addresses[0].id);
      }

      const currentBillId = sameAsShip ? shippingId : billingId;
      const billExists = addresses.some(a => String(a.id) === String(currentBillId));
      if (!currentBillId || !billExists) {
        setBillingId(addresses[0].id);
      }
    }
  }, [addresses, shippingId, billingId, sameAsShip]);

  /* Helpers */
  const normalizeAddr = (a) => {
    const rawId = a.aid || a.id || a.address_id || a.addressId;
    return {
      id: rawId ? String(rawId) : rawId,
      street: a.street || '',
      city: a.city || '',
      pincode: a.pincode || '',
      district: a.district || '',
      state: a.state || '',
      country: a.country || '',
      company: a.company || '',
      gst: a.gst || '',
      deflt: a.deflt || false,
    };
  };

  const addrLabel = (a = {}) =>
    [a.street, a.city, a.district, a.state, a.country, a.pincode]
      .filter(Boolean)
      .join(', ');

  // helper to push the selected address to the top
  const ordered = (list, selectedId) => {
    const first = list.find(a => a.id === selectedId);
    const rest = list.filter(a => a.id !== selectedId);
    return first ? [first, ...rest] : rest;
  };

  const fetchAddresses = async () => {
    try {
      const payload = qs.stringify({ userid: user?.id || guestId, address_id: 1 });
      const { data } = await api.post(
        `${API_BASE}/address`,
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      if (data.status === false) {
        setStep('form');
        setShowAddressModal(true);
        return [];
      }
      const raw = data.data;
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const norm = list.map(normalizeAddr);
      setAddresses(norm);
      if (norm.length) {
        setShippingId(norm[0].id);
        setBillingId(norm[0].id);
      }
      return norm;
    } catch {
      setStep('form');
      setShowAddressModal(true);
      return [];
    }
  };

  const fetchDefaultAddresses = async () => {
    try {
      const payload = qs.stringify({ userid: user?.id || guestId });
      const { data } = await api.post(
        `${API_BASE}/address`,
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const raw = data.data;
      const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const norm = list.map(normalizeAddr);
      setAddresses(norm);
      if (norm.length) {
        setShippingId(norm[0].id);
        setBillingId(norm[0].id);
      }
      return norm;
    } catch {
      return [];
    }
  };

  const handlePlaceOrder = async () => {
    setError('');
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    try {
      const list = await fetchDefaultAddresses();
      if (list.length) {
        setStep('select');
      } else {
        setStep('form');
      }
      setShowAddressModal(true);
    } catch (e) {
      console.error("Place order step error:", e);
      setStep('form');
      setShowAddressModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat: latitude, lon: longitude, format: 'json' },
          });
          const a = res.data.address || {};
          setForm((f) => ({
            ...f,
            street: `${a.road || ''}${a.road && ','} ${a.suburb || ''}`.trim(),
            city: a.city || a.town || a.village || f.city,
            district: a.county || f.district,
            state: a.state || f.state,
            country: a.country || f.country,
            pincode: a.postcode || f.pincode,
          }));
        } catch {
          setError('Unable to fetch address from location');
        }
      },
      () => setError('Permission denied or location unavailable')
    );
  };


  const handleAddAddress = async () => {
    // Only check name, email, phone if NOT logged in
    const fieldsToCheck = [
      'street', 'city', 'pincode', 'district', 'state', 'country'
    ];
    if (!user) {
      fieldsToCheck.push('name', 'email', 'phone');
    }

    for (let k of fieldsToCheck) {
      if (!String(form[k] ?? '').trim()) {
        setError(`Please fill in ${k === 'name' ? 'Full Name' : k === 'phone' ? 'Phone Number' : k}`);
        return;
      }
    }

    setError('');
    setLoading(true);
    try {
      const uid = user?.id || guestId;
      const payload = qs.stringify({
        userid: uid,
        ...form,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone
      });

      console.log("Adding Address with UID:", uid, "Payload:", payload);

      const { data } = await api.post(`${API_BASE}/address/add`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 40000,
      });

      console.log("Address Add Response:", data);

      const ok =
        data.success === true ||
        data.success === 'true' ||
        data.success === 1 ||
        data.success === '1' ||
        data.status === true ||
        data.status === 'true' ||
        data.status === 1;

      if (ok) {
        // Many backends return the new object, but some return it nested inside 'data' or 'address'
        const rawAddr = data.data || data.address || data;
        const addedObj = rawAddr ? normalizeAddr(rawAddr) : null;

        // Save guest address locally as requested
        if (!user) {
          localStorage.setItem('guest_address', JSON.stringify({
            ...form,
            id: addedObj?.id // store ID too
          }));
        }

        if (addedObj?.id) {
          setAddresses((prev) => [addedObj, ...prev]);
          setShippingId(addedObj.id);
          setBillingId(addedObj.id);
          setNewAddrId(addedObj.id);
          Swal.fire({
            icon: 'success',
            title: 'Address Saved',
            timer: 1500,
            showConfirmButton: false
          });
        } else {
          // If the response didn't have an ID, refetch everything to be sure
          const list = await fetchDefaultAddresses();
          if (list.length) {
            const first = list[0];
            setShippingId(first.id);
            setBillingId(first.id);
            setNewAddrId(first.id);
            Swal.fire({
              icon: 'success',
              title: 'Address Saved',
              timer: 1500,
              showConfirmButton: false
            });
          }
        }

        setForm(prev => ({
          ...prev,
          street: '',
          city: '',
          pincode: '',
          district: '',
          state: '',
          country: '',
        }));
        setStep('select');
      } else {
        const msg = data.message || 'Failed to add address';
        setError(msg);
        Swal.fire('Error', msg, 'error');
      }
    } catch (err) {
      console.error("ADD ADDRESS AXIOS ERROR:", err?.response?.data || err);
      const errMsg = err?.response?.data?.message || 'Network error, please try again';
      setError(errMsg);
      Swal.fire('Error', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSelectContinue = () => {
    const activeBillingId = sameAsShip ? shippingId : billingId;

    const shippingExists = addresses.some(a => String(a.id) === String(shippingId));
    const billingExists = addresses.some(a => String(a.id) === String(activeBillingId));

    if (!shippingId || !activeBillingId || !shippingExists || !billingExists) {
      setError('Please select both shipping and billing address from the list.');
      return;
    }
    setError('');
    setStep('confirm');
  };

  // ---------------------------
  // Razorpay Pay Click Handler
  // ---------------------------
  const handlePayClick = async (order_id) => {
    try {
      if (!order_id) throw new Error('Missing internal order id');
      setError('');
      setLoading(true);

      const payload = qs.stringify({
        order_id,
        userid: user?.id || guestId,
        client_hint_amount: Math.round(Number(total) * 100), // convert to paise
        receipt: `ikonix_${order_id}`,
        notes: JSON.stringify({
          source: 'web',
          cart: cartItems.length,
          guest: !user,
          name: form.name,
          email: form.email
        }),
      });

      const { data: raw } = await api.post(
        `${API_BASE}/payment/create-order`,
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 40000,
        }
      );

      // Normalize your API shape
      const res = raw?.data ?? raw ?? {};

      // Use the SAME key as the server's mode/account
      // const keyId = 'rzp_test_S9baA5PHdWgO0k';
      const keyId = 'rzp_live_SEo0q24u3JYSFy'

      // Must be a Razorpay order id like "order_***"
      const rzpOrderId = res.porder_id;

      if (!keyId || !/^rzp_(test|live)_/.test(String(keyId))) {
        console.error('Create-order response:', res);
        throw new Error('Invalid Razorpay keyId from create-order');
      }
      if (!rzpOrderId || !String(rzpOrderId).startsWith('order_')) {
        console.error('Create-order response:', res);
        throw new Error('Invalid Razorpay order id from create-order');
      }

      // Load SDK & open checkout
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay SDK not available');

      const rzp = new window.Razorpay({
        key: keyId,            // DO NOT hard-code; must match the server's mode
        order_id: rzpOrderId,  // must be order_****
        name: 'Ikonix Perfumer',
        description: 'Order Payment',
        image: '/favicon.ico',
        prefill: {
          name: res.customer?.name ?? user?.name ?? '',
          email: res.customer?.email ?? user?.email ?? '',
          contact: res.customer?.phone ?? '',
        },

        theme: { color: '#b49d91' },
        handler: async (resp) => {
          try {
            const formVerify = new FormData();
            formVerify.append('userid', String(user?.id || guestId));
            formVerify.append('order_id', String(order_id));              // your internal id
            formVerify.append('porder_id', resp.razorpay_order_id);       // Razorpay order_****
            formVerify.append('payment_id', resp.razorpay_payment_id);
            formVerify.append('signature', resp.razorpay_signature);

            const verifyRes = await fetch(`${API_BASE}/payment/callback`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: formVerify,
            });
            const result = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok || result?.status === false) {
              throw new Error(result?.message || 'Signature verification failed');
            }

            // console.log(result,'finalout')

          } catch (err) {
            setError(err.message || 'Payment verification failed');
            Swal(err)
          } finally {
            setLoading(false);
            navigate('/order-confirmation')
          }
        },
        modal: {
          ondismiss: async () => {
            setLoading(false);
            // The backend /checkout API blindly empties the cart before payment is confirmed.
            // If the user closes the modal, their cart is gone. We must dynamically restore it here.
            try {
              if (cartItems && cartItems.length > 0) {
                for (const item of cartItems) {
                  await api.post(`${API_BASE}/cart`, qs.stringify({
                    userid: user?.id || guestId,
                    productid: item.id,
                    variantid: item.variantid,
                    qty: item.qty
                  }), {
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded'
                    }
                  });
                }
                await refresh(); // Refresh Cart UI globally to show restored items
              }
            } catch (err) {
              console.error("Cart restore failed", err);
            }
            navigate('/checkout'); // keep them on checkout instead of forcefully booting them
          }
        },
      });

      rzp.on('payment.failed', async (resp) => {
        setLoading(false);
        setError(resp?.error?.description || 'Payment failed');
        // Restore cart on payment failure too
        try {
          if (cartItems && cartItems.length > 0) {
            for (const item of cartItems) {
              await api.post(`${API_BASE}/cart`, qs.stringify({
                userid: user?.id || guestId,
                productid: item.id,
                variantid: item.variantid,
                qty: item.qty
              }), {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              });
            }
            await refresh();
          }
        } catch (err) { }
      });

      rzp.open();
    } catch (e) {
      setLoading(false);
      setError(e.message || 'Unable to start payment');
    }
  };


  // const handleCheckout = async () => {
  //   const billId = sameAsShip ? shippingId : billingId;
  //   try {
  //     setLoading(true);
  //     setError('');
  //     await ensureServerCartNotEmpty();
  //     const payload = qs.stringify({
  //       userid: user.id,
  //       shipping_address: shippingId,
  //       billing_address: billId,
  //       delivery_method: deliveryMethod,
  //     });
  //     const doCheckout = () =>
  //       axios.post(`${API_BASE}/checkout`, payload, {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           'Content-Type': 'application/x-www-form-urlencoded',
  //         },
  //       });
  //     let { data } = await doCheckout();
  //     const needRetry =
  //       data?.status === false &&
  //       typeof data?.message === 'string' &&
  //       data.message.toLowerCase().includes('no products added');
  //     if (needRetry) {
  //       await syncGuestToServer(readGuest());
  //       await refresh();
  //       const second = await doCheckout();
  //       data = second.data;
  //     }
  //     if (data?.status === true) {
  //       // After internal order created, launch payment
  //       setShowAddressModal(false);
  //       // navigate('/payment-landing')
  //       handlePayClick(data.order_id);
  //     } else {
  //       setError(data?.message || 'Checkout failed, please try again');
  //     }
  //   } catch {
  //     setError('Checkout failed, please try again');
  //   } finally {
  //     setLoading(false);


  //   }
  // };

  const handleCheckout = async () => {
    const uid = user?.id || guestId;
    const billId = sameAsShip ? shippingId : billingId;

    // Only block if we have NO address at all. 
    // If it's guest_local but we have form fields (handled in payload), we can proceed.
    if (!shippingId || !billId) {
      setStep('form');
      setError('Please provide your complete address details.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // ✅ SYNC BEFORE CHECKOUT IF GUEST
      if (!user) {
        console.log("Guest checkout: syncing cart to server first...");
        try {
          if (typeof syncGuestToServer === "function") {
            await syncGuestToServer();
          }
          if (typeof refresh === "function") {
            await refresh();
          }
        } catch (syncErr) {
          console.error("Sync during checkout failed:", syncErr);
        }
      } else {
        // Logged in: basic guard
        if (typeof ensureServerCartNotEmpty === "function") {
          await ensureServerCartNotEmpty();
        }
      }

      const payload = {
        userid: uid || '0',
        shipping_address: shippingId,
        billing_address: billId,
        delivery_method: deliveryMethod,
        customer_name: form.name,
        customer_email: form.email,
        customer_phone: form.phone,
        // ✅ Add detailed address info if guest
        ...(!user ? {
          street: form.street,
          city: form.city,
          pincode: form.pincode,
          district: form.district,
          state: form.state,
          country: form.country,
        } : {})
      };

      console.log("FINAL CHECKOUT ATTEMPT", payload);

      const doCheckout = () =>
        api.post(`${API_BASE}/checkout`, qs.stringify(payload), {
          timeout: 40000,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });

      let resp;
      try {
        resp = await doCheckout();
      } catch (err) {
        console.error("CHECKOUT 500 RAW ERROR:", err?.response?.data || err);
        if (err.response?.status === 500) {
          const raw = err.response.data;
          const htmlMsg = typeof raw === 'string'
            ? raw.replace(/<[^>]+>/g, '').slice(0, 500)
            : JSON.stringify(raw);

          Swal.fire({
            title: 'Checkout Error (500)',
            text: 'Server failed to process order. ' + (htmlMsg || 'Empty response.'),
            icon: 'error',
          });
        }
        throw err;
      }

      let { data } = resp;
      console.log("CHECKOUT RESPONSE:", data);

      if (data?.status === true || data?.success === true || data?.order_id) {
        setShowAddressModal(false);
        if (data.order_id) {
          handlePayClick(data.order_id);
        } else {
          setError("Order created but no order_id was returned.");
        }
      } else {
        const msg = data?.message || "Checkout failed, please try again";
        setError(msg);
        Swal.fire('Checkout Issue', msg, 'warning');
      }
    } catch (err) {
      console.error("HANDLE CHECKOUT FINAL CATCH:", err?.response?.data || err);
      let errMsg = err?.response?.data?.message || err?.message || "Checkout failed";

      const isNetworkError = err.message === "Network Error" || !err.response;

      if (isNetworkError) {
        errMsg = `Network Error (URL: ${API_BASE}/checkout). This often happens due to CORS policy on localhost or server downtime. Please check your internet and try again.`;
      }

      setError(errMsg);
      Swal.fire({
        title: 'Checkout Error',
        text: errMsg,
        icon: 'error',
        footer: '<a href="https://ikonixperfumer.com" target="_blank">Is the site reachable?</a>'
      });
    } finally {
      setLoading(false);
    }
  };


  const handleCancel = () => {
    setShowAddressModal(false);
    setStep('form');
    setError('');
    setNewAddrId(null);
  };

  const QtyBox = ({ value, onDec, onInc }) => (
    <div className="flex items-center border border-[#6d5a52] rounded-[12px] px-4 py-2 text-[#6d5a52] text-sm">
      <button className="px-2 disabled:opacity-30" onClick={onDec} disabled={value <= 1}>
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="mx-3">{value}</span>
      <button className="px-2" onClick={onInc}>
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const CloseBtn = ({ onClick }) => (
    <button onClick={onClick} className="absolute right-6 top-6 p-1 rounded-full hover:bg-gray-100" aria-label="close">
      <XMarkIcon className="w-5 h-5 text-[#6d5a52]" />
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-semibold mb-8 text-[#6d5a52]">Your Order</h1>

      {!user ? (
        <div className="text-center py-20 bg-[#fdf8f5] rounded-3xl border border-[#eadcd5]">
          <h2 className="text-2xl font-bold text-[#6d5a52] mb-4">Login Required</h2>
          <p className="text-[#b49d91] mb-8">Please log in or create an account to proceed with your order.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-[#1e2633] text-white px-10 py-3 rounded-xl hover:opacity-90 transition"
          >
            Login / Signup
          </button>
        </div>
      ) : cartItems.length === 0 ? (
        <p className="text-center">
          Your cart is empty.&nbsp;
          <button onClick={() => navigate('/shop')} className="underline text-blue-600">
            Continue Shopping
          </button>
        </p>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-12 bg-[#eadcd5] text-[#6d5a52] rounded-md py-3 px-4 font-semibold mb-4 text-lg">
            <div className="col-span-7">product</div>
            <div className="col-span-3 text-center">QTY</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {/* Items */}
          <div className="space-y-6">
            {cartItems.map((item) => (
              <div key={item.cartid} className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-center">
                {/* Product */}
                <div className="flex items-center gap-4 md:col-span-7">
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover bg-[#f6ebe6]"
                  />
                  <div>
                    <p className="text-xl text-[#6d5a52] font-medium">{item.name}</p>
                    <p className="text-[#2A3443] text-lg font-semibold">Rs.{item.price.toFixed(2)}/-</p>
                  </div>
                </div>

                {/* Qty */}
                <div className="flex justify-between md:justify-center md:col-span-3">
                  <QtyBox
                    value={item.qty}
                    onDec={() => dec(item.cartid, item.id, item.variantid)}
                    onInc={() => inc(item.cartid, item.id, item.variantid)}
                  />
                  <button
                    onClick={() => remove(item.cartid, item.id, item.variantid)}
                    className="underline text-[#6d5a52] text-sm ml-4 md:hidden"
                  >
                    Remove
                  </button>
                </div>

                {/* Total & Remove on md+ */}
                <div className="flex justify-between md:justify-end md:col-span-2 items-center">
                  <p className="text-[#2A3443] font-semibold text-lg">
                    Rs.{(item.price * item.qty).toFixed(2)}/-
                  </p>
                  <button
                    onClick={() => remove(item.cartid, item.id, item.variantid)}
                    className="underline text-[#6d5a52] text-sm hidden md:inline-block ml-4"
                  >
                    Remove
                  </button>
                </div>

                <div className="col-span-12 border-b mt-6" />
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-10 flex justify-end text-[#6d5a52]">
            <div className="w-1/2 max-w-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-base">Subtotal</span>
                <span className="text-[#b49d91] font-semibold">
                  Rs.{subtotal.toFixed(2)}/-
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#2A3443]">
                <span>Total</span>
                <span>Rs.{total.toFixed(2)}/-</span>
              </div>
            </div>
          </div>

          {/* Place order */}
          <div className="flex justify-center mt-10">
            <button
              onClick={handlePlaceOrder}
              className="bg-[#1e2633] text-white text-lg px-16 py-4 rounded-xl hover:opacity-90 transition"
            >
              Place order
            </button>
          </div>
        </>
      )}

      {/* Auth modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-[#fdf8f5] w-full lg:max-w-[90%] rounded-3xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <CloseBtn onClick={handleCancel} />

            {/* STEP: FORM */}
            {step === 'form' && (
              <>
                <h2 className="text-3xl font-semibold text-[#6d5a52] mb-6">Enter Shipping Address</h2>

                <button
                  onClick={handleUseLocation}
                  className="mb-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eadcd5] text-[#6d5a52] hover:opacity-90"
                >
                  <span className="material-icons text-base">my_location</span>
                  Use my Location
                </button>

                <hr className="mb-6 border-[#eadcd5]" />

                <div className="grid grid-cols-2 gap-4 text-[#6d5a52]">
                  {!user && (
                    <>
                      <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label className="text-sm font-semibold">Full Name</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label className="text-sm font-semibold">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-sm font-semibold">Phone Number</label>
                        <input
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange}
                          className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                          placeholder="Phone number"
                        />
                      </div>
                    </>
                  )}
                  {[
                    ['street', 'Street'],
                    ['city', 'City'], ['pincode', 'Pincode'], ['district', 'District'],
                    ['state', 'State'], ['country', 'Country'],

                  ].map(([k, l]) => (
                    <div key={k} className="flex flex-col gap-1">
                      <label className="text-sm">{l}</label>
                      <input
                        name={k}
                        value={form[k]}
                        onChange={handleChange}
                        className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                        placeholder={l}
                      />
                    </div>
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                <div className="mt-10 flex justify-end gap-4">
                  <button
                    onClick={handleCancel}
                    className="px-10 py-3 rounded-xl border border-[#6d5a52] text-[#6d5a52]"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleAddAddress}
                    className="px-10 py-3 rounded-xl bg-[#1e2633] text-white hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </>
            )}

            {/* STEP: SELECT */}
            {step === 'select' && (
              <>
                <h2 className="text-3xl font-semibold text-[#6d5a52] mb-8">Choose Address</h2>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Shipping */}
                  <div>
                    <h3 className="text-xl font-semibold text-[#6d5a52] bg-[#eadcd5] px-4 py-2 rounded-md inline-block mb-4">
                      Shipping Address
                    </h3>
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                      {ordered(addresses, shippingId).map(a => (
                        <label
                          key={a.id}
                          className={`block border rounded-2xl p-4 cursor-pointer text-sm leading-snug
                            ${String(shippingId) === String(a.id) ? 'border-[#b49d91] bg-white' : 'border-[#d7c6bfd7] bg-[#f6ebe6]'}
                            ${String(newAddrId) === String(a.id) ? 'ring-2 ring-[#b49d91]' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              className="mt-1 accent-[#1e2633]"
                              name="shipping"
                              checked={String(shippingId) === String(a.id)}
                              onChange={() => {
                                setShippingId(a.id);
                                if (sameAsShip) setBillingId(a.id);
                              }}
                            />
                            <div>
                              {addrLabel(a)}
                              {a.company && <div>Company: {a.company}</div>}
                              {a.gst && <div>GST: {a.gst}</div>}
                              {a.type && <div>Type: {a.type}</div>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={() => { setStep('form'); setNewAddrId(null); }}
                      className="mt-6 w-full bg-[#eadcd5] text-[#6d5a52] py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">+</span> Add New
                    </button>
                  </div>

                  {/* Billing */}
                  <div>
                    <h3 className="text-xl font-semibold text-[#6d5a52] bg-[#eadcd5] px-4 py-2 rounded-md inline-block mb-4">
                      Billing Address
                    </h3>

                    <label className="flex items-center gap-2 text-sm text-[#6d5a52] mb-4">
                      <input
                        type="checkbox"
                        className="accent-[#1e2633]"
                        checked={sameAsShip}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsShip(checked);
                          if (checked) setBillingId(shippingId);
                        }}
                      />
                      Billing address same as shipping
                    </label>

                    {!sameAsShip && (
                      <>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                          {ordered(addresses, billingId).map((a) => (
                            <label
                              key={a.id}
                              className={`block border rounded-2xl p-4 cursor-pointer text-sm leading-snug
              ${String(billingId) === String(a.id) ? "border-[#b49d91] bg-white" : "border-[#d7c6bfd7] bg-[#f6ebe6]"}
              ${String(newAddrId) === String(a.id) ? "ring-2 ring-[#b49d91]" : ""}`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="radio"
                                  className="mt-1 accent-[#1e2633]"
                                  name="billing"
                                  checked={String(billingId) === String(a.id)}
                                  onChange={() => setBillingId(a.id)}
                                />
                                <div>
                                  {addrLabel(a)}
                                  {a.company && <div>Company: {a.company}</div>}
                                  {a.gst && <div>GST: {a.gst}</div>}
                                  {a.type && <div>Type: {a.type}</div>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* ✅ Show Add New ONLY when unchecked */}
                        <button
                          onClick={() => { setStep("form"); setNewAddrId(null); }}
                          className="mt-6 w-full bg-[#eadcd5] text-[#6d5a52] py-4 rounded-2xl flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">+</span> Add New
                        </button>
                      </>
                    )}
                  </div>







                </div>

                <hr className="my-8 border-[#eadcd5]" />

                <div className="grid justify-between lg:flex items-center">
                  {/* Delivery method */}
                  <div className="flex items-center gap-3 m-2">
                    <h4 className="text-[20px] lg:text-xl font-semibold text-[#6d5a52]">
                      Delivery Method
                    </h4>
                    <div className="flex bg-[#f6ebe6] border border-[#d7c6bfd7] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod(1)}
                        className={`px-5 py-2 rounded-lg text-sm lg:text-base transition font-medium ${deliveryMethod === 1
                          ? 'bg-[#1e2633] text-white shadow'
                          : 'text-[#6d5a52] hover:bg-[#eadcd5]'
                          }`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod(2)}
                        className={`px-5 py-2 rounded-lg text-sm lg:text-base transition font-medium ${deliveryMethod === 2
                          ? 'bg-[#1e2633] text-white shadow'
                          : 'text-[#6d5a52] hover:bg-[#eadcd5]'
                          }`}
                      >
                        Express
                      </button>
                    </div>
                  </div>

                  <div className="grid md:flex gap-3 m-2 ml-[-10px] lg:ml-0 float-start lg:float-end justify-normal md:justify-between">
                    <button
                      onClick={handleCancel}
                      className="px-6 py-2 md:px-12 md:py-3 rounded-xl border border-[#6d5a52] text-[#6d5a52]"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSelectContinue}
                      className="px-12 py-3 rounded-xl bg-[#1e2633] text-white hover:opacity-90"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* STEP: CONFIRM */}
            {step === 'confirm' && (() => {
              const activeBillId = sameAsShip ? shippingId : billingId;
              const shippingAddr = addresses.find(a => String(a.id) === String(shippingId));
              const billingAddr = addresses.find(a => String(a.id) === String(activeBillId));

              return (
                <>
                  <h2 className="text-3xl font-semibold text-[#6d5a52] mb-8">Confirm your Order</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Products list */}
                    <div>
                      <div className="bg-[#eadcd5] text-[#6d5a52] rounded-md py-3 px-4 font-semibold mb-4 text-lg">
                        product
                      </div>
                      <div className="max-h-72 overflow-y-auto pr-2 space-y-6">
                        {cartItems.map((item) => (
                          <div key={item.cartid} className="flex gap-4">
                            <img
                              src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover bg-[#f6ebe6]"
                            />
                            <div className="flex-1">
                              <p className="text-[#6d5a52] font-medium">{item.name}</p>
                              <p className="text-[#2A3443] font-semibold text-sm">
                                Rs.{item.price.toFixed(2)}/-
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Address + totals */}
                    <div>
                      <div className="bg-[#eadcd5] text-[#6d5a52] rounded-md py-3 px-4 font-semibold mb-4 text-lg">
                        Address
                      </div>
                      <label className="block border border-[#b49d91] rounded-2xl p-4 text-sm leading-snug text-[#6d5a52] mb-8">
                        <div className="flex items-start gap-3">
                          <input type="radio" className="mt-1 accent-[#1e2633]" checked readOnly />
                          <div>
                            {shippingAddr ? addrLabel(shippingAddr) : 'No address selected'}
                            {shippingAddr && (
                              <>
                                {shippingAddr.company && (
                                  <div>Company: {shippingAddr.company}</div>
                                )}
                                {shippingAddr.gst && (
                                  <div>GST: {shippingAddr.gst}</div>
                                )}
                                {shippingAddr.type && (
                                  <div>Type: {shippingAddr.type}</div>
                                )}
                              </>
                            )}
                            {!sameAsShip && billingAddr && (
                              <div className="mt-4 border-t pt-2 border-[#eadcd5]">
                                <strong>Billing Address:</strong>
                                <div>{addrLabel(billingAddr)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                      <div className="space-y-2 text-[#6d5a52] mb-8">
                        <div className="flex justify-between text-base">
                          <span>Subtotal</span>
                          <span className="text-[#b49d91] font-semibold">
                            Rs.{subtotal.toFixed(2)}/-
                          </span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold text-[#2A3443]">
                          <span>Total</span>
                          <span>Rs.{total.toFixed(2)}/-</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                  <div className="grid md:flex justify-end gap-4 mt-6">
                    <button
                      onClick={() => setStep('select')}
                      className="px-6 py-2 md:px-12 md:py-3 rounded-xl border border-[#6d5a52] text-[#6d5a52]"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="px-12 py-3 rounded-xl bg-[#1e2633] text-white hover:opacity-90"
                      disabled={loading}
                    >
                      {loading ? 'Processing…' : 'Proceed to Checkout'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
