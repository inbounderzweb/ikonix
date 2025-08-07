// src/pages/products/ProductList.js

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import bag from '../../assets/bag.svg';

const API_BASE     = 'https://ikonixperfumer.com/beta/api';
const VALIDATE_URL = `${API_BASE}/validate`;
const PRODUCTS_URL = `${API_BASE}/products`;

export default function ProductList() {
  const navigate = useNavigate();

  // Auth / data state
  const [token, setToken]       = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Cart context stub (replace with your actual useCart)
  const refresh = () => window.dispatchEvent(new Event('cart:refresh'));

  // 1️⃣ On mount: validate → then fetch products
  useEffect(() => {
    const init = async () => {
      try {
        // a) Fetch token
        const authResp = await axios.post(
          VALIDATE_URL,
          qs.stringify({ email: 'api@ikonix.com', password: 'dvu1Fl]ZmiRoYlx5' }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const t = authResp.data?.token;
        if (!t) throw new Error('No token returned');
        localStorage.setItem('authToken', t);
        setToken(t);

        // b) Fetch products with that token
        const prodResp = await axios.get(PRODUCTS_URL, {
          headers: {
            Authorization: `Bearer ${t}`,
            'Content-Type': 'application/json',
          },
        });
        setProducts(prodResp.data?.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // 2️⃣ Guest-cart sync helper
  async function syncGuestCartWithServer(userId) {
    try {
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
      localStorage.setItem('guestCart', JSON.stringify(
        items.map(it => ({
          id:    it.id,
          vid:   it.variantid ?? it.vid,
          name:  it.name,
          image: it.image,
          price: it.price,
          qty:   Number(it.qty),
        }))
      ));
      refresh();
    } catch (e) {
      console.error('Sync guest cart failed', e);
    }
  }

  // 3️⃣ Guest‐cart helpers
  const readGuest  = () => JSON.parse(localStorage.getItem('guestCart') || '[]');
  const writeGuest = arr => localStorage.setItem('guestCart', JSON.stringify(arr));

  const saveGuestCart = product => {
    const raw = readGuest();
    const variant = product.variants[0] || {};
    const vid     = variant.vid;
    const price   = variant.sale_price || variant.price || 0;
    const idx     = raw.findIndex(i => i.id === product.id && i.vid === vid);

    if (idx > -1) {
      raw[idx].qty += 1;
    } else {
      raw.push({
        id:    product.id,
        vid,
        name:  product.name,
        image: product.image,
        price,
        qty:   1,
      });
    }
    writeGuest(raw);
    alert(`${product.name} added to cart (guest)`);
    refresh();
  };

  // 4️⃣ Add‐to‐cart handler
  const handleAddToCart = async product => {
    // if no token yet, treat as guest
    if (!token) {
      return saveGuestCart(product);
    }

    // You’ll need actual `user.id` here; replace with your context
    const userId = localStorage.getItem('authUserId') || 'guest';

    try {
      const variant = product.variants[0] || {};
      const resp = await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({
          userid:    userId,
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
      if (resp.data.success) {
        alert(`${product.name} added to cart`);
        await syncGuestCartWithServer(userId);
      } else {
        alert(resp.data.message || 'Failed to add to cart');
      }
    } catch (e) {
      console.error('Error adding to cart', e);
      alert('Error adding to cart');
    }
  };

  // 5️⃣ Filtering
  const categoryList = useMemo(
    () => [...new Set(products.map(p => p.category_name))],
    [products]
  );
  const filters = useMemo(
    () => ['Our Bestsellers', ...categoryList],
    [categoryList]
  );
  const [selectedCategory, setSelectedCategory] = useState(filters[0] || 'Our Bestsellers');
  const filtered = useMemo(
    () =>
      selectedCategory === 'Our Bestsellers'
        ? products
        : products.filter(p => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  // 6️⃣ Render
  if (loading) return <p className="text-center py-8">Loading…</p>;
  if (error)   return <p className="text-center py-8">{error}</p>;

  return (
    <section className="mx-auto w-[90%] md:w-[75%] py-8">
      {/* Filters */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-4">
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

      {/* Products Grid */}
      <div className="flex flex-row gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
        {filtered.map(product => {
          const variant = product.variants[0] || {};
          const msrp    = Number(variant.price)      || 0;
          const sale    = Number(variant.sale_price) || msrp;

          return (
            <div
              key={product.id + '-' + variant.vid}
              className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
            >
              <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
                {product.category_name}
              </span>

              <button
                onClick={e => { e.stopPropagation(); handleAddToCart(product); }}
                className="absolute top-2 right-2 rounded-full p-1"
              >
                <img src={bag} alt="cart" className="h-6 w-6" />
              </button>

              <img
                onClick={() => navigate('/product-details', { state: { product, vid: variant.vid } })}
                src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                alt={product.name}
                className="w-full h-72 object-cover cursor-pointer"
              />

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
