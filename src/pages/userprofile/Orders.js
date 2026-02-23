import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import qs from "qs";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const API_BASE_IMG = "https://ikonixperfumer.com/beta/";

function Orders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedOrder, setSelectedOrder] = useState(null); // For modal

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_BASE}/orders`,
        qs.stringify({
          userid: user.id,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      setOrders(response.data.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      {orders.slice(0, visibleCount).map((order, id) => (
        <div
          key={id}
          className="border p-4 mb-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
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
              <strong>Status:</strong> {order.status}
            </p>
            <p>
              <strong>Delivery:</strong> {order.delivery}
            </p>
            <p>
              <strong>Delivery Charge:</strong> ₹{order.delivery_charge}
            </p>
          </div>

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
      ))}

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
