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

/** Read/write guest cart in localStorage */
const readGuest  = () => JSON.parse(localStorage.getItem('guestCart') || '[]');
const writeGuest = arr => localStorage.setItem('guestCart', JSON.stringify(arr));

/** Sync local guestCart with server cart */
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

  // guest‐cart helpers
  const saveGuestCart = product => {
    const raw = readGuest();
    const idx = raw.findIndex(i => i.id === product.id);
    if (idx > -1) raw[idx].qty += 1;
    else raw.push({
      id:    product.id,
      name:  product.name,
      image: product.image,
      price: product.price,
      qty:   1,
    });
    writeGuest(raw);
    alert(`${product.name} added to cart (guest)`);
    refresh();
  };

  // add to cart
  const handleAddToCart = async product => {
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }
    try {
      const { data: resp } = await axios.post(
        'https://ikonixperfumer.com/beta/api/cart',
        qs.stringify({
          userid:    user.id,
          productid: product.id,
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

  // book now → details
  const handleViewDetails = product => {
    navigate('/product-details', { state: { product } });
  };

  if (isLoading) return <p className="text-center py-20">Loading…</p>;
  if (isError)   return <p className="text-center py-20">Something went wrong.</p>;

  const toShow = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* Hero - desktop */}
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

      {/* Hero - mobile */}
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
        <div className="flex gap-4 mb-6 overflow-x-auto">
          {filters.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full border flex-shrink-0 transition 
                ${selectedCategory === cat
                  ? 'bg-[#b49d91] text-white border-transparent'
                  : 'bg-white text-gray-700 border-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {toShow.map(product => (
            <div
              key={product.id}
              className="relative bg-[#f5efe9] rounded-xl overflow-hidden shadow-sm"
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
                onClick={() => handleViewDetails(product)}
                src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                alt={product.name}
                className="w-full h-48 object-cover cursor-pointer"
              />

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-base mb-1 line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 line-through">
                    ₹{(product.price * 1.5).toFixed(0)}/-
                  </span>
                  <span className="text-sm font-semibold">
                    ₹{product.price}/-
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* End reached */}
        {visibleCount >= filtered.length && (
          <p className="text-center text-sm text-gray-400 mt-6">
            No more products.
          </p>
        )}
      </section>

      {/* Sliders */}
      <SpecialDealsSlider />
      <OwnPerfume />
    </div>
  );
}
