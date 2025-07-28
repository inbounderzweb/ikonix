// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import {
  CheckIcon,
  StarIcon as StarSolid,
} from '@heroicons/react/24/solid';
import {
  MinusIcon,
  PlusIcon,
  StarIcon as StarOutline,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

export default function ProductDetails() {
  /* -------- router/state -------- */
  const { state, search } = useLocation();
  const { id: paramId }   = useParams();             // if route is /product-details/:id
  const hintProd          = state?.product || null;
  const pid               =
    hintProd?.id ||
    paramId ||
    new URLSearchParams(search).get('id');           // fallback ?id=7

  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

  /* -------- product state -------- */
  const [product, setProduct]  = useState(hintProd);
  const [loadingProd, setLoad] = useState(!hintProd);
  const [prodError, setPErr]   = useState('');

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;

    const fetchProduct = async () => {
      setLoad(true);
      setPErr('');
      try {
        console.log('[ProductDetails] fetching product', pid);
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        let { data } = await axios.get(`${API_BASE}/products/${pid}`, { headers });

        // If backend responds 401 when no token, you could retry WITHOUT token or WITH token.
        // This example retries WITHOUT token ONLY if the first attempt used a token and failed 401.
        if (data?.status === false && data?.message?.toLowerCase().includes('unauth')) {
          console.warn('401 on product fetch, retrying without token…');
          ({ data } = await axios.get(`${API_BASE}/products/${pid}`));
        }

        const apiProd = data?.data || data;
        if (!cancelled) setProduct(apiProd);
      } catch (e) {
        console.error('Product fetch error:', e?.response?.data || e);
        if (!cancelled) setPErr('Unable to load product');
      } finally {
        if (!cancelled) setLoad(false);
      }
    };

    // ALWAYS fetch to ensure fresh data
    fetchProduct();

    return () => { cancelled = true; };
  }, [pid, token]);

  /* -------- gallery -------- */
  const images = useMemo(() => {
    if (!product) return [];
    const arr = [];
    if (product.image) arr.push(product.image);
    if (product.more_images) {
      const extra = Array.isArray(product.more_images)
        ? product.more_images
        : String(product.more_images)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
      extra.forEach(img => !arr.includes(img) && arr.push(img));
    }
    return arr;
  }, [product]);

  const [activeImg, setActiveImg] = useState('');
  useEffect(() => {
    if (images.length) setActiveImg(images[0]);
  }, [images]);

  /* -------- qty & size -------- */
  const [qty, setQty] = useState(1);

  const sizeOptions = useMemo(() => {
    if (!product) return ['100 ml', '150 ml'];
    if (Array.isArray(product.weights) && product.weights.length) return product.weights;
    if (product.weight) return [product.weight];
    return ['100 ml', '150 ml'];
  }, [product]);

  const [size, setSize] = useState(sizeOptions[0]);
  useEffect(() => {
    setSize(sizeOptions[0]);
  }, [sizeOptions]);

  /* -------- static text -------- */
  const features = [
    'Premium fragrances',
    'Long-lasting freshness',
    'A perfume for every mood',
    'Perfect for everyday use',
  ];
  const offers = [
    'Flat 20%off | No discount code required.',
    'Free Perfume 100ml on shopping above Rs 1800/-',
  ];

  const dummyReviews = useMemo(
    () => [
      { id: 1, name: 'Rahul',  rating: 5, text: 'Amazing fragrance, lasts all day!',         date: '2025-07-01' },
      { id: 2, name: 'Ananya', rating: 4, text: 'Great value for money.',                     date: '2025-06-22' },
      { id: 3, name: 'Mohit',  rating: 5, text: 'My go-to perfume now.',                      date: '2025-05-11' },
      { id: 4, name: 'Isha',   rating: 3, text: 'Good, but projection could be better.',      date: '2025-05-02' },
      { id: 5, name: 'Zara',   rating: 5, text: 'Loved it! Will reorder soon.',               date: '2025-04-18' },
    ],
    []
  );
  const ratingCounts = useMemo(() => {
    const c = { 5:0, 4:0, 3:0, 2:0, 1:0 };
    dummyReviews.forEach(r => c[r.rating]++);
    return c;
  }, [dummyReviews]);
  const totalReviews = dummyReviews.length;
  const avgRating    = totalReviews
    ? (dummyReviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  /* -------- guest cart helpers -------- */
  const readGuest  = () => JSON.parse(localStorage.getItem('guestCart') || '[]');
  const writeGuest = (arr) => localStorage.setItem('guestCart', JSON.stringify(arr));
  const saveGuestCart = (item, addQty) => {
    const raw = readGuest();
    const idx = raw.findIndex(i => i.id === item.id);
    if (idx > -1) raw[idx].qty += addQty;
    else raw.push({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      qty: addQty,
    });
    writeGuest(raw);
    alert(`${item.name} added to cart (guest)`);
  };

  /* -------- server cart helpers -------- */
  const addToCartServer = async (addQty) =>
    axios.post(`${API_BASE}/cart`,
      qs.stringify({ userid: user.id, productid: product.id, qty: addQty }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

  const handleAddToCart = async () => {
    if (!product) return;
    if (!token || !user) {
      saveGuestCart(product, qty);
      return;
    }
    try {
      await addToCartServer(qty);
      await refresh();
      alert(`${product.name} added to cart`);
    } catch (err) {
      console.error('❌ Error adding to cart:', err?.response?.data || err);
      alert('Error adding to cart.');
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    if (!token || !user) {
      saveGuestCart(product, qty);
      navigate('/checkout');
      return;
    }
    try {
      await addToCartServer(qty);
      await refresh();
      navigate('/checkout');
    } catch (err) {
      console.error('Buy now failed:', err?.response?.data || err);
      alert('Failed to proceed. Try again.');
    }
  };

  /* -------- UI helpers -------- */
  const renderStars = (value, sizeClass = 'h-4 w-4') => {
    const v = Number(value);
    return (
      <span className="inline-flex">
        {[1,2,3,4,5].map(i =>
          i <= v ? (
            <StarSolid key={i} className={`${sizeClass} text-[#b49d91]`} />
          ) : (
            <StarOutline key={i} className={`${sizeClass} text-[#b49d91]`} />
          )
        )}
      </span>
    );
  };

  const RatingBar = ({ stars, percent }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-right">{stars} Stars</span>
      <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
        <div className="h-full bg-[#b49d91]" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-8 text-left">{percent}%</span>
    </div>
  );

  /* -------- render -------- */
  if (loadingProd) {
    return <div className="p-6 text-center">Loading product…</div>;
  }
  if (prodError || !product) {
    return (
      <div className="p-6">
        {prodError || 'Product not found.'}&nbsp;
        <Link to="/shop" className="text-blue-600 underline">Back to Shop</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[90%] md:w-[75%] py-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link>
        <span> / </span>
        <Link to="/shop" className="hover:underline">Products</Link>
        <span> / </span>
        <span className="text-gray-700">Product Details</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left - gallery */}
        <div>
          <div className="w-full h-[340px] md:h-[420px] rounded-xl overflow-hidden flex items-center justify-center">
            {activeImg && (
              <img
                src={`https://ikonixperfumer.com/beta/assets/uploads/${activeImg}`}
                alt={product.name}
                className="object-contain w-full h-full"
              />
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {images.map((img) => (
                <button
                  key={img}
                  onClick={() => setActiveImg(img)}
                  className={`border rounded-lg overflow-hidden h-24 flex items-center justify-center ${
                    activeImg === img ? 'border-[#b49d91]' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${img}`}
                    alt=""
                    className="object-contain w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right - info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#2A3443]">
            {product.name}
          </h1>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-sm text-[#2A3443]">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-[#b49d91]" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            {renderStars(avgRating, 'h-4 w-4')}
            <span>({totalReviews})</span>
            <span>Reviews and Ratings</span>
          </div>

          <hr className="my-4" />

          <div className="space-y-2">
            {offers.map((o, idx) => (
              <div
                key={idx}
                className="inline-block rounded-full border border-[#b49d91] px-4 py-2 text-xs text-[#2A3443]"
              >
                {o}
              </div>
            ))}
          </div>

          <hr className="my-4" />

          <div className="flex flex-wrap items-center gap-6">
            <p className="text-2xl font-semibold text-[#2A3443]">
              Rs.{product.price || product.sale_price || 0}/-
            </p>

            {/* Qty */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Qty</span>
              <div className="flex items-center border rounded-full overflow-hidden">
                <button
                  className="px-3 py-1 disabled:opacity-30"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="px-3">{qty}</span>
                <button
                  className="px-3 py-1"
                  onClick={() => setQty(q => q + 1)}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Size */}
            <div className="flex gap-2">
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 rounded text-xs ${
                    size === s
                      ? 'bg-[#b49d91] text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={handleAddToCart}
              className="flex-1 py-3 rounded-md bg-[#b49d91] text-white text-base hover:opacity-90 transition"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-3 rounded-md bg-[#2A3443] text-white text-base hover:opacity-90 transition"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>

      {/* Product details */}
      <hr className="my-10" />
      <section>
        <h2 className="text-xl font-semibold mb-4 text-[#2A3443]">Product Details</h2>
        <p className="text-sm leading-relaxed text-[#2A3443]">
          {product.description ||
            `Step into a world of unparalleled opulence with ${product.name}, an exquisite fragrance that weaves an enchanting symphony of gold and luxury.`}
        </p>
      </section>

      {/* Reviews */}
      <hr className="my-10" />
      <section>
        <h2 className="text-xl font-semibold text-[#2A3443] mb-4">Reviews</h2>

        {/* summary */}
        <div className="flex flex-col md:flex-row gap-8 mb-6">
          <div className="flex-1 flex flex-col items-start">
            <div className="flex items-center gap-2">
              {renderStars(avgRating, 'h-5 w-5')}
              <span className="text-[#2A3443] text-sm">{avgRating} out of 5</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              99% OF REVIEWERS RECOMMEND THIS PRODUCT
            </p>

            <p className="mt-4 text-sm text-[#2A3443]">
              {totalReviews} reviews
              <span className="mx-2">+</span>
              <button
                className="underline text-sm"
                onClick={() => alert('TODO: Add review modal')}
              >
                Add a Review
              </button>
            </p>
          </div>

          <div className="flex-1 space-y-1">
            {[5,4,3,2,1].map(stars => {
              const percent = totalReviews
                ? Math.round((ratingCounts[stars] / totalReviews) * 100)
                : 0;
              return <RatingBar key={stars} stars={stars} percent={percent} />;
            })}
          </div>
        </div>

        {/* list */}
        <div className="space-y-6">
          {dummyReviews.map(r => (
            <div key={r.id} className="border-b pb-4">
              <div className="flex items-center gap-2 text-sm text-[#2A3443]">
                {renderStars(r.rating, 'h-4 w-4')}
                <span className="font-medium">{r.name}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(r.date).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#2A3443]">{r.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
