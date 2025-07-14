import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import qs from 'qs';

export default function ProductDetails() {
  const { state } = useLocation();
  const product = state?.product;
  const { user, token } = useAuth();
  const navigate = useNavigate();

  if (!product) return <p>Product not found.</p>;

  const handleAddToCart = async () => {
    if (!token || !user) {
      alert('User not logged in or token missing.');
      return;
    }

    try {
      const response = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({
          userid: user.id,
          productid: product.id,
          qty: 1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (response.data.success || response.data.status) {
        alert(`${product.name} added to cart`);
      } else {
        alert(response.data.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error("❌ Error adding to cart:", error?.response?.data || error.message);
      alert('Error adding to cart. See console for details.');
    }
  };

  const handleBuyNow = async () => {
    if (!token || !user) {
      alert('User not logged in or token missing.');
      return;
    }

    try {
      // 1. Add product to cart
      await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({
          userid: user.id,
          productid: product.id,
          qty: 1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // 2. Fetch updated cart
      const fetchResponse = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({
          userid: user.id,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const cartItems = fetchResponse.data?.data || [];

      // 3. Navigate to checkout with cart items
      navigate('/checkout', { state: { cartItems } });

    } catch (error) {
      console.error('Buy now failed:', error?.response?.data || error.message);
      alert('Failed to buy product. Try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <img
        src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
        alt={product.name}
        className="w-full h-64 object-cover rounded mb-4"
      />
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <p className="text-gray-600 mt-2">{product.description}</p>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        Category: {product.category_name}
      </p>

      <div className="flex gap-4">
        <button
          onClick={handleBuyNow}
          className="bg-green-600 text-white px-6 py-2 rounded"
        >
          Buy Now
        </button>
        <button
          onClick={handleAddToCart}
          className="bg-yellow-500 text-white px-6 py-2 rounded"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
