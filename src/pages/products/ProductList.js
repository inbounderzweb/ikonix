// src/components/ProductList.js
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import bag from '../../assets/bag.svg';
import ValidateOnLoad from '../../components/ValidateOnLoad';

import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Spinner from '../../components/loader/Spinner';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

// --- Guest cart helpers here match CartContext’s format & sanitation ---
const readGuest = () => {
  const raw = JSON.parse(localStorage.getItem('guestCart') || '[]');
  const normalized = (Array.isArray(raw) ? raw : []).map(x => ({
    id:    x.productid ?? x.id,
    vid:   x.variantid ?? x.vid,
    name:  x.name,
    image: x.image,
    price: Number(x.price) || 0,
    qty:   Number(x.qty)   || 1,
  }));
  const byKey = new Map();
  for (const it of normalized) {
    const key = `${it.id}::${it.vid}`;
    const prev = byKey.get(key);
    byKey.set(
      key,
      prev
        ? { ...it, qty: (Number(prev.qty) || 0) + (Number(it.qty) || 0) }
        : it
    );
  }
  return Array.from(byKey.values());
};

const writeGuest = arr => {
  const safe = (Array.isArray(arr) ? arr : []).map(i => ({
    id:    i.id,
    vid:   i.vid ?? i.variantid,
    name:  i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty:   Number(i.qty)   || 1,
  }));
  localStorage.setItem('guestCart', JSON.stringify(safe));
};

// Sync guest → server cart
async function syncGuestCartWithServer(userId, token) {
  const resp = await axios.post(
    `${API_BASE}/cart`,
    qs.stringify({ userid: userId }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const items = resp.data?.data || [];
  writeGuest(
    items.map(it => ({
      id:    it.id,
      vid:   it.variantid ?? it.vid,
      name:  it.name,
      image: it.image,
      price: Number(it.price) || 0,
      qty:   Number(it.qty)   || 1,
    }))
  );
}

export default function ProductList() {
  const navigate = useNavigate();
  const { user, token, isTokenReady } = useAuth();
  const { refresh } = useCart();

  // ▶︎ Fire the products request—but only after token is ready:
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetProductsQuery(
    undefined,
    { skip: !isTokenReady }
  );

  // ▶︎ Once token lands, retry the fetch
  useEffect(() => {
    if (isTokenReady) {
      refetch();
    }
  }, [isTokenReady, refetch]);

  const products = data?.data || [];

  // Build category filters
  const categoryList = useMemo(
    () => [...new Set(products.map(p => p.category_name))],
    [products]
  );
  const filters = ['Our Bestsellers', ...categoryList];
  const [selectedCategory, setSelectedCategory] = useState(filters[0]);
  const filtered = useMemo(
    () =>
      selectedCategory === 'Our Bestsellers'
        ? products
        : products.filter(p => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  const saveGuestCart = product => {
    const current = readGuest();
    const variant = product.variants?.[0] || {};
    const vid     = variant.vid;
    const price   = Number(variant.sale_price || variant.price || 0) || 0;

    const idx = current.findIndex(i => i.id === product.id && i.vid === vid);
    if (idx > -1) {
      current[idx].qty = (Number(current[idx].qty) || 0) + 1;
    } else {
      current.push({
        id:    product.id,
        vid,
        name:  product.name,
        image: product.image,
        price,
        qty:   1,
      });
    }
    writeGuest(current);
    alert(`${product.name} added to cart (guest)`);
    refresh();
  };

  // Add to cart handler
  const handleAddToCart = async product => {
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }
    const variant = product.variants?.[0] || {};
    try {
      const { data: resp } = await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({
          userid:    user.id,
          productid: product.id,
          variantid: variant.vid,
          qty:       1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      if (resp?.success) {
        alert(`${product.name} added to cart`);
        await syncGuestCartWithServer(user.id, token);
        refresh();
      } else {
        alert(resp?.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error?.response?.data || error);
      alert('Error adding to cart. Check console.');
    }
  };

  if (isLoading) return <p className="text-center py-8">
    <Spinner/>
  </p>;
  if (isError)   return <p className="text-center py-8">Error loading products..</p>;

  return (
    <>
      {/* kick off token validation */}
      <ValidateOnLoad />

      <section className="mx-auto w-[90%] md:w-[75%] py-8">
        {/* Filter Pills */}
        <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-4">
          {filters.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-4 py-2 rounded-full flex-shrink-0 transition
                ${selectedCategory === cat
                  ? 'bg-[#b49d91] text-white'
                  : 'bg-white text-[#b49d91] border border-[#b49d91]'}
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid/List */}
        <div
          className="
            flex flex-row gap-6 overflow-x-auto pb-4
            sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0
          "
        >
          {filtered.map(product => {
            const variant = product.variants?.[0] || {};
            const vid     = variant.vid;
            const msrp    = Number(variant.price)      || 0;
            const sale    = Number(variant.sale_price) || msrp;

            return (
              <div
                key={`${product.id}-${vid}`}
                className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
              >
                {/* Category badge */}
                <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
                  {product.category_name}
                </span>

                {/* Add-to-cart button */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 rounded-full p-1"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                {/* Product Image */}
                <img
                  onClick={() => navigate(`/product-details/${product.id}?vid=${vid ?? ''}`)
                    // navigate('/product-details', {
                    //   state: { product, vid },
                    // })
                  }
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-72 object-cover cursor-pointer"
                />

                {/* Info */}
                <div className="pt-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[#2A3443] font-[Lato] text-[14px]">
                      {product.category_name}
                    </p>
                  </div>
                  <div className="text-right">
                    {sale < msrp && (
                      <span className="text-xs line-through text-[#2A3443] font-[Lato] block">
                        ₹{msrp}/-
                      </span>
                    )}
                    <span className="font-semibold text-[#2A3443]">₹{sale}/-</span>
                  </div>
                </div>
              </div>
            );
          })}
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
    </>
  );
}
