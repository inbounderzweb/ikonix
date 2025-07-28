// src/components/ProductList.js
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import bag from '../../assets/bag.svg';

// Make sure you've installed tailwind-scrollbar-hide and added it to tailwind.config.js

async function syncGuestCartWithServer(userId, token) {
  const resp = await axios.post(
    'https://ikonixperfumer.com/beta/api/cart',
    qs.stringify({ userid: userId }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const serverItems = resp.data?.data || [];
  const formatted = serverItems.map(it => ({
    id:    it.id,
    name:  it.name,
    image: it.image,
    price: it.price,
    qty:   Number(it.qty),
  }));
  localStorage.setItem('guestCart', JSON.stringify(formatted));
}

export default function ProductList() {
  const { data, isLoading, isError } = useGetProductsQuery();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

  const products = data?.data || [];

  // Build category filters
  const categoryList = useMemo(
    () => [...new Set(products.map(p => p.category_name))],
    [products]
  );
  const filters = ['Our Bestsellers', ...categoryList];
  const [selectedCategory, setSelectedCategory] = useState(filters[0]);
  const filtered = useMemo(() => {
    return selectedCategory === 'Our Bestsellers'
      ? products
      : products.filter(p => p.category_name === selectedCategory);
  }, [selectedCategory, products]);

  // Guest‐cart helpers
  const readGuest  = () => JSON.parse(localStorage.getItem('guestCart') || '[]');
  const writeGuest = arr => localStorage.setItem('guestCart', JSON.stringify(arr));

  const saveGuestCart = item => {
    const raw = readGuest();
    const idx = raw.findIndex(i => i.id === item.id);
    if (idx > -1) raw[idx].qty += 1;
    else raw.push({
      id:    item.id,
      name:  item.name,
      image: item.image,
      price: item.price,
      qty:   1
    });
    writeGuest(raw);
    alert(`${item.name} added to cart (guest)`);
    refresh();
  };

  // Add to cart handler
  const handleAddToCart = async product => {
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }
    try {
      const { data: resp } = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({ userid: user.id, productid: product.id, qty: 1 }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      if (resp.success) {
        alert(`${product.name} added to cart`);
        await syncGuestCartWithServer(user.id, token);
        refresh();
      } else {
        alert(resp.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error("❌ Error adding to cart:", error?.response?.data || error);
      alert('Error adding to cart. Check console.');
    }
  };

  if (isLoading) return <p className="text-center py-8">Loading…</p>;
  if (isError)   return <p className="text-center py-8">Error loading products.</p>;

  return (
    <section className="mx-auto w-[90%] md:w-[75%] py-8">
      {/* Filter Pills */}
      <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-[15px]">
        {filters.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`
              px-4 py-2 rounded-full flex-shrink-0 transition
              ${selectedCategory === cat
                ? 'bg-[#b49d91] text-white border-transparent'
                : 'bg-white text-[#b49d91] border border-[#b49d91]'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile: horizontal carousel; Desktop: grid */}
      <div
        className={`
          flex space-x-4 overflow-x-auto scrollbar-hide py-4
          md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:space-x-0
        `}
      >
        {filtered.map(product => (
          <div
            key={product.id}
            className={`
              flex-shrink-0 w-[80%] sm:w-[45%]
              md:w-auto md:flex-none
              relative rounded-[10px]
            `}
          >
            {/* Category badge */}
            <span className="absolute top-2 left-2 border border-[#8C7367] text-[#8C7367] text-xs px-2 py-1 rounded-full">
              {product.category_name}
            </span>

            {/* Cart icon */}
            <button
              onClick={e => {
                e.stopPropagation();
                handleAddToCart(product);
              }}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
            >
              <img src={bag} alt="cart" className="h-5 w-5" />
            </button>

            {/* Image → Details */}
            <img
              onClick={() => navigate('/product-details', { state: { product } })}
              src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
              alt={product.name}
              className="w-full h-60 object-cover rounded-t-[10px] cursor-pointer"
            />

            {/* Info */}
            <div className=" mt-4 flex justify-between items-start">
              <div>
                <h3 className="text-[#2A3443] font-[400]">{product.name}</h3>
                <p className="text-[#2A3443] text-sm">{product.category_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#2A3443] line-through">
                  ₹{(product.price * 1.5).toFixed(0)}/-
                </p>
                <p className="text-sm font-semibold">₹{product.price}/-</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2 bg-[#b49d91] text-white rounded-full hover:opacity-90 transition"
        >
          View all Products
        </button>
      </div>
    </section>
  );
}
