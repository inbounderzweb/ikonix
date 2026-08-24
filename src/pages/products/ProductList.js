// src/components/ProductList.js
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import qs from 'qs';
import bag from '../../assets/bag.svg';
import ValidateOnLoad from '../../components/ValidateOnLoad';

import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart, readGuest, writeGuest, toKey } from '../../context/CartContext';
import Spinner from '../../components/loader/Spinner';

import { createApiClient } from '../../api/client';
import { toastSuccess, toastError, truncateName } from '../../utils/toast';
import { getApiErrorMessage, getResponseMessage, isAuthError } from '../../utils/apiError';
import { trackViewItemList, trackSelectItem, trackAddToCart } from '../../lib/ecommerce';

const LIST_ID = 'home_bestsellers';
const LIST_NAME = 'Home - Our Bestsellers';

const API_BASE = 'https://ikonixperfumer.com/beta/api';
const HOME_PRODUCTS_LIMIT = 8;

export default function ProductList({ hideFilters = false }) {
  const navigate = useNavigate();
  const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();

  // ✅ Use CartContext as source of truth + realtime badge updates
  const { items, refresh, addOrIncLocal, inc } = useCart();

  const checkInCart = useCallback((pid, vid) => {
    return items.some(
      (it) => 
        Number(it.id) === Number(pid) && 
        String(it.variantid) === String(vid)
    );
  }, [items]);

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

  const products = useMemo(() => data?.data || [], [data?.data]);

  const BESTSELLERS_LABEL = 'Best Sellers';

  // Build category filters, skipping any category that duplicates the
  // built-in Best Sellers tab (e.g. a "Best Sellers" product category)
  const categoryList = useMemo(
    () => [
      ...new Set(
        products
          .map((p) => p.category_name)
          .filter((name) => name && name.trim().toLowerCase() !== BESTSELLERS_LABEL.toLowerCase())
      ),
    ],
    [products]
  );

  const filters = useMemo(() => [BESTSELLERS_LABEL, ...categoryList], [categoryList]);

  const [selectedCategory, setSelectedCategory] = useState(filters[0]);

  // keep selectedCategory valid when filters change (first render / data refetch)
  useEffect(() => {
    if (!filters.includes(selectedCategory)) {
      setSelectedCategory(filters[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const filtered = useMemo(() => {
    if (selectedCategory === BESTSELLERS_LABEL) {
      return products.filter(
        (p) => p.category_name && p.category_name.trim().toLowerCase() === BESTSELLERS_LABEL.toLowerCase()
      );
    }
    return products.filter((p) => p.category_name === selectedCategory);
  }, [selectedCategory, products]);

  // Home page only teases a handful of products; the rest live on /shop
  const visibleProducts = useMemo(
    () => filtered.slice(0, HOME_PRODUCTS_LIMIT),
    [filtered]
  );

  // view_item_list: fire once per distinct rendered list (product ids +
  // category), not on every unrelated re-render.
  const lastListKeyRef = useRef(null);
  useEffect(() => {
    if (!visibleProducts.length) return;
    const key = `${selectedCategory}:${visibleProducts.map((p) => p.id).join(',')}`;
    if (lastListKeyRef.current === key) return;
    lastListKeyRef.current = key;
    trackViewItemList(visibleProducts, { listId: LIST_ID, listName: LIST_NAME });
  }, [visibleProducts, selectedCategory]);

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
        // User requested: no need to increase if already in cart
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
      toastSuccess(`${truncateName(product.name)} added to cart`);
      trackAddToCart(product, variant, 1);
    },
    [refresh]
  );

  /* ---------------- Add to cart handler ---------------- */
  const handleAddToCart = useCallback(
    async (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? '';
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      // ✅ Already in cart: increase quantity instead of a silent no-op
      if (checkInCart(product.id, variantid)) {
        inc(null, product.id, variantid);
        toastSuccess(`${truncateName(product.name)} quantity increased`);
        trackAddToCart(product, variant, 1);
        return;
      }

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
          toastSuccess(`${truncateName(product.name)} added to cart`);
          trackAddToCart(product, variant, 1);
        } else {
          refresh(); // rollback by refetch
          toastError(getResponseMessage(resp, 'Failed to add to cart'));
        }
      } catch (error) {
        console.error('❌ Error adding to cart:', error?.response?.data || error);
        refresh(); // rollback the optimistic update by refetching server truth
        if (isAuthError(error)) {
          setToken('');
          toastError('Your session has expired. Please log in again.');
        } else {
          toastError(getApiErrorMessage(error, 'Error adding to cart'));
        }
      }
    },
    [api, token, user, setToken, addOrIncLocal, refresh, saveGuestCart, checkInCart, inc]
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p>Error loading products.</p>
        <button onClick={refetch} className="mt-2 px-4 py-2 bg-[#b49d91] text-white rounded">Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* kick off token validation */}
      <ValidateOnLoad />

      <section className="mx-auto w-[90%] lg:w-[80%] py-6 mt-18">
        {!hideFilters && (
          <div className="flex gap-4 mb-4 overflow-x-auto scrollbar-hide no-scrollbar">
            {filters.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  px-6 py-3 rounded-full flex-shrink-0 transition text-[16px] font-fancy
                  ${selectedCategory === cat
                    ? 'bg-[#b49d91] text-[#3f342c]'
                    : 'bg-transparent text-[#a08876] border border-[#c9b6a9]'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid/List — horizontal scroll on mobile, grid from sm up */}
        <div className="flex flex-row gap-6 overflow-x-auto scrollbar-hide pb-4 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:overflow-visible sm:pb-0">
          {visibleProducts.map((product) => {
            const variant = product.variants?.[0] || {};
            const vid = variant.vid ?? '';
            const msrp = Number(variant.price) || 0;
            const sale = Number(variant.sale_price) || msrp;
            const hasDiscount = msrp > 0 && sale < msrp;

            return (
              <div key={`${product.id}-${vid}`} className="w-[70%] sm:w-full flex-shrink-0 flex flex-col">
                {/* Image tile */}
                <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#f0e4da]">
                  {/* Category chip */}
                  {product.category_name && (
                    <span className="absolute top-3 left-3 z-10 rounded-full border border-[#c9b6a9] bg-white/60 px-2 py-0.5 text-[10px] text-[#6b5d52]">
                      {product.category_name}
                    </span>
                  )}

                  {/* Add-to-cart button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="absolute top-3 right-3 z-10 rounded-full border border-[#c9b6a9] bg-white/50 p-2.5 hover:bg-white transition"
                  >
                    <img src={bag} alt="cart" className="h-4 w-4" />
                  </button>

                  {/* Product Image */}
                  <img
                    onClick={() => {
                      trackSelectItem(product, { listId: LIST_ID, listName: LIST_NAME });
                      navigate(`/product-details/${product.id}?vid=${vid}`);
                    }}
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                    alt={product.name}
                    className="h-full w-full cursor-pointer object-cover scale-105"
                  />
                </div>

                {/* Info below tile */}
                <div className="mt-4 px-1">
                  <h3 className="font-fancy text-[16px] sm:text-[17px] leading-snug text-[#2f3647] line-clamp-2 min-h-[2.6em]">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                    <span className="text-[17px] font-semibold text-[#2f3647]">Rs.{sale}/-</span>
                    {hasDiscount && (
                      <span className="text-sm text-[#2f3647]/50 line-through">
                        Rs.{msrp}/-
                      </span>
                    )}
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
            className="px-10 py-3 bg-[#b49d91] text-[#3f342c] font-fancy text-[17px] rounded-full hover:opacity-90 transition"
          >
            View all Products
          </button>
        </div>
      </section>
    </>
  );
}
