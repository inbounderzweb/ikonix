// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import qs from 'qs';
import { CheckIcon, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { MinusIcon, PlusIcon, StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';

export default function ProductDetails() {
  const { state }   = useLocation();
  const navigate    = useNavigate();
  const { user, token } = useAuth();
  const { refresh } = useCart();

  const hintProd = state?.product;
  const vid      = state?.vid;
  const pid      = hintProd?.id;
  const [product, setProduct] = useState(hintProd);
  const [loading, setLoading] = useState(!hintProd);
  const [error, setError]     = useState('');

  // fetch by variant‐ID
  useEffect(() => {
    if (!pid || !vid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        // GET /products/:pid?vid=:vid
        const url = `${API_BASE}/products/${pid}?vid=${vid}`;
        const { data } = await axios.get(url, { headers });
        if (!cancelled) {
          setProduct(data.data || data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Unable to load product');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pid, vid, token]);

  // gallery
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

  // variants
  const variantOptions = useMemo(() => (product?.variants || []).map(v => ({
    vid: v.vid,
    weight: v.weight,
    price: Number(v.price),
    sale_price: Number(v.sale_price),
  })), [product]);
  const [selectedVar, setSelectedVar] = useState(variantOptions[0] || {});
  useEffect(() => { if (variantOptions.length) setSelectedVar(variantOptions[0]); }, [variantOptions]);

  // qty
  const [qty, setQty] = useState(1);

  // compute prices
  const unitPrice  = selectedVar.sale_price < selectedVar.price ? selectedVar.sale_price : selectedVar.price;
  const totalPrice = unitPrice * qty;

  // cart
  const addGuest = () => {
    const guest = JSON.parse(localStorage.getItem('guestCart') || '[]');
    const idx   = guest.findIndex(i => i.vid === selectedVar.vid);
    if (idx > -1) guest[idx].qty += qty;
    else guest.push({
      id: pid,
      vid: selectedVar.vid,
      name: product.name,
      image: product.image,
      price: unitPrice,
      qty
    });
    localStorage.setItem('guestCart', JSON.stringify(guest));
    alert(`${product.name} added to cart (guest)`);
  };
  const addServer = () => axios.post(
    `${API_BASE}/cart`,
    qs.stringify({ userid: user.id, productid: pid, variantid: selectedVar.vid, qty }),
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const handleAddToCart = async () => {
    if (!token || !user) {
      addGuest();
    } else {
      try {
        await addServer();
        await refresh();
        alert(`${product.name} added to cart`);
      } catch {
        alert('Error adding to cart');
      }
    }
  };
  const handleBuyNow = async () => {
    if (!token || !user) {
      addGuest();
      navigate('/checkout');
    } else {
      try {
        await addServer();
        await refresh();
        navigate('/checkout');
      } catch {
        alert('Error proceeding to checkout');
      }
    }
  };

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
    <div className="mx-auto w-[90%] md:w-[75%] py-6">
      {/* breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/">Home</Link> / <Link to="/shop">Products</Link> / <span>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* gallery */}
        <div>
          <div className="w-full h-[340px] md:h-[420px] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center">
            {activeImg && (
              <img
                src={`https://ikonixperfumer.com/beta/assets/uploads/${activeImg}`}
                alt=""
                className="object-contain w-full h-full"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {images.map(img => (
                <button
                  key={img}
                  onClick={() => setActiveImg(img)}
                  className={`h-20 border rounded-lg overflow-hidden ${
                    img === activeImg ? 'border-[#b49d91]' : 'border-gray-200'
                  }`}
                >
                  <img src={`https://ikonixperfumer.com/beta/assets/uploads/${img}`} alt="" className="w-full h-full object-contain"/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{product.name}</h1>

          {/* features */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {['Premium fragrances','Long-lasting freshness','A perfume for every mood','Perfect for everyday use'].map(f => (
              <div key={f} className="flex gap-2">
                <CheckIcon className="h-4 w-4 text-[#b49d91]" /> {f}
              </div>
            ))}
          </div>

          {/* variant buttons */}
          <div className="mt-4 flex gap-2">
            {variantOptions.map(v => (
              <button
                key={v.vid}
                onClick={() => {
                  setSelectedVar(v);
                  setQty(1);          // reset qty on variant change
                }}
                className={`px-4 py-2 rounded-full text-sm ${
                  v.vid === selectedVar.vid
                    ? 'bg-[#b49d91] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {v.weight} ml
              </button>
            ))}
          </div>

          {/* total price */}
          <div className="mt-4 text-2xl font-semibold">
            {selectedVar.sale_price < selectedVar.price && (
              <span className="line-through text-gray-500 mr-2">
                ₹{(selectedVar.price * qty).toFixed(0)}/-
              </span>
            )}
            ₹{totalPrice.toFixed(0)}/-
          </div>

          {/* qty + actions */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border rounded-full">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="p-2 disabled:opacity-30"
                disabled={qty === 1}
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <span className="px-4">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="p-2">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <button onClick={handleAddToCart} className="px-6 py-3 bg-[#b49d91] text-white rounded-md">
              Add to Cart
            </button>
            <button onClick={handleBuyNow} className="px-6 py-3 bg-[#2A3443] text-white rounded-md">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
