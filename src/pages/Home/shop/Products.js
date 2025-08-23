// src/pages/home/sections/Products.js
import React, { useState } from 'react';
import { ReactComponent as Left } from '../../../assets/caretleft.svg';
import { ReactComponent as Right } from '../../../assets/caretright.svg';
import { Link } from 'react-router-dom';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import axios from 'axios';
import qs from 'qs';

import perfume from '../../../assets/perfume.svg';

import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

const FILTERS = [
  'Our Bestsellers',
  'New Arrival',
  'Mens',
  "Women’s",
  'Unisex',
];

// Provide a stable variant id for demo/static items so the cart shape matches live products
const PRODUCTS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  vid: 'default', // ← consistent variant key
  title: 'Bangalore Bloom',
  category: "Men’s",
  image: perfume, // ← replace with real image path if needed
  original: 599,
  price: 399,
  tag: 'Mens',
}));

/* ----------------------------- Guest Cart Utils ---------------------------- */
/** Read + sanitize + dedupe guest cart from localStorage */
const readGuest = () => {
  const raw = JSON.parse(localStorage.getItem('guestCart') || '[]');
  const normalized = (Array.isArray(raw) ? raw : []).map(x => ({
    id:    x.productid ?? x.id,
    vid:   x.variantid ?? x.vid ?? 'default',
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
    vid:   i.vid ?? i.variantid ?? 'default',
    name:  i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty:   Number(i.qty)   || 1,
  }));
  localStorage.setItem('guestCart', JSON.stringify(safe));
};

/** Mirror server cart into guestCart for fallback flows (when logged in) */
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
      vid:   i.variantid ?? i.vid ?? 'default',
      name:  i.name,
      image: i.image,
      price: Number(i.price) || 0,
      qty:   Number(i.qty)   || 1,
    }))
  );
}
/* -------------------------------------------------------------------------- */

export default function Products({ currentPage = 1, totalPages = 4 }) {
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const { user, token } = useAuth();
  const { refresh } = useCart();

  const handleAddToCart = async (p) => {
    // Normalize the local "product" to the same shape used elsewhere
    const product = {
      id:    p.id,
      name:  p.title,
      image: p.image,
      price: Number(p.price) || 0,
      variants: [{ vid: p.vid || 'default', price: p.original, sale_price: p.price }],
    };
    const variant = product.variants?.[0] || {};
    const vid     = variant.vid;

    // Guest path
    if (!token || !user) {
      const current = readGuest();
      const idx = current.findIndex(i => i.id === product.id && i.vid === vid);
      if (idx > -1) {
        current[idx].qty = (Number(current[idx].qty) || 0) + 1;
      } else {
        current.push({
          id:    product.id,
          vid,
          name:  product.name,
          image: product.image,
          price: Number(variant.sale_price || variant.price || 0) || 0,
          qty:   1,
        });
      }
      writeGuest(current);
      alert(`${product.name} added to cart (guest)`);
      refresh();
      return;
    }

    // Logged-in path
    try {
      const { data: resp } = await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({
          userid:    user.id,
          productid: product.id,
          variantid: vid,
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

  return (
    <section className="py-8 w-[95%] md:w-[75%] mx-auto">
      {/* Filters */}
      <div className="overflow-x-auto md:overflow-visible">
        <ul className="flex space-x-3 px-4 scrollbar-hide md:justify-start md:px-0">
          {FILTERS.map(f => (
            <li key={f} className="whitespace-nowrap">
              <button
                onClick={() => setActiveFilter(f)}
                className={
                  `px-4 py-2 rounded-full text-sm transition-colors` +
                  (f === activeFilter
                    ? ' bg-[#b48e7f] text-white'
                    : ' border border-[#b48e7f] text-[#b48e7f]')
                }
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Products */}
      <div className="mt-6 overflow-x-auto md:overflow-visible">
        <div className="flex gap-24 xl:gap-5 md:flex-wrap xl:grid grid-cols-4">
          {PRODUCTS.map(p => (
            <div
              key={`${p.id}-${p.vid || 'default'}`}
              className="w-60 flex-shrink-0 rounded-xl relative"
            >
              <span className="absolute top-2 left-2 border-[0.1px] border-[#8C7367] rounded-full px-[16px] py-[4px] text-xs">
                {p.tag}
              </span>

              <button
                className="absolute top-2 right-2 text-gray-600 border-[0.1px] border-[#8C7367] rounded-full p-1 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(p);
                }}
                aria-label="Add to cart"
                title="Add to cart"
              >
                <HiOutlineShoppingBag size={20} />
              </button>

              <div>
                <div className="flex justify-center">
                  <Link to={'/product-details'}>
                    <img
                      src={p.image}
                      alt={p.title}
                      className="object-contain"
                    />
                  </Link>
                </div>

                <div className="mt-4 flex justify-between items-end mb-6">
                  <div>
                    <p className="font-[lato] font-normal text-[16px] tracking-[0.5px]">{p.title}</p>
                    <p className="text-left font-[lato] font-normal text-[16px] tracking-[0.5px]">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-[lato] font-normal text-[12px] tracking-[0.5px] line-through text-[#2A3443]">
                      Rs.{Number(p.original) || 0}/-
                    </p>
                    <p className="font-[lato] font-normal text-[16px] tracking-[0.5px]">
                      Rs.{Number(p.price) || 0}/-
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* pagination footer */}
      <div className="w-full border-t border-[#C9B9AF] py-4 flex items-center justify-between text-[#9C7E6E] text-[16px] font-normal bg-[#FAF8F6]">
        <button className="ml-4 p-2 hover:opacity-70">
          <Left className="w-5 h-5" strokeWidth={1.5} />
        </button>

        <span className="text-center flex-1 text-[16px]">
          Page {currentPage} of {totalPages}
        </span>

        <button className="mr-4 p-2 hover:opacity-70">
          <Right className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
}
