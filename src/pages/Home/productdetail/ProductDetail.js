// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect,useParams } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import qs from 'qs';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import checkedCircle from '../../../assets/checkcircle.svg';

import DiscoverMore from './DiscoverMore';
import OwnPerfume from '../../../components/ownperfume/OwnPerfume';
import SpecialDealsSlider from '../../../components/SpecialDealsSlider/SpecialDealsSlider';



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







  // fetch by variant ID (when navigated from elsewhere)
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
        const url = `${API_BASE}/products/${pid}?vid=${vid}`;
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

  // price calc
  const unitPrice  = selectedVar?.sale_price < selectedVar?.price ? selectedVar?.sale_price : selectedVar?.sale_price;
  const totalPrice = (unitPrice || 0) * qty;

  // cart helpers
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
    Swal(`${product.name} added to cart (guest)`);
  };

  const addServer = () => axios.post(
    `${API_BASE}/cart`,
    qs.stringify({ userid: user.id, productid: pid, variantid: selectedVar.vid, qty }),
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const handleAddToCart = async () => {
    if (!token || !user) return addGuest();
    try {
      await addServer();
      await refresh();
      Swal(`${product.name} added to cart`);
    } catch {
      Swal('Error adding to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!token || !user) {
      addGuest();
      return navigate('/checkout');
    }
    try {
      await addServer();
      await refresh();
      navigate('/checkout');
    } catch {
      Swal('Error proceeding to checkout');
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

  /** Palette (from reference)
   *  text main: #8C7367
   *  sub text:  #6C5950
   *  pill bg:   #EDE2DD
   *  pill brd:  #B39384
   *  accent:    #b49d91
   *  CTA dark:  #2A3443
   */

  return (
    <div className="mx-auto w-[92%] md:w-[75%] py-6">
      {/* breadcrumb (kept minimal) */}
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
{/*           
           <hr className="border-[#B39384]/60 mt-6 mb-2" />

          <span className='text-[#53443D] font-[Lato] text-[27px] font-[700] tracking-[0.5%] leading-[150%]'>Reviews</span> */}
        </div>

        {/* DETAILS */}
        <div className="flex flex-col">
          {/* Title */}
          <h1 className="text-[#8C7367] font-[Lato] text-[32px] md:text-[36px] font-[700] tracking-[0.5px]">
            {product.name}
          </h1>

          {/* Feature ticks – two columns */}
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

          {/* Price + Qty + Variant pills (3 columns on large) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 items-center justify-between gap-5">
            {/* Price (left), shows strike when sale */}
            <div className="flex items-baseline gap-3">
              {/* {selectedVar?.sale_price < selectedVar?.price && (
                <span className="line-through text-[#6C5950]/60 text-xl">
                  ₹{(selectedVar.price * qty).toFixed(0)}/-
                </span>
              )} */}
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
                    onClick={() => { setSelectedVar(v); setQty(1); }}
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
              onClick={handleAddToCart}
              className="w-full h-12 rounded-md bg-[#b49d91] text-white font-medium hover:opacity-95"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="w-full h-12 rounded-md bg-[#2A3443] text-white font-medium hover:opacity-95"
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
<OwnPerfume/>


              {/* end Discover more section */}
    </div>
  );
}
