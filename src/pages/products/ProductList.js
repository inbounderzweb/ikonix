// src/components/ProductList.js
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import qs from 'qs';
import bag from '../../assets/bag.svg';
import ValidateOnLoad from '../../components/ValidateOnLoad';

import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Spinner from '../../components/loader/Spinner';

import { createApiClient } from '../../api/client';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

/* ---------------- Guest cart helpers (consistent shape) ---------------- */

const safeJsonParse = (val, fallback) => {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? '')}`;

const readGuest = () => {
  const raw = safeJsonParse(localStorage.getItem('guestCart') || '[]', []);
  const arr = Array.isArray(raw) ? raw : [];

  // Normalize to { id, variantid, qty, ... } and merge duplicates
  const byKey = new Map();
  for (const x of arr) {
    const id = x.productid ?? x.id;
    const variantid = x.variantid ?? x.vid ?? '';
    const qty = Math.max(1, Number(x.qty) || 1);

    const item = {
      id: Number(id),
      variantid: String(variantid),
      name: x.name,
      image: x.image,
      price: Number(x.price) || 0,
      qty,
    };

    const key = toKey(item.id, item.variantid);
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...item, qty: (prev.qty || 0) + item.qty } : item);
  }

  return Array.from(byKey.values());
};

const writeGuest = (arr) => {
  const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
    id: Number(i.id),
    variantid: String(i.variantid ?? ''),
    name: i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty: Math.max(1, Number(i.qty) || 1),
  }));
  localStorage.setItem('guestCart', JSON.stringify(safe));
};

export default function ProductList() {
  const navigate = useNavigate();
  const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();

  // ✅ Use CartContext as source of truth + realtime badge updates
  const { refresh, addOrIncLocal } = useCart();

  // ✅ Use shared client with auto refresh/retry
  const api = useMemo(() => {
    return createApiClient({
      getToken: () => token,
      setToken,
      setIsTokenReady,
    });
  }, [token, setToken, setIsTokenReady]);

  // ▶︎ Fire the products request—but only after token is ready:
  const { data, isLoading, isError, refetch } = useGetProductsQuery(undefined, {
    skip: !isTokenReady,
  });

  // ▶︎ Once token lands, retry the fetch
  useEffect(() => {
    if (isTokenReady) refetch();
  }, [isTokenReady, refetch]);

  const products = data?.data || [];

  // Build category filters
  const categoryList = useMemo(
    () => [...new Set(products.map((p) => p.category_name).filter(Boolean))],
    [products]
  );

  const filters = useMemo(() => ['Our Bestsellers', ...categoryList], [categoryList]);

  const [selectedCategory, setSelectedCategory] = useState(filters[0]);

  // keep selectedCategory valid when filters change (first render / data refetch)
  useEffect(() => {
    if (!filters.includes(selectedCategory)) {
      setSelectedCategory(filters[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filtered = useMemo(() => {
    return selectedCategory === 'Our Bestsellers'
      ? products
      : products.filter((p) => p.category_name === selectedCategory);
  }, [selectedCategory, products]);

  /* ---------------- Guest: add item ---------------- */
  const saveGuestCart = useCallback(
    (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? '';
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      const current = readGuest();
      const key = toKey(product.id, variantid);
      const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

      if (idx > -1) {
        current[idx].qty = Math.max(1, Number(current[idx].qty) || 1) + 1;
      } else {
        current.push({
          id: product.id,
          variantid,
          name: product.name,
          image: product.image,
          price,
          qty: 1,
        });
      }

      writeGuest(current);

      // Refresh context so header badge updates instantly in guest mode
      refresh();
    },
    [refresh]
  );

  /* ---------------- Add to cart handler ---------------- */
  const handleAddToCart = useCallback(
    async (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? '';
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      // ✅ Guest
      if (!token || !user) {
        saveGuestCart(product);
        return;
      }

      // ✅ Logged-in: OPTIMISTIC update (instant header badge update)
      addOrIncLocal(
        {
          id: product.id,
          variantid,
          name: product.name,
          image: product.image,
          price,
          qty: 1,
        },
        1
      );

      try {
        const { data: resp } = await api.post(
          `${API_BASE}/cart`,
          qs.stringify({
            userid: user.id,
            productid: product.id,
            variantid,
            qty: 1,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        if (resp?.success) {
          refresh();
        } else {
          refresh(); // rollback by refetch
          alert(resp?.message || 'Failed to add to cart');
        }
      } catch (error) {
        // client.js should re-auth + retry automatically; if it still fails, we rollback
        console.error('❌ Error adding to cart:', error?.response?.data || error);
        refresh();
        // optional: avoid alert spam
        // alert('Error adding to cart.');
      }
    },
    [api, token, user, addOrIncLocal, refresh, saveGuestCart]
  );

  if (isLoading) {
    return (
      <p className="text-center py-8">
        <Spinner />
      </p>
    );
  }

  if (isError) {
    return <p className="text-center py-8">Error loading products..</p>;
  }

  return (
    <>
      {/* kick off token validation */}
      <ValidateOnLoad />

      <section className="mx-auto w-[90%] md:w-[75%] py-8">
        {/* Filter Pills */}
        <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-4">
          {filters.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`
                px-4 py-2 rounded-full flex-shrink-0 transition
                ${
                  selectedCategory === cat
                    ? 'bg-[#b49d91] text-white'
                    : 'bg-white text-[#b49d91] border border-[#b49d91]'
                }
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
          {filtered.map((product) => {
            const variant = product.variants?.[0] || {};
            const vid = variant.vid ?? '';
            const msrp = Number(variant.price) || 0;
            const sale = Number(variant.sale_price) || msrp;

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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 rounded-full p-1"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                {/* Product Image */}
                <img
                  onClick={() => navigate(`/product-details/${product.id}?vid=${vid}`)}
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
