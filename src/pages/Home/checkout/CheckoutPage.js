// src/pages/CheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import loadRazorpay from '../../../utils/loadRazorpay';
import { getResponseMessage, getApiErrorMessage } from '../../../utils/apiError';
import {
  XMarkIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import AuthModal from '../../../Authmodal/AuthModal';
import Swal from 'sweetalert2';
import {
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackPaymentFailed,
} from '../../../lib/ecommerce';
import useDocumentTitle from '../../../hooks/useDocumentTitle';

const API_BASE = 'https://ikonixperfumer.com/beta/api';
// Same rule AuthModal.js uses for login/register/reset — Indian mobile
// numbers are 10 digits starting with 6-9.
const MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Checkout Page
 * - Creates internal order via /checkout
 * - Creates Razorpay order via /payment/create-order
 * - Opens Razorpay Checkout and verifies via /payment
 */
export default function CheckoutPage() {
  useDocumentTitle("Checkout");
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
    clear,
  } = useCart();

  /* Always refresh on mount + on auth change */
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (user && token) refresh(); }, [user, token, refresh]);
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  /* Totals (rupees) */
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal;

  /* Modals & steps */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  /* Guest checkout (no login) — reveals the guest details form below the cart */
  const [guestMode, setGuestMode] = useState(false);
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
  const [deliveryMethods, setDeliveryMethods] = useState([]); // [{id, name, charge}]
  const [deliveryMethod, setDeliveryMethod] = useState(1); // selected id, defaults to Standard
  const [chargeSummary, setChargeSummary] = useState({
    delivery: 0,
    tax: null,
    packing: null,
    total: 0,
    raw: null,
  });

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

  const getShippingCountry = () => {
    const activeBillId = sameAsShip ? shippingId : billingId;
    const selectedAddress = addresses.find(a => String(a.id) === String(activeBillId));
    return selectedAddress?.country || form.country || 'India';
  };

  /* Delivery methods — fetched once from the backend instead of being
     hardcoded to "Standard", used by both the logged-in and guest flows. */
  const normalizeDeliveryMethod = (d, i) => ({
    id: d.id ?? d.method_id ?? d.delivery_method_id ?? i + 1,
    name: d.name ?? d.method ?? d.title ?? `Method ${i + 1}`,
    charge: Number(d.charge ?? d.price ?? d.amount ?? d.delivery_charge ?? 0) || 0,
    eta: d.eta ?? d.duration ?? d.days ?? '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`${API_BASE}/delivery-methods`);
        const raw = data?.data ?? data ?? [];
        const normalized = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(normalizeDeliveryMethod);
        // Only Normal Delivery is offered right now — drop Fast Delivery
        // (and anything else) so the picker never surfaces it, while still
        // keeping whatever id/charge the backend assigns to Normal.
        const normalOnly = normalized.filter((m) => !/fast/i.test(m.name));
        const list = normalOnly.length ? normalOnly : normalized;
        if (!cancelled && list.length) {
          setDeliveryMethods(list);
          setDeliveryMethod((current) =>
            list.some((m) => String(m.id) === String(current)) ? current : list[0].id
          );
        }
      } catch (err) {
        console.error('Failed to load delivery methods, defaulting to Standard:', err?.response?.data || err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const selectedDeliveryMethod = deliveryMethods.find((m) => String(m.id) === String(deliveryMethod));
  const deliveryMethodLabel = selectedDeliveryMethod?.name || (deliveryMethod === 1 ? 'Standard' : String(deliveryMethod));

  // helper to push the selected address to the top
  const ordered = (list, selectedId) => {
    const first = list.find(a => a.id === selectedId);
    const rest = list.filter(a => a.id !== selectedId);
    return first ? [first, ...rest] : rest;
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

    trackBeginCheckout(cartItems);

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
        const msg = getResponseMessage(data, 'Failed to add address');
        setError(msg);
        Swal.fire('Error', msg, 'error');
      }
    } catch (err) {
      console.error("ADD ADDRESS AXIOS ERROR:", err?.response?.data || err);
      const errMsg = getApiErrorMessage(err, 'Network error, please try again');
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
    trackAddShippingInfo(cartItems, {
      shippingTier: deliveryMethodLabel,
      value: chargeSummary.total || total,
    });
    setStep('confirm');
  };

  useEffect(() => {
    const fetchChargeSummary = async () => {
      const uid = user?.id || guestId;
      const shipping_country = getShippingCountry();

      if (!uid) return;

      try {
        const { data } = await api.post(
          `${API_BASE}/cart`,
          qs.stringify({
            userid: uid,
            delivery_method: deliveryMethod,
            shipping_country,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        const raw = data?.data || data || {};
        const delivery = Number(
          data?.delivery_charge ??
          raw.delivery_charge ??
          raw.delivery ??
          raw.shipping_charge ??
          0
        ) || 0;
        const tax = raw.tax ?? raw.tax_charge ?? null;
        const packing = raw.packing ?? raw.packing_charge ?? null;
        const taxValue = tax !== null ? Number(tax) || 0 : null;
        const packingValue = packing !== null ? Number(packing) || 0 : null;
        const totalFromApi = Number(raw.total ?? raw.total_charge ?? raw.grand_total ?? 0) || 0;
        const totalFromParts = subtotal + delivery + (taxValue || 0) + (packingValue || 0);

        setChargeSummary({
          delivery,
          tax: taxValue,
          packing: packingValue,
          total: totalFromApi || totalFromParts,
          raw,
        });
      } catch (err) {
        console.error('Charge summary fetch failed:', err?.response?.data || err);
        setChargeSummary({
          delivery: 0,
          tax: null,
          packing: null,
          total: subtotal,
          raw: null,
        });
      }
    };

    fetchChargeSummary();
  }, [api, guestId, shippingId, billingId, sameAsShip, subtotal, user?.id, form.country, addresses, deliveryMethod]);

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
          const purchaseValue = chargeSummary.total || total;
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
              throw new Error(getResponseMessage(result, 'Signature verification failed'));
            }

            // ✅ Payment verified by the backend — this is the one and only
            // point where a purchase is confirmed. Fire `purchase` here
            // (not from OrderConfirmation) so it's tied to a single,
            // non-repeatable code path: refreshing/back-navigating into
            // the confirmation page can never re-run this handler.
            trackPurchase({
              transactionId: order_id,
              value: purchaseValue,
              items: cartItems,
              shipping: chargeSummary.delivery || 0,
              tax: chargeSummary.tax || 0,
            });

            setLoading(false);
            navigate('/order-confirmation', {
              state: {
                order: { order_id, id: order_id },
                address_id: shippingId,
              },
            });
          } catch (err) {
            // ❌ Signature verification failed — this is NOT a successful
            // purchase. Stay on checkout and surface the error instead of
            // navigating to the "Thank you!" page (previous behavior
            // navigated there unconditionally, showing a fake success page
            // after a failed payment).
            setError(err.message || 'Payment verification failed');
            Swal(err)
            trackPaymentFailed({ orderId: order_id, message: err.message });
            setLoading(false);
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
        trackPaymentFailed({ orderId: order_id, message: resp?.error?.description });
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

      trackAddPaymentInfo(cartItems, {
        paymentType: 'Razorpay',
        value: chargeSummary.total || total,
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
        shipping_country: getShippingCountry(),
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
        const msg = getResponseMessage(data, "Checkout failed, please try again");
        setError(msg);
        Swal.fire('Checkout Issue', msg, 'warning');
      }
    } catch (err) {
      console.error("HANDLE CHECKOUT FINAL CATCH:", err?.response?.data || err);
      let errMsg = getApiErrorMessage(err, err?.message || "Checkout failed");

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

  // ---------------------------
  // Guest Checkout (no login) — uses the dedicated /guest-checkout +
  // /guest-payment/create-order endpoints from the backend's Postman
  // collection, instead of /checkout + /payment/create-order. These take a
  // flatter payload (a single "address" string, and no userid) since there's
  // no account/address-book behind a guest order.
  // ---------------------------
  const handleGuestCheckout = async () => {
    setError('');
    const required = ['name', 'email', 'phone', 'street', 'city', 'pincode', 'district', 'state', 'country'];
    for (const k of required) {
      if (!String(form[k] ?? '').trim()) {
        setError(`Please fill in ${k === 'name' ? 'Full Name' : k === 'phone' ? 'Phone Number' : k}`);
        return;
      }
    }
    if (!MOBILE_REGEX.test(form.phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    if (!cartItems.length) {
      setError('Your cart is empty.');
      return;
    }

    trackBeginCheckout(cartItems);
    trackAddShippingInfo(cartItems, { shippingTier: deliveryMethodLabel, value: chargeSummary.total || total });
    setLoading(true);
    try {
      // Remember details for next time, same as the (existing) address form does.
      localStorage.setItem('guest_address', JSON.stringify(form));

      const items = cartItems.map((i) => ({ vid: Number(i.variantid), qty: i.qty }));
      const address = [form.street, form.city, form.district, form.state, form.country, form.pincode]
        .filter(Boolean)
        .join(', ');

      const { data } = await api.post(
        `${API_BASE}/guest-checkout`,
        qs.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address,
          delivery_method: deliveryMethod,
          items: JSON.stringify(items),
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 40000,
        }
      );

      // Mirrors /checkout's own success check above: some endpoints on this
      // backend return order_id without an explicit status flag, so treat
      // its presence as success either way.
      const orderId = data?.order_id ?? data?.data?.order_id;
      if (orderId) {
        handleGuestPayClick(orderId);
      } else {
        // Inline error text below the form (rendered from `error` state) is
        // enough here — a modal popup on top of a visible validation
        // message the user is already looking at is redundant.
        setError(getResponseMessage(data, 'Checkout failed, please try again'));
        setLoading(false);
      }
    } catch (err) {
      console.error('Guest checkout error:', err?.response?.data || err);
      setError(getApiErrorMessage(err, err?.message || 'Checkout failed'));
      setLoading(false);
    }
  };

  const handleGuestPayClick = async (order_id) => {
    try {
      if (!order_id) throw new Error('Missing internal order id');
      setError('');
      setLoading(true);

      const { data: raw } = await api.post(
        `${API_BASE}/guest-payment/create-order`,
        qs.stringify({
          order_id,
          receipt: `ikonix_${order_id}`,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 40000,
        }
      );

      const res = raw?.data ?? raw ?? {};
      const keyId = 'rzp_live_SEo0q24u3JYSFy';
      const rzpOrderId = res.porder_id;

      if (!rzpOrderId || !String(rzpOrderId).startsWith('order_')) {
        console.error('Guest create-order response:', res);
        throw new Error('Invalid Razorpay order id from create-order');
      }

      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay SDK not available');

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: rzpOrderId,
        name: 'Ikonix Perfumer',
        description: 'Order Payment',
        image: '/favicon.ico',
        prefill: {
          name: res.customer?.name ?? form.name ?? '',
          email: res.customer?.email ?? form.email ?? '',
          contact: res.customer?.phone ?? form.phone ?? '',
        },
        theme: { color: '#b49d91' },
        handler: async (resp) => {
          const purchaseValue = chargeSummary.total || total;
          try {
            const formVerify = new FormData();
            formVerify.append('order_id', String(order_id));
            formVerify.append('porder_id', resp.razorpay_order_id);
            formVerify.append('payment_id', resp.razorpay_payment_id);
            formVerify.append('signature', resp.razorpay_signature);

            // NOTE: the backend's Postman collection documents
            // /guest-payment/create-order but not its callback counterpart —
            // this path mirrors that endpoint's naming 1:1 as the most
            // consistent assumption. Confirm with backend if guest payments
            // don't verify.
            const { data: result } = await api.post(`${API_BASE}/guest-payment/callback`, formVerify);

            if (result?.status === false) {
              throw new Error(getResponseMessage(result, 'Signature verification failed'));
            }

            trackPurchase({
              transactionId: order_id,
              value: purchaseValue,
              items: cartItems,
              shipping: chargeSummary.delivery || 0,
              tax: chargeSummary.tax || 0,
            });

            clear();
            setLoading(false);
            navigate('/order-confirmation', {
              state: { order: { order_id, id: order_id } },
            });
          } catch (err) {
            setError(err.message || 'Payment verification failed');
            Swal(err);
            trackPaymentFailed({ orderId: order_id, message: err.message });
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      rzp.on('payment.failed', (resp) => {
        setLoading(false);
        setError(resp?.error?.description || 'Payment failed');
        trackPaymentFailed({ orderId: order_id, message: resp?.error?.description });
      });

      trackAddPaymentInfo(cartItems, {
        paymentType: 'Razorpay',
        value: chargeSummary.total || total,
      });

      rzp.open();
    } catch (e) {
      setLoading(false);
      setError(e.message || 'Unable to start payment');
    }
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
    <div className="w-[90%] lg:w-[80%] mx-auto py-8 md:py-10 px-0">
      <h1 className="text-3xl md:text-4xl font-semibold mb-8 text-[#6d5a52]">
        Your Order
      </h1>

      {cartItems.length === 0 ? (
        <p className="text-center">
          Your cart is empty.&nbsp;
          <button onClick={() => navigate('/shop')} className="underline text-blue-600">
            Continue Shopping
          </button>
        </p>
      ) : (
        <>
          {/* Header row */}
          <div className="hidden md:grid grid-cols-12 bg-[#eadcd5] text-[#6d5a52] rounded-md py-3 px-4 font-semibold mb-4 text-lg">
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
                    className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover bg-[#f6ebe6]"
                  />
                  <div>
                    <p className="text-base md:text-xl text-[#6d5a52] font-medium">{item.name}</p>
                    <p className="text-[#2A3443] text-sm md:text-lg font-semibold">
                      Rs.{item.price.toFixed(2)}/-
                    </p>
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
            <div className="w-full md:w-1/2 max-w-sm space-y-2">
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

          {/* Place order (logged in) / Login-or-Guest choice + guest form */}
          {user ? (
            <div className="flex justify-center mt-10">
              <button
                onClick={handlePlaceOrder}
                className="bg-[#1e2633] text-white text-base md:text-lg px-10 md:px-16 py-3 md:py-4 rounded-xl hover:opacity-90 transition"
              >
                Place order
              </button>
            </div>
          ) : !guestMode ? (
            <div className="mt-10 text-center py-10 bg-[#fdf8f5] rounded-3xl border border-[#eadcd5]">
              <h2 className="text-xl md:text-2xl font-bold text-[#6d5a52] mb-3">How would you like to checkout?</h2>
              <p className="text-[#b49d91] mb-8">Log in for faster checkout next time, or continue as a guest.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-[#1e2633] text-white px-10 py-3 rounded-xl hover:opacity-90 transition"
                >
                  Login / Signup
                </button>
                <button
                  onClick={() => { setError(''); setGuestMode(true); }}
                  className="border border-[#b49d91] text-[#b49d91] px-10 py-3 rounded-xl hover:bg-[#b49d91]/10 transition"
                >
                  Checkout as Guest
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-10 bg-[#fdf8f5] rounded-3xl border border-[#eadcd5] p-5 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold text-[#6d5a52] mb-6">Guest Checkout Details</h2>

              <button
                onClick={handleUseLocation}
                className="mb-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eadcd5] text-[#6d5a52] hover:opacity-90"
              >
                <span className="material-icons text-base">my_location</span>
                Use my Location
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#6d5a52]">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">Full Name</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                    placeholder="John Doe"
                  />
                </div>
                <div className="flex flex-col gap-1">
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
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-semibold">Phone Number</label>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                    }
                    className="border border-[#b49d91] rounded-xl px-4 py-2 bg-transparent placeholder:text-[#d2bfb7]"
                    placeholder="10-digit mobile number"
                  />
                  {form.phone && !MOBILE_REGEX.test(form.phone) && (
                    <p className="text-xs text-red-500">Enter a valid 10-digit mobile number</p>
                  )}
                </div>
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

              {deliveryMethods.length > 1 && (
                <div className="mt-6">
                  <h4 className="text-base font-semibold text-[#6d5a52] mb-2">Delivery Method</h4>
                  <div className="flex flex-wrap gap-2">
                    {deliveryMethods.map((m) => (
                      <label
                        key={m.id}
                        className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2 text-sm font-medium text-[#6d5a52] cursor-pointer ${String(deliveryMethod) === String(m.id) ? 'border-[#b49d91] bg-white' : 'border-[#d7c6bfd7] bg-[#f6ebe6]'
                          }`}
                      >
                        <input
                          type="radio"
                          name="guestDeliveryMethod"
                          className="accent-[#1e2633]"
                          checked={String(deliveryMethod) === String(m.id)}
                          onChange={() => setDeliveryMethod(m.id)}
                        />
                        {m.name}
                        {m.charge > 0 && <span className="text-[#b49d91]">(Rs.{m.charge.toFixed(2)})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4">
                <button
                  onClick={() => { setGuestMode(false); setError(''); }}
                  className="px-10 py-3 rounded-xl border border-[#6d5a52] text-[#6d5a52]"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleGuestCheckout}
                  className="px-10 py-3 rounded-xl bg-[#1e2633] text-white hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? 'Processing…' : 'Place Guest Order'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Auth modal */}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />
          <div className="relative bg-[#fdf8f5] w-full max-w-[96vw] md:max-w-[92vw] lg:max-w-[90%] rounded-3xl shadow-2xl p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <CloseBtn onClick={handleCancel} />

            {/* STEP: FORM */}
            {step === 'form' && (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-[#6d5a52] mb-6">
                  Enter Shipping Address
                </h2>

                <button
                  onClick={handleUseLocation}
                  className="mb-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#eadcd5] text-[#6d5a52] hover:opacity-90"
                >
                  <span className="material-icons text-base">my_location</span>
                  Use my Location
                </button>

                <hr className="mb-6 border-[#eadcd5]" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#6d5a52]">
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

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {deliveryMethods.length > 1 && (
                    <div className="m-2">
                      <h4 className="text-[20px] lg:text-xl font-semibold text-[#6d5a52]">
                        Delivery Method
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {deliveryMethods.map((m) => (
                          <label
                            key={m.id}
                            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2 text-sm lg:text-base font-medium text-[#6d5a52] cursor-pointer ${String(deliveryMethod) === String(m.id) ? 'border-[#b49d91] bg-white' : 'border-[#d7c6bfd7] bg-[#f6ebe6]'
                              }`}
                          >
                            <input
                              type="radio"
                              name="deliveryMethod"
                              className="accent-[#1e2633]"
                              checked={String(deliveryMethod) === String(m.id)}
                              onChange={() => setDeliveryMethod(m.id)}
                            />
                            {m.name}
                            {m.charge > 0 && <span className="text-[#b49d91]">(Rs.{m.charge.toFixed(2)})</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 m-2">
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
                  <h2 className="text-2xl md:text-3xl font-semibold text-[#6d5a52] mb-8">
                    Confirm your Order
                  </h2>
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
                        <div className="flex justify-between text-base">
                          <span>Delivery Charge</span>
                          <span className="text-[#b49d91] font-semibold">
                            Rs.{chargeSummary.delivery.toFixed(2)}/-
                          </span>
                        </div>
                        {chargeSummary.tax !== null && (
                          <div className="flex justify-between text-base">
                            <span>Tax</span>
                            <span className="text-[#b49d91] font-semibold">
                              Rs.{Number(chargeSummary.tax).toFixed(2)}/-
                            </span>
                          </div>
                        )}
                        {chargeSummary.packing !== null && (
                          <div className="flex justify-between text-base">
                            <span>Packing</span>
                            <span className="text-[#b49d91] font-semibold">
                              Rs.{Number(chargeSummary.packing).toFixed(2)}/-
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-2xl font-bold text-[#2A3443]">
                          <span>Total</span>
                          <span>Rs.{(chargeSummary.total || total).toFixed(2)}/-</span>
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
