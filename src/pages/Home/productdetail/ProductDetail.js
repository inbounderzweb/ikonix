// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import qs from 'qs';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import checkedCircle from '../../../assets/checkcircle.svg';
import ValidateOnLoad from '../../../components/ValidateOnLoad';
import DiscoverMore from './DiscoverMore';
import OwnPerfume from '../../../components/ownperfume/OwnPerfume';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

/* ------------------------------ Guest cart utils ------------------------------ */
const readGuest = () => {
  const raw = JSON.parse(localStorage.getItem('guestCart') || '[]');
  const norm = (Array.isArray(raw) ? raw : []).map(x => ({
    id: x.productid ?? x.id,
    vid: x.variantid ?? x.vid,
    name: x.name,
    image: x.image,
    price: Number(x.price) || 0,
    qty: Number(x.qty) || 1,
  }));
  // dedupe id+vid and sum qty
  const map = new Map();
  for (const it of norm) {
    const k = `${it.id}::${it.vid}`;
    const prev = map.get(k);
    map.set(k, prev ? { ...it, qty: (prev.qty || 0) + (it.qty || 0) } : it);
  }
  return Array.from(map.values());
};

const writeGuest = (arr) => {
  const safe = (Array.isArray(arr) ? arr : []).map(i => ({
    id: i.id,
    vid: i.vid ?? i.variantid,
    name: i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty: Number(i.qty) || 1,
  }));
  localStorage.setItem('guestCart', JSON.stringify(safe));
};
/* ----------------------------------------------------------------------------- */

export default function ProductDetails() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

  // URL params
  const { pid } = useParams();
  const [sp, setSp] = useSearchParams();
  const vid = sp.get('vid'); // may be null

  // State
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  // Fetch product by pid (and vid if present)
  useEffect(() => {
    if (!pid) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        const url = `${API_BASE}/products/${pid}${vid ? `?vid=${vid}` : ''}`;
        const { data } = await axios.get(url, { headers });
        if (!cancelled) setProduct(data?.data || data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Unable to load product');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [pid, vid, token]);

  // Gallery images
  const images = useMemo(() => {
    if (!product) return [];
    const pics = [];
    if (product.image) pics.push(product.image);
    if (product.more_images) {
      const extras = Array.isArray(product.more_images)
        ? product.more_images
        : String(product.more_images).split(',').map(s => s.trim());
      extras.forEach(img => pics.includes(img) || pics.push(img));
    }
    return pics;
  }, [product]);

  const [activeImg, setActiveImg] = useState('');
  useEffect(() => { if (images.length) setActiveImg(images[0]); }, [images]);

  // Variants
  const variantOptions = useMemo(
    () => (product?.variants || []).map(v => ({
      vid: v.vid,
      weight: v.weight,
      price: Number(v.price),
      sale_price: Number(v.sale_price),
    })),
    [product]
  );

  const [selectedVar, setSelectedVar] = useState(null);

  // Pick selected variant from URL, else first; keep URL in sync
  useEffect(() => {
    if (!variantOptions.length) return;
    const fromUrl = vid && variantOptions.find(v => String(v.vid) === String(vid));
    const next = fromUrl || variantOptions[0];
    setSelectedVar(next);

    if (!fromUrl) {
      setSp(prev => {
        const p = new URLSearchParams(prev);
        p.set('vid', next.vid);
        return p;
      }, { replace: true });
    }
  }, [variantOptions, vid, setSp]);

  // Pricing
  const unitPrice = useMemo(() => {
    if (!selectedVar) return 0;
    const sale = Number(selectedVar.sale_price);
    const mrp = Number(selectedVar.price);
    return sale > 0 && sale < mrp ? sale : mrp;
  }, [selectedVar]);

  const totalPrice = (unitPrice || 0) * qty;

  /* ---------------------------- Add to cart handlers --------------------------- */
  const addGuest = () => {
    if (!product || !selectedVar?.vid) return;
    const current = readGuest();
    const idx = current.findIndex(i => String(i.id) === String(pid) && String(i.vid) === String(selectedVar.vid));
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    if (idx > -1) current[idx].qty += qty;
    else current.push({
      id: Number(pid),
      vid: selectedVar.vid,
      name: product.name,
      image: product.image,
      price,
      qty,
    });

    writeGuest(current);
    Swal.fire(`${product.name} added to cart (guest)`);
  };

  const addServer = () => {
    if (!product || !selectedVar?.vid) return Promise.reject(new Error('No variant'));
    return axios.post(
      `${API_BASE}/cart`,
      qs.stringify({ userid: user.id, productid: pid, variantid: selectedVar.vid, qty }),
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  };

  const handleAddToCart = async () => {
    if (!product || !selectedVar?.vid) return;
    if (!token || !user) return addGuest();
    try {
      await addServer();
      await refresh();
      Swal.fire(`${product.name} added to cart`);
    } catch {
      Swal.fire('Error adding to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVar?.vid) return;
    if (!token || !user) {
      addGuest();
      return navigate('/checkout');
    }
    try {
      await addServer();
      await refresh();
      navigate('/checkout');
    } catch {
      Swal.fire('Error proceeding to checkout');
    }
  };
  /* --------------------------------------------------------------------------- */

  if (loading) return <p className="p-6 text-center">Loading…</p>;
  if (error || !product) {
    return (
      <div className="p-6">
        {error || 'Product not found.'}&nbsp;
        <Link to="/shop" className="underline text-blue-600">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[92%] md:w-[75%] py-6">
      <ValidateOnLoad />

      {/* breadcrumb */}
      <nav className="text-sm text-[#6C5950]/70 mb-6">
        <Link to="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/shop" className="hover:underline">Products</Link>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* GALLERY */}
        <div>
          <div className="w-full rounded-2xl overflow-hidden flex items-center justify-start">
            {activeImg && (
              <img
                src={`https://ikonixperfumer.com/beta/assets/uploads/${activeImg}`}
                alt={product.name}
                className="w-[90%] float-start h-auto object-cover"
              />
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-4 gap-3 flex">
              {images.map(img => (
                <button
                  key={img}
                  onClick={() => setActiveImg(img)}
                  className={`h-20 rounded-xl overflow-hidden border transition ${
                    img === activeImg ? 'border-[#b49d91]' : 'border-gray-200 hover:border-[#b49d91]/60'
                  }`}
                >
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${img}`}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="flex flex-col">
          <h1 className="text-[#8C7367] font-[Lato] text-[32px] md:text-[36px] font-[700] tracking-[0.5px]">
            {product.name}
          </h1>

          {/* Feature ticks */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              'Premium fragrances',
              'Long-lasting freshness',
              'A perfume for every mood',
              'Perfect for everyday use',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <img src={checkedCircle} alt="" className="h-5 w-5" />
                <span className="text-[#6C5950] font-[Lato] text-[16px]">{f}</span>
              </div>
            ))}
          </div>

          {/* Stars + reviews */}
          <div className="mt-4 flex items-center gap-2 text-[#6C5950]">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarSolid key={i} className="h-5 w-5 text-[#8C7367]" />
            ))}
            <span className="ml-2 text-[14px]">(90)</span>
            <span className="text-[14px] ml-1">Reviews and Ratings</span>
          </div>

          <hr className="border-[#B39384]/60 mt-6" />

          {/* Offer pills */}
          <div className="mt-6 grid gap-4">
            <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
              Flat 20%off&nbsp; I&nbsp; No discount code required.
            </span>
            <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
              Free Perfume 100ml on shopping above Rs 1800/-
            </span>
          </div>

          <hr className="border-[#B39384]/60 my-6" />

          {/* Price + Qty + Variants */}
          <div className="grid grid-cols-1 lg:grid-cols-3 items-center justify-between gap-5">
            {/* Price */}
            <div className="flex items-baseline gap-3">
              <div className="text-[28px] md:text-[30px] font-semibold text-[#2A3443]">
                ₹{totalPrice.toFixed(0)}/-
              </div>
            </div>

            {/* Quantity */}
            <div className="w-full">
              <div className="flex items-center justify-between w-full border border-[#B39384]/60 rounded-full h-12">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  className="px-4 py-2 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="h-5 w-5 text-[#6C5950]" />
                </button>
                <span className="min-w-[2rem] text-center text-[#2A3443]">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="px-4 py-2"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="h-5 w-5 text-[#6C5950]" />
                </button>
              </div>
            </div>

            {/* Variant pills */}
            <div className="flex gap-3">
              {variantOptions.map((v) => {
                const selected = v.vid === selectedVar?.vid;
                return (
                  <button
                    key={v.vid}
                    onClick={() => {
                      setSelectedVar(v);
                      setQty(1);
                      setSp(prev => {
                        const p = new URLSearchParams(prev);
                        p.set('vid', v.vid);
                        return p;
                      }, { replace: true });
                    }}
                    className={[
                      'h-12 px-2 w-full rounded-[12px] text-[15px] transition border',
                      selected
                        ? 'bg-[#b49d91] text-white border-[#b49d91]'
                        : 'bg-white text-[#6C5950] border-[#B39384]/60',
                    ].join(' ')}
                  >
                    {v.weight} ml
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <button
              disabled={!selectedVar?.vid}
              onClick={handleAddToCart}
              className="w-full h-12 rounded-md bg-[#b49d91] text-white font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
            <button
              disabled={!selectedVar?.vid}
              onClick={handleBuyNow}
              className="w-full h-12 rounded-md bg-[#2A3443] text-white font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>

          <hr className="border-[#B39384]/60 mt-7" />
        </div>
      </div>

      <hr className="border-[#B39384]/60 mt-7 w-full" />

      {/* Discover more section */}
      <DiscoverMore currentId={product.id} />
      <SpecialDealsSlider />
      <OwnPerfume />
    </div>
  );
}
