// src/pages/shop/Shop.js
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
// import { ShoppingBagIcon } from '@heroicons/react/24/outline'; // (unused)
import bag from '../../../assets/bag.svg';

import shopherobg    from '../../../assets/shopherobg.svg';
import shopherobgmob from '../../../assets/shopheromobbg.svg';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';
import OwnPerfume         from '../../../components/ownperfume/OwnPerfume';

import { useGetProductsQuery } from '../../../features/product/productApi';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

/* ----------------------------- Guest Cart Utils ---------------------------- */
/** Read + sanitize + dedupe guest cart from localStorage */
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
  // Deduplicate (id + vid), sum qty
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


  





/** Write sanitized guest cart to localStorage */
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

/** Sync local guestCart with server cart (mirror for fallback flows) */
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
  writeGuest(
    serverItems.map(i => ({
      id:    i.id,
      vid:   i.variantid ?? i.vid,
      name:  i.name,
      image: i.image,
      price: Number(i.price) || 0,
      qty:   Number(i.qty)   || 1,
    }))
  );
}
/* -------------------------------------------------------------------------- */

export default function Shop() {
  const { data, isLoading, isError } = useGetProductsQuery();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

const location = useLocation();
  const { activeFilter } = location.state || {}; // default if nothing is passed




  // products array
  const products = useMemo(() => data?.data || [], [data]);

  // category filters
  const categories = useMemo(
    () => [...new Set(products.map(p => p.category_name))],
    [products]
  );


const filters = ['Our Bestsellers', ...categories];
const [selectedCategory, setSelectedCategory] = useState(filters[0]);

// Setup filter states (only one true at a time)
const filtersFromNav = {
  women: activeFilter === 'women',
  men: activeFilter === 'men',
  bestSellers: activeFilter === 'bestSellers',
};

console.log(filtersFromNav, 'valueeees');


// Update selectedCategory only when activeFilter changes
// useEffect(() => {
//   if (filtersFromNav.women) {
//     setSelectedCategory(filters[1]);
//   } else if (filtersFromNav.men) {
//     setSelectedCategory(filters[2]);
//   } else if (filtersFromNav.bestSellers) {
//     setSelectedCategory(filters[0]);
//   }
// }, [activeFilter, filters]);
// <-- dependency array



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

  // add-to-cart logic (guest path numeric-safe + dedupe)

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

  const handleAddToCart = async product => {
    const variant = product.variants?.[0] || {};
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
      if (resp?.success) {
        alert(`${product.name} added to cart`);
        await syncGuestCartWithServer(user.id, token);
        refresh();
      } else {
        alert(resp?.message || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err?.response?.data || err);
      alert('Error adding to cart. See console.');
    }
  };

  // view details
  const handleViewDetails = product => {
    const variant = product.variants?.[0] || {};
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
            const variant = product.variants?.[0] || {};
            const msrp    = Number(variant.price)      || 0;
            const sale    = Number(variant.sale_price) || msrp;
            return (
              <div
                key={`${product.id}-${variant.vid}`}
                className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
                onClick={() => handleViewDetails(product)}
              >
                {/* Category badge */}
                <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
                  {product.category_name}
                </span>

                {/* Cart icon */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 rounded-full p-1"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                {/* Image */}
                <img
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-72 object-cover cursor-pointer"
                />

                {/* Info */}
                <div className="pt-4 flex gap-5 justify-between">
                  <div>
                    <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[#2A3443] font-[Lato] text-[16px]">
                      {product.category_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 text-right">
                    {sale < msrp && (
                      <span className="text-xs line-through text-[#2A3443] font-[Lato]">
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
