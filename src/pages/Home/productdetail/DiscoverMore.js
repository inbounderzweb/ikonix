import React, { useState, useEffect, useCallback } from 'react';
import { useGetProductsQuery } from '../../../features/product/productApi';
import bag from '../../../assets/bag.svg'; // adjust if needed
import { useAuth } from '../../../context/AuthContext';
import qs from 'qs';
import { useNavigate } from 'react-router-dom';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { useCart, readGuest, writeGuest, toKey } from '../../../context/CartContext';
import { toastSuccess, toastError, truncateName } from '../../../utils/toast';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

function DiscoverMore() {

    const navigate = useNavigate()
  const [moreProducts, setMoreProducts] = useState([]);
   const { user, token, isTokenReady } = useAuth();
  const { data, isLoading, isError, refetch } = useGetProductsQuery(undefined, { skip: !isTokenReady });

  // ✅ Use CartContext as source of truth so the header/mobile-nav badge
  // updates live (this page was previously bypassing CartContext entirely).
  const { items, refresh, addOrIncLocal, inc, api } = useCart();

  const checkInCart = useCallback(
    (pid, vid) =>
      items.some(
        (it) => Number(it.id) === Number(pid) && String(it.variantid) === String(vid)
      ),
    [items]
  );

useEffect(() => {
  if (isTokenReady) refetch();
}, [isTokenReady, refetch]);




const handleViewDetails = (item) => {
  const variant = item.variants?.[0] || {};
  navigate(`/product-details/${item.id}?vid=${variant.vid}`);
};

  /** Save guest cart (shared shape/helpers from CartContext) */
  const saveGuestCart = (product, variantid, price) => {
    const current = readGuest();
    const key = toKey(product.id, variantid);
    const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

    if (idx === -1) {
      current.push({
        id: product.id,
        variantid,
        name: product.name,
        image: product.image,
        price,
        qty: 1,
      });
      writeGuest(current);
    }

    refresh();
    toastSuccess(`${truncateName(product.name)} added to cart`);
  };

  /** Add to cart (server or guest) */
  const handleAddToCart = async (product) => {
    const variant = product.variants?.[0] || {};
    const variantid = variant.vid ?? '';
    const price = Number(variant.sale_price || variant.price || 0) || 0;

    if (checkInCart(product.id, variantid)) {
      inc(null, product.id, variantid);
      toastSuccess(`${truncateName(product.name)} quantity increased`);
      return;
    }

    if (!token || !user) {
      saveGuestCart(product, variantid, price);
      return;
    }

    addOrIncLocal(
      { id: product.id, variantid, name: product.name, image: product.image, price, qty: 1 },
      1
    );

    try {
      const { data: resp } = await api.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id, productid: product.id, variantid, qty: 1 }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (resp?.success) {
        refresh();
        toastSuccess(`${truncateName(product.name)} added to cart`);
      } else {
        refresh();
        toastError(resp?.message || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err?.response?.data || err);
      refresh();
      toastError('Error adding to cart. See console.');
    }
  };

  /** Fetch product list */
  useEffect(() => {
    if (data?.data) {
      setMoreProducts(data.data);
    }
  }, [data]);

  if (isLoading) return <p className="text-center py-20">Loading…</p>;
  if (isError) return <p className="text-center py-20">Something went wrong.</p>;

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold mb-6 text-center font-[luxia] text-[#8C7367] text-[27px] tracking-[0.5px]">Discover More</h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {moreProducts.map((item) => {
          const variant = item.variants?.[0] || {};
          const msrp = Number(variant.price) || 0;
          const sale = Number(variant.sale_price) || msrp;
          const discountPct = msrp > 0 && sale < msrp ? Math.round(((msrp - sale) / msrp) * 100) : 0;
          const savings = msrp > sale ? msrp - sale : 0;
          const badgeLabel = discountPct >= 40 ? "Best Deal" : discountPct > 0 ? `${discountPct}% OFF` : null;

          return (
            <div
              onClick={() => handleViewDetails(item)}
              key={`${item.id}-${variant.vid}`}
              className="relative overflow-hidden rounded-[10px] bg-white shadow hover:shadow-lg transition cursor-pointer"
            >
              {/* Discount badge */}
              {badgeLabel && (
                <span className={`absolute top-2 left-2 z-10 text-white text-xs font-bold px-2 py-1 rounded-md ${discountPct >= 40 ? "bg-orange-500" : "bg-red-500"}`}>
                  {discountPct >= 40 ? "🔥 " : ""}{badgeLabel}
                </span>
              )}

              {/* Cart icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(item);
                }}
                className="absolute top-2 right-2 z-10 rounded-full p-1 bg-white/80 backdrop-blur-sm shadow"
              >
                <img src={bag} alt="cart" className="h-6 w-6" />
              </button>

              {/* Image */}
              <img
                src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
                alt={item.name}
                className="w-full h-64 object-cover"
              />

              {/* Info */}
              <div className="p-3">
                <h3 className="text-[#2A3443] font-[Lato] text-[15px] leading-snug font-medium">
                  {item.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarSolid key={i} className="h-3 w-3 text-[#b49d91]" />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">(4.8)</span>
                </div>

                {/* Pricing */}
                {(sale > 0 || msrp > 0) && (
                  <div className="mt-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-[#2A3443] text-[17px]">₹{sale || msrp}/-</span>
                      {discountPct > 0 && (
                        <>
                          <span className="text-xs line-through text-gray-400">₹{msrp}/-</span>
                          <span className="text-xs text-green-600 font-bold">{discountPct}% OFF</span>
                        </>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">Save ₹{savings}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DiscoverMore;
