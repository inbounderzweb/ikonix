// src/components/ProductList.js
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import bag from '../../assets/bag.svg';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

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
  // Persist server’s version (ensuring we include variantid too)
  localStorage.setItem(
    'guestCart',
    JSON.stringify(
      items.map(it => ({
        id:        it.id,
        vid:       it.variantid ?? it.vid,
        name:      it.name,
        image:     it.image,
        price:     it.price,
        qty:       Number(it.qty),
      }))
    )
  );
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
  const filtered = useMemo(
    () =>
      selectedCategory === 'Our Bestsellers'
        ? products
        : products.filter(p => p.category_name === selectedCategory),
    [selectedCategory, products]
  );

  // Guest-cart helpers (now include vid)
  const readGuest = () =>
    JSON.parse(localStorage.getItem('guestCart') || '[]');
  const writeGuest = arr =>
    localStorage.setItem('guestCart', JSON.stringify(arr));

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
        vid,                      // <-- now capturing variant id
        name:  product.name,
        image: product.image,
        price,                    // use sale_price if available
        qty:   1,
      });
    }
    writeGuest(raw);
    alert(`${product.name} added to cart (guest)`);
    refresh();
  };

  // Add to cart handler
  const handleAddToCart = async product => {
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }
    const variant = product.variants[0] || {};
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
    } catch (error) {
      console.error('❌ Error adding to cart:', error?.response?.data || error);
      alert('Error adding to cart. Check console.');
    }
  };

  if (isLoading) return <p className="text-center py-8">Loading…</p>;
  if (isError)   return <p className="text-center py-8">Error loading products.</p>;

  return (
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4">
        {filtered.map(product => {
          const variant = product.variants[0] || {};
          const vid     = variant.vid;
          const msrp    = Number(variant.price)      || 0;
          const sale    = Number(variant.sale_price) || msrp;

          return (
            <div
              key={`${product.id}-${vid}`}
              className="relative overflow-hidden "
            >
              {/* Category badge */}
              <span className="absolute top-2 left-2 inline-block
                              rounded-full border border-[#8C7367]
                              px-3 py-1 text-xs text-[#8C7367]">
                {product.category_name}
              </span>

              {/* Add‐to‐cart button */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                className="absolute top-2 right-2 rounded-full shadow"
              >
                <img src={bag} alt="cart" className="h-5 w-5" />
              </button>

              {/* Image */}
              <img
                onClick={() =>
                  navigate('/product-details', {
                    state: { product, vid },
                  })
                }
                src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                alt={product.name}
                className="w-full h-56 object-cover cursor-pointer"
              />



              {/* Info */}
              <div className=" pt-4 flex gap-5 justify-between">

                <div>
                  <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">
                  {product.name}
                  </h3>
                <p className='text-[#2A3443] font-[Lato] text-[16px]'>{product.category_name}</p>
                </div>
               
               <div className='grid grid-cols-1'>
               {sale < msrp && (
                    <span className="text-xs line-through text-[#2A3443] font-[Lato]">
                      ₹{msrp}/-
                    </span>
                  )}
                <span className="font-semibold text-[#2A3443]">₹{sale}/-</span>

               </div>


                {/* <p className="text-sm text-gray-500">{variant.weight} ml</p> */}
               
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
  );
}
