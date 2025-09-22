// src/pages/CheckoutPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import qs from "qs";
import loadRazorpay from "../../../utils/loadRazorpay";
import { XMarkIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";

import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import AuthModal from "../../../Authmodal/AuthModal";
import Swal from "sweetalert2";

const API_BASE = "https://ikonixperfumer.com/beta/api";

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
    readGuest,
    syncGuestToServer,
  } = useCart();

  /* ✅ Only refresh when component mounts or user/token changes */
  useEffect(() => {
    refresh();
  }, [refresh, user, token]);

  /* Totals (rupees) */
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const total = subtotal;

  /* Modals & steps */
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  // 'form' | 'select' | 'confirm'
  const [step, setStep] = useState("form");

  /* Address state */
  const [form, setForm] = useState({
    street: "",
    city: "",
    pincode: "",
    district: "",
    state: "",
    country: "",
  });
  const [addresses, setAddresses] = useState([]);
  const [shippingId, setShippingId] = useState(null);
  const [billingId, setBillingId] = useState(null);
  const [sameAsShip, setSameAsShip] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState(1); // 1 std, 2 express

  /* Status */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newAddrId, setNewAddrId] = useState(null);

  /* Helpers */
  const normalizeAddr = (a) => ({
    id: a.aid || a.id || a.address_id,
    doorno: a.doorno,
    house: a.house,
    street: a.street,
    city: a.city,
    pincode: a.pincode,
    district: a.district,
    state: a.state,
    country: a.country,
    company: a.company,
    gst: a.gst,
    type: a.atype || a.type,
    deflt: a.deflt,
  });

  const addrLabel = (a = {}) =>
    [
      a.doorno,
      a.house,
      a.street,
      a.city,
      a.district,
      a.state,
      a.country,
      a.pincode,
    ]
      .filter(Boolean)
      .join(", ");

  // helper to push the selected address to the top
  const ordered = (list, selectedId) => {
    const first = list.find((a) => a.id === selectedId);
    const rest = list.filter((a) => a.id !== selectedId);
    return first ? [first, ...rest] : rest;
  };

  const fetchDefaultAddresses = async () => {
    try {
      const payload = qs.stringify({ userid: user.id });
      const { data } = await axios.post(`${API_BASE}/address`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      if (data.status === false) {
        Swal(data.message || "Address not found – please add one");
        setStep("form");
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
      setStep("form");
      setShowAddressModal(true);
      return [];
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const list = await fetchDefaultAddresses();
      setStep(list.length ? "select" : "form");
      setShowAddressModal(true);
    } catch {
      setError("Could not load addresses");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddAddress = async () => {
    for (let k of Object.keys(form)) {
      if (!String(form[k] ?? "").trim()) {
        setError(`Please fill in ${k}`);
        return;
      }
    }
    setError("");
    setLoading(true);
    try {
      const payload = qs.stringify({ userid: user.id, ...form });
      const { data } = await axios.post(`${API_BASE}/address/add`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const ok =
        data.success === true ||
        data.success === "true" ||
        data.success === 1 ||
        data.success === "1" ||
        data.status === true;
      if (ok) {
        const addedObj = data.data ? normalizeAddr(data.data) : null;
        if (addedObj?.id) {
          setAddresses((prev) => [addedObj, ...prev]);
          setShippingId(addedObj.id);
          setBillingId(addedObj.id);
          setNewAddrId(addedObj.id);
        } else {
          const list = await fetchDefaultAddresses();
          const last = list[list.length - 1];
          if (last) {
            setShippingId(last.id);
            setBillingId(last.id);
            setNewAddrId(last.id);
          }
        }
        setForm({
          doorno: "",
          house: "",
          street: "",
          city: "",
          pincode: "",
          district: "",
          state: "",
          country: "",
          company: "",
          gst: "",
          type: "",
        });
        setStep("select");
      } else {
        setError(data.message || "Failed to add address");
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContinue = () => {
    const billId = sameAsShip ? shippingId : billingId;
    if (!shippingId || !billId) {
      setError("Please select both shipping and billing address");
      return;
    }
    setError("");
    setStep("confirm");
  };

  // ---------------------------
  // Razorpay Pay Click Handler
  // ---------------------------
  const handlePayClick = async (order_id) => {
    try {
      if (!order_id) throw new Error("Missing internal order id");
      setError("");
      setLoading(true);

      const payload = qs.stringify({
        order_id,
        userid: user?.id,
        client_hint_amount: Math.round(Number(total)),
        receipt: `ikonix_${order_id}`,
        notes: JSON.stringify({ source: "web", cart: cartItems.length }),
      });

      const { data: raw } = await axios.post(
        `${API_BASE}/payment/create-order`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const res = raw?.data ?? raw ?? {};
      const keyId = "rzp_test_R8MrWyxyABfzGy";
      const rzpOrderId = res.porder_id;

      if (!rzpOrderId || !String(rzpOrderId).startsWith("order_")) {
        throw new Error("Invalid Razorpay order id from create-order");
      }

      await loadRazorpay();
      if (!window.Razorpay) throw new Error("Razorpay SDK not available");

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: rzpOrderId,
        name: "Ikonix Perfumer",
        description: "Order Payment",
        image: "/favicon.ico",
        prefill: {
          name: res.customer?.name ?? user?.name ?? "",
          email: res.customer?.email ?? user?.email ?? "",
          contact: res.customer?.phone ?? "",
        },
        theme: { color: "#b49d91" },
        handler: async (resp) => {
          try {
            const form = new FormData();
            form.append("userid", String(user.id));
            form.append("order_id", String(order_id));
            form.append("porder_id", resp.razorpay_order_id);
            form.append("payment_id", resp.razorpay_payment_id);
            form.append("signature", resp.razorpay_signature);

            const verifyRes = await fetch(`${API_BASE}/payment/callback`, {
              method: "POST",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              body: form,
            });
            const result = await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok || result?.status === false) {
              throw new Error(result?.message || "Signature verification failed");
            }
          } catch (err) {
            setError(err.message || "Payment verification failed");
            Swal(err);
          } finally {
            setLoading(false);
            navigate("/order-confirmation");
          }
        },
        modal: { ondismiss: () => { setLoading(false); navigate("/"); } },
      });

      rzp.on("payment.failed", (resp) => {
        setLoading(false);
        setError(resp?.error?.description || "Payment failed");
      });

      rzp.open();
    } catch (e) {
      setLoading(false);
      setError(e.message || "Unable to start payment");
    }
  };

  const handleCheckout = async () => {
    const billId = sameAsShip ? shippingId : billingId;
    try {
      setLoading(true);
      setError("");
      await ensureServerCartNotEmpty();
      const payload = qs.stringify({
        userid: user.id,
        shipping_address: shippingId,
        billing_address: billId,
        delivery_method: deliveryMethod,
      });
      const doCheckout = () =>
        axios.post(`${API_BASE}/checkout`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        });
      let { data } = await doCheckout();
      if (data?.status === true) {
        setShowAddressModal(false);
        handlePayClick(data.order_id);
      } else {
        setError(data?.message || "Checkout failed, please try again");
      }
    } catch {
      setError("Checkout failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddressModal(false);
    setStep("form");
    setError("");
    setNewAddrId(null);
  };

  const QtyBox = ({ value, onDec, onInc }) => (
    <div className="flex items-center border border-[#6d5a52] rounded-[12px] px-4 py-2 text-[#6d5a52] text-sm">
      <button
        className="px-2 disabled:opacity-30"
        onClick={onDec}
        disabled={value <= 1}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="mx-3">{value}</span>
      <button className="px-2" onClick={onInc}>
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const CloseBtn = ({ onClick }) => (
    <button
      onClick={onClick}
      className="absolute right-6 top-6 p-1 rounded-full hover:bg-gray-100"
      aria-label="close"
    >
      <XMarkIcon className="w-5 h-5 text-[#6d5a52]" />
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-semibold mb-8 text-[#6d5a52]">Your Order</h1>

      {cartItems.length === 0 ? (
        <p className="text-center">
          Your cart is empty.&nbsp;
          <button
            onClick={() => navigate("/shop")}
            className="underline text-blue-600"
          >
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
              <div
                key={item.cartid}
                className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-center"
              >
                <div className="flex items-center gap-4 md:col-span-7">
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover bg-[#f6ebe6]"
                  />
                  <div>
                    <p className="text-xl text-[#6d5a52] font-medium">
                      {item.name}
                    </p>
                    <p className="text-[#2A3443] text-lg font-semibold">
                      Rs.{item.price.toFixed(2)}/-
                    </p>
                  </div>
                </div>

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

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <div className="relative bg-[#fdf8f5] w-full lg:max-w-[90%] rounded-3xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <CloseBtn onClick={handleCancel} />
            {/* STEP: FORM / SELECT / CONFIRM remain same as your original */}
          </div>
        </div>
      )}
    </div>
  );
}
