import React, { useState, useEffect } from 'react';
import { useGetProductsQuery } from '../../../features/product/productApi';
import bag from '../../../assets/bag.svg'; // adjust if needed
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import qs from 'qs';
import { useNavigate } from 'react-router-dom';
import swal from 'sweetalert';

function DiscoverMore() {


    const navigate = useNavigate()
  const [moreProducts, setMoreProducts] = useState([]);
   const { user, token,isTokenReady } = useAuth();
  const { data, isLoading, isError,refetch } = useGetProductsQuery(undefined, { skip: !isTokenReady });
 

  const API_BASE = 'https://ikonixperfumer.com/beta/api';


useEffect(() => {
  if (isTokenReady) refetch();
}, [isTokenReady, refetch]);




const handleViewDetails = (item) => {
  const variant = item.variants?.[0] || {};
  navigate(`/product-details/${item.id}?vid=${variant.vid}`);
};



  
  /** Write to localStorage */
  const writeGuest = (items) => {
    localStorage.setItem('guestCart', JSON.stringify(items));
  };

  /** Read guest cart safely */
  const readGuest = () => {
    const raw = JSON.parse(localStorage.getItem('guestCart') || '[]');
    return (Array.isArray(raw) ? raw : []).map((x) => ({
      id: x.productid ?? x.id,
      vid: x.variantid ?? x.vid,
      name: x.name,
      image: x.image,
      price: Number(x.price) || 0,
      qty: Number(x.qty) || 1,
    }));
  };

  /** Save guest cart */
  const saveGuestCart = (product) => {
    const current = readGuest();
    const variant = product.variants?.[0] || {};
    const vid = variant.vid;
    const price = Number(variant.sale_price || variant.price || 0) || 0;

    const idx = current.findIndex((i) => i.id === product.id && i.vid === vid);
    if (idx > -1) {
      current[idx].qty = (Number(current[idx].qty) || 0) + 1;
    } else {
      current.push({
        id: product.id,
        vid,
        name: product.name,
        image: product.image,
        price,
        qty: 1,
      });
    }

    writeGuest(current);
    swal(`${product.name} added to cart (guest)`);
  };

  /** Sync guest cart with server */
  const syncGuestCartWithServer = async (userId, token) => {
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

      const serverItems = resp.data?.data || [];
      writeGuest(
        serverItems.map((i) => ({
          id: i.id,
          vid: i.variantid ?? i.vid,
          name: i.name,
          image: i.image,
          price: Number(i.price) || 0,
          qty: Number(i.qty) || 1,
        }))
      );
    } catch (err) {
      console.error('Error syncing guest cart:', err);
    }
  };

  /** Add to cart (server or guest) */
  const handleAddToCart = async (product) => {
    const variant = product.variants?.[0] || {};
    if (!token || !user) {
      saveGuestCart(product);
      return;
    }

    try {
      const { data: resp } = await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({
          userid: user.id,
          productid: product.id,
          variantid: variant.vid,
          qty: 1,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (resp?.success) {
        swal(`${product.name} added to cart`);
        await syncGuestCartWithServer(user.id, token);
      } else {
        swal(resp?.message || 'Failed to add to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err?.response?.data || err);
      swal('Error adding to cart. See console.');
    }
  };

  /** Fetch product list */
  useEffect(() => {
    if (data?.data) {
      setMoreProducts(data.data);
    }
  }, [data]);

  if (isLoading) return <p className="text-center py-20">Loading…</p>;
  if (isError) return <p className="text-center py-20">Something went wrong.</p>;

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold mb-6 text-center font-[luxia] text-[#8C7367] text-[27px] tracking-[0.5px]">Discover More</h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {moreProducts.map((item) => (
          <div
          onClick={() => handleViewDetails(item)}
            key={`${item.id}-${item.vid}`}
            className="relative overflow-hidden rounded-[10px] shadow hover:shadow-lg transition"
  //            onClick={() => {
  //   const firstVid = item.variants?.[0]?.vid; // may be undefined in list payload
  //   navigate(`/product/${item.id}`, {
  //     state: { product: item, vid: firstVid ?? null },
  //   });
  // }}
          >
            {/* Category badge */}
            <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] bg-white px-3 py-1 text-xs text-[#8C7367]">
              {item.category_name}
            </span>

            {/* Cart icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
              className="absolute top-2 right-2 rounded-full p-1 bg-white shadow"
            >
              <img src={bag} alt="cart" className="h-6 w-6" />
            </button>

            {/* Image */}
            <img
              src={`https://ikonixperfumer.com/beta/assets/uploads/${item.image}`}
              alt={item.name}
              className="w-full h-72 object-cover cursor-pointer"
            />

            {/* Info */}
            <div className="p-4">
              <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug mb-1">
                {item.name}
              </h3>
              <p className="text-[#2A3443] font-[Lato] text-[14px] opacity-80">
                {item.category_name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DiscoverMore;
