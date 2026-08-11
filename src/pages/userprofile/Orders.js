import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardDocumentCheckIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../../context/AuthContext";
import { createApiClient } from "../../api/client";
import qs from "qs";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const API_BASE_IMG = "https://ikonixperfumer.com/beta/";

// Confirmed backend vocabulary (from real order payloads) is just these three
// strings: "Processing" (order just placed, being prepped), "Confirmed"
// (order confirmed & dispatched/shipped), "Delivered" (order handed over).
// Cancellation isn't confirmed from a real payload yet, so it's still guessed.
const TRACKING_STEPS = [
  {
    label: "Order Placed",
    message: "We've received your order and it's being prepared.",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    label: "Dispatched",
    message: "Your order has been confirmed and is on its way.",
    icon: TruckIcon,
  },
  {
    label: "Delivered",
    message: "Your order has been delivered. Enjoy!",
    icon: CheckCircleIcon,
  },
];

function normalizeStatus(order) {
  const raw =
    order?.status ??
    order?.order_status ??
    order?.orderStatus ??
    order?.delivery_status ??
    order?.status_text ??
    "";
  const s = String(raw).trim().toLowerCase();

  if (!s) return { step: 0, cancelled: false, raw };
  if (/cancel|refund|return/.test(s)) return { step: -1, cancelled: true, raw };
  if (/deliver/.test(s)) return { step: 2, cancelled: false, raw };
  if (/confirm|dispatch|ship|transit|out for/.test(s)) return { step: 1, cancelled: false, raw };
  if (/process|pending|placed|new|pack/.test(s)) return { step: 0, cancelled: false, raw };

  const n = Number(raw);
  if (!Number.isNaN(n) && raw !== "") {
    const clamped = Math.max(0, Math.min(TRACKING_STEPS.length - 1, Math.round(n)));
    return { step: clamped, cancelled: false, raw };
  }

  // Unrecognized non-empty string — still show a stepper at step 0 rather
  // than guessing progress, but the raw text below stays visible.
  return { step: 0, cancelled: false, raw };
}

function getOrderId(order) {
  return order?.order_id ?? order?.orderid ?? order?.orderId ?? order?.id ?? null;
}

function TrackingSteps({ status }) {
  if (status.cancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
        <XCircleIcon className="h-4 w-4" />
        {status.raw || "Cancelled"}
      </span>
    );
  }

  const current = TRACKING_STEPS[Math.max(0, status.step)];

  return (
    <div className="mt-3">
      <div className="flex items-center">
        {TRACKING_STEPS.map((s, i) => {
          const done = i <= status.step;
          const Icon = s.icon;
          return (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1 w-[70px] text-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    done ? "bg-[#b49d91] text-white" : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] leading-tight ${done ? "text-[#6b5d52] font-medium" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < TRACKING_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-4 ${i < status.step ? "bg-[#b49d91]" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">{current.message}</p>
    </div>
  );
}

function Orders() {
  const { user, token, setToken, setIsTokenReady } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  // Shared client that auto-refreshes the API token on 401/403 — same one
  // checkout/addresses use, so this list doesn't silently fail on a stale
  // token (the previous raw-axios call had no such recovery).
  const api = useMemo(
    () => createApiClient({ getToken: () => token, setToken, setIsTokenReady }),
    [token, setToken, setIsTokenReady]
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null); // For modal
  const highlightRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post(
        `${API_BASE}/orders`,
        qs.stringify({ userid: user.id }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const list = response.data?.data || [];
      if (process.env.NODE_ENV !== "production" && list.length) {
        // Diagnostic aid: check this against normalizeStatus()/getOrderId()
        // above if status/order-id ever look wrong for a real order.
        console.log("[Orders] raw order shape from API:", list[0]);
      }
      setOrders(list);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [api, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id, fetchOrders]);

  // Handle scroll to show more orders (frontend lazy load)
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop + 100 >=
      document.documentElement.scrollHeight
    ) {
      setVisibleCount((prev) => prev + 5);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Jump to the order the user just placed, if we were sent here with ?highlight=
  useEffect(() => {
    if (highlightId && orders.length && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, orders]);

  return (
    <div className="w-[75%] mx-auto mt-2">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 mb-6">
        <Link to="/user-profile" className="hover:underline">
          Profile
        </Link>
        <span> / </span>
        <span className="text-gray-700">Orders</span>
      </nav>

      {/* Orders Section */}
      {orders.slice(0, visibleCount).map((order, id) => {
        const orderId = getOrderId(order);
        const status = normalizeStatus(order);
        const isHighlighted = highlightId && orderId && String(orderId) === String(highlightId);

        return (
          <div
            key={orderId ?? id}
            ref={isHighlighted ? highlightRef : null}
            className={`border p-4 mb-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow ${
              isHighlighted ? "border-[#b49d91] ring-2 ring-[#b49d91]/40" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                {orderId && (
                  <p className="text-xs text-gray-400 mb-0.5">Order #{orderId}</p>
                )}
                <p className="text-sm text-gray-500">
                  <strong>Date:</strong> {order.date}
                </p>
                <p className="text-lg font-semibold">{order.name}</p>
                <p className="text-sm text-gray-600">{order.category}</p>
              </div>
              <img
                src={`${API_BASE_IMG}/assets/uploads/${order.image}`}
                alt={order.name}
                className="w-20 h-20 object-cover rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-3 text-gray-700">
              <p>
                <strong>Price:</strong> ₹{order.price}
              </p>
              <p>
                <strong>Quantity:</strong> {order.qty}
              </p>
              <p>
                <strong>Delivery:</strong> {order.delivery}
              </p>
              <p>
                <strong>Delivery Charge:</strong> ₹{order.delivery_charge}
              </p>
            </div>

            <TrackingSteps status={status} />

            {/* View Address button */}
            <div className="mt-3">
              <button
                onClick={() => setSelectedOrder(order)}
                className="text-sm text-blue-600 hover:underline"
              >
                View Address
              </button>
            </div>
          </div>
        );
      })}

      {loading && (
        <p className="text-gray-500 text-center mt-4">Loading your orders...</p>
      )}
      {error && <p className="text-red-500 text-center">{error}</p>}
      {!loading && orders.length === 0 && (
        <p className="text-gray-500 text-center">No orders found.</p>
      )}

      {/* Address Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[90%] md:w-[400px] p-5 rounded-lg shadow-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedOrder(null)}
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
              Order Address
            </h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-medium">Billing Address</p>
                <p>{selectedOrder.billing_address}</p>
              </div>
              <div>
                <p className="font-medium">Delivery Address</p>
                <p>{selectedOrder.delivery_address}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
