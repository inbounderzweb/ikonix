// src/pages/checkout/CheckoutPage.js
import React from 'react';
import { useLocation } from 'react-router-dom';

export default function CheckoutPage() {
  const { state } = useLocation();
  const product = state?.product;

  if (!product) return <p className="text-center mt-10">No product found for checkout.</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Checkout</h2>

      <div className="border rounded p-4 shadow">
        <img
          src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
          alt={product.name}
          className="w-full h-48 object-cover rounded mb-3"
        />
        <h3 className="text-lg font-semibold">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.description}</p>
        <p className="text-xs text-gray-500 mt-1">Category: {product.category_name}</p>
      </div>

      {/* Additional checkout form or payment integration can be added here */}
      <div className="mt-6">
        <button className="w-full bg-blue-600 text-white py-2 rounded">
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}
