// src/pages/shop/Shop.js
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

import shopherobg    from '../../../assets/shopherobg.svg';
import shopherobgmob from '../../../assets/shopheromobbg.svg';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume         from '../../../components/ownperfume/OwnPerfume';

import { useGetProductsQuery } from '../../../features/product/productApi';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

/** Read/write guest cart in localStorage */
const readGuest  = () => JSON.parse(localStorage.getItem('guestCart') || '[]');
const writeGuest = arr => localStorage.setItem('guestCart', JSON.stringify(arr));

/** Sync local guestCart with server cart */
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
  const serverItems = resp.data?.data || [];
  const formatted = serverItems.map(i => ({
    id:    i.id,
    name:  i.name,
    image: i.image,
    price: i.price,
    qty:   Number(i.qty),
  }));
  writeGuest(formatted);
}

export default function Shop() {
  const { data, isLoading, isError } = useGetProductsQuery();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

  // products array
  const products = useMemo(() => data?.data || [], [data]);

  // category filters
  const categories = useMemo(
    () => [...new Set(products.map(p => p.category_name))],
    [products]
  );
  const filters = ['Our Bestsellers', ...categories];
  const [selectedCategory, setSelectedCategory] = useState(filters[0]);

  const filtered = useMemo(
    () =>
      selectedCategory === 'Our Bestsellers'
        ? products
        : products.filter(p => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  // infinite scroll
  const [visibleCount, setVisibleCount] = useState(12);
  const onScroll = useCallback(() => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 200
    ) {
      setVisibleCount(c => c + 6);
    }
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // add-to-cart logic
  const saveGuestCart = product => {
    const raw = readGuest();
    const variant = product.variants[0] || {};
    const idx = raw.findIndex(i => i.id === product.id && i.vid === variant.vid);
    if (idx > -1) raw[idx].qty += 1;
    else raw.push({
      id:    product.id,
      vid:   variant.vid,
      name:  product.name,
      image: product.image,
      price: variant.sale_price || variant.price,
      qty:   1,
    });
    writeGuest(raw);
    alert(`${product.name} added to cart (guest)`);
    refresh();
  };

  const handleAddToCart = async product => {
    const variant = product.variants[0] || {};
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }
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
      if (resp.success) {
        alert(`${product.name} added to cart`);
        await syncGuestCartWithServer(user.id, token);
        refresh();
      } else {
        alert(resp.message || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err?.response?.data || err);
      alert('Error adding to cart. See console.');
    }
  };

  // view details
  const handleViewDetails = product => {
    const variant = product.variants[0] || {};
    navigate('/product-details', {
      state: { product, vid: variant.vid },
    });
  };

  if (isLoading) return <p className="text-center py-20">Loading…</p>;
  if (isError)   return <p className="text-center py-20">Something went wrong.</p>;

  const toShow = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* Hero */}
      <div
        className="h-[242px] hidden md:flex w-[90%] xl:w-[75%] mx-auto
                   bg-center bg-cover justify-end mt-6"
        style={{ backgroundImage: `url(${shopherobg})` }}
      >
        <span className="font-[luxia] text-[#53443D] text-[36px] leading-tight
                         lg:mr-[80px] xl:mr-[200px] flex items-center">
          Lorem Ipsum <br /> dolor sit amet
        </span>
      </div>
      <div
        className="h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover
                   justify-center mt-6"
        style={{ backgroundImage: `url(${shopherobgmob})` }}
      >
        <p className="text-center mt-6 font-[luxia] text-[27px] leading-tight">
          Lorem Ipsum <br /> dolor sit amet
        </p>
      </div>

      {/* Filters */}
      <section className="mx-auto w-[90%] md:w-[75%] py-8">
        <div className="flex gap-4 mb-6 overflow-x-auto pb-4">
          {filters.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full flex-shrink-0 transition
                ${selectedCategory === cat
                  ? 'bg-[#b49d91] text-white border-transparent'
                  : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {toShow.map(product => {
            const variant = product.variants[0] || {};
            const msrp    = Number(variant.price)      || 0;
            const sale    = Number(variant.sale_price) || msrp;
            return (
              <div
                key={`${product.id}-${variant.vid}`}
                className="relative bg-[#f5efe9] rounded-xl overflow-hidden shadow-sm cursor-pointer"
                onClick={() => handleViewDetails(product)}
              >
                {/* Category badge */}
                <span className="absolute top-2 left-2 bg-white/80 text-xs text-gray-700
                                  px-2 py-1 rounded-full">
                  {product.category_name}
                </span>

                {/* Cart icon */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white/80 rounded-full"
                >
                  <ShoppingBagIcon className="h-5 w-5 text-gray-800" />
                </button>

                {/* Image */}
                <img
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />

                {/* Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-semibold text-base line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {variant.weight} ml
                  </p>
                  <div className="mt-auto flex items-baseline justify-between">
                    {sale < msrp && (
                      <span className="text-xs line-through text-gray-400 mr-2">
                        ₹{msrp}/-
                      </span>
                    )}
                    <span className="font-semibold">₹{sale}/-</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visibleCount >= filtered.length && (
          <p className="text-center text-sm text-gray-400 mt-6">
            No more products.
          </p>
        )}
      </section>

      {/* Extras */}
      <SpecialDealsSlider />
      <OwnPerfume />
    </div>
  );
}
