// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import qs from "qs";
import Swal from "sweetalert2";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import checkedCircle from "../../../assets/checkcircle.svg";

import ValidateOnLoad from "../../../components/ValidateOnLoad";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { createApiClient } from "../../../api/client";

const API_BASE = "https://ikonixperfumer.com/beta/api";

/* ---------------- guest helpers (same shape) ---------------- */
const safeJsonParse = (val, fallback) => {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? "")}`;

const readGuest = () => {
  const raw = safeJsonParse(localStorage.getItem("guestCart") || "[]", []);
  const arr = Array.isArray(raw) ? raw : [];
  const byKey = new Map();

  for (const x of arr) {
    const id = x.productid ?? x.id;
    const variantid = x.variantid ?? x.vid ?? "";
    const qty = Math.max(1, Number(x.qty) || 1);

    const item = {
      id: Number(id),
      variantid: String(variantid),
      name: x.name,
      image: x.image,
      price: Number(x.price) || 0,
      qty,
    };

    const key = toKey(item.id, item.variantid);
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...item, qty: prev.qty + item.qty } : item);
  }

  return Array.from(byKey.values());
};

const writeGuest = (arr) => {
  const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
    id: Number(i.id),
    variantid: String(i.variantid ?? ""),
    name: i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty: Math.max(1, Number(i.qty) || 1),
  }));
  localStorage.setItem("guestCart", JSON.stringify(safe));
};
/* ------------------------------------------------------------ */

export default function ProductDetails() {
  const navigate = useNavigate();
  const { pid } = useParams();
  const [sp, setSp] = useSearchParams();
  const vid = sp.get("vid");

  const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();
  const { items, refresh, addOrIncLocal } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedVar, setSelectedVar] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [qty, setQty] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // ✅ shared client that auto-refreshes token if needed
  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => token,
        setToken,
        setIsTokenReady,
      }),
    [token, setToken, setIsTokenReady]
  );

  const checkInCart = useCallback(() => {
    if (!selectedVar?.vid) return false;
    return items.some(
      (it) => 
        Number(it.id) === Number(pid) && 
        String(it.variantid) === String(selectedVar.vid)
    );
  }, [items, pid, selectedVar]);

  // ✅ Fetch product ONLY when token is ready (fresh browser fix)
  useEffect(() => {
    if (!pid) return;

    // wait until ValidateOnLoad finishes (or fails gracefully)
    if (!isTokenReady) return;

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      setError("");

      try {
        const url = `${API_BASE}/products/${pid}${vid ? `?vid=${vid}` : ""}`;
        const { data } = await api.get(url, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (!cancelled) setProduct(data?.data || data);
      } catch (e) {
        console.error("Product fetch error:", e?.response?.data || e);
        if (!cancelled) setError("Unable to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [api, pid, vid, isTokenReady]);

  const parseImageList = useCallback((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap((item) => parseImageList(item)).filter(Boolean);
    if (typeof value !== "string") return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseImageList(parsed);
      } catch (e) {
        console.error("Failed to parse image list JSON:", e);
      }
    }

    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }, []);

  const productImages = useMemo(() => {
    if (!product) return [];
    const pics = [];
    const addUnique = (img) => {
      if (!img || typeof img !== "string") return;
      const clean = img.trim();
      if (clean && !pics.includes(clean)) pics.push(clean);
    };

    parseImageList(product.image).forEach(addUnique);
    parseImageList(product.more_images).forEach(addUnique);
    return pics;
  }, [product, parseImageList]);

  const variantImages = useMemo(() => {
    if (!product?.variants?.length) return [];
    const pics = [];
    const seen = new Set();

    for (const variant of product.variants) {
      const images = [
        ...parseImageList(variant.image),
        ...parseImageList(variant.more_images),
      ];
      for (const img of images) {
        const clean = typeof img === "string" ? img.trim() : "";
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        pics.push(clean);
      }
    }

    return pics;
  }, [product, parseImageList]);

  const variantPrimaryImage = useMemo(() => {
    return parseImageList(selectedVar?.image)[0] || "";
  }, [selectedVar, parseImageList]);

  const galleryImages = useMemo(() => {
    const seen = new Set();
    const list = [];
    const push = (img) => {
      if (!img || typeof img !== "string") return;
      const clean = img.trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      list.push(clean);
    };

    variantImages.forEach(push);
    productImages.forEach(push);
    return list;
  }, [variantImages, productImages]);

  useEffect(() => {
    if (!galleryImages.length) return;
    const nextImage = selectedImage && galleryImages.includes(selectedImage)
      ? selectedImage
      : variantPrimaryImage || galleryImages[0];

    if (nextImage && nextImage !== selectedImage) {
      setSelectedImage(nextImage);
    }
  }, [galleryImages, selectedImage, variantPrimaryImage]);

  useEffect(() => {
    const idx = galleryImages.indexOf(selectedImage);
    if (idx >= 0 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [selectedImage, galleryImages, activeIndex]);

  const activeImg = selectedImage || galleryImages[activeIndex] || "";

  const [fadeState, setFadeState] = useState("opacity-100 scale-100");
  const thumbContainerRef = useRef(null);

  // Handle active index transitions smoothly
  useEffect(() => {
    setFadeState("opacity-0 scale-95");
    const t = setTimeout(() => {
      setFadeState("opacity-100 scale-100");
    }, 250);
    return () => clearTimeout(t);
  }, [activeIndex]);

  // Center the active thumbnail when it changes
  useEffect(() => {
    if (thumbContainerRef.current) {
      const container = thumbContainerRef.current;
      const activeElement = container.children[activeIndex];
      if (activeElement) {
        const containerWidth = container.clientWidth;
        const elementOffset = activeElement.offsetLeft;
        const elementWidth = activeElement.clientWidth;
        
        container.scrollTo({
          left: elementOffset - (containerWidth / 2) + (elementWidth / 2),
          behavior: "smooth",
        });
      }
    }
  }, [activeIndex]);

  const handleThumbnailClick = useCallback((index) => {
    setActiveIndex(index);
    setSelectedImage(galleryImages[index] || "");
  }, [galleryImages]);

  const handlePrevImage = useCallback(() => {
    if (galleryImages.length <= 1) return;
    const nextIndex = activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);
    setSelectedImage(galleryImages[nextIndex] || "");
  }, [galleryImages, activeIndex]);

  const handleNextImage = useCallback(() => {
    if (galleryImages.length <= 1) return;
    const nextIndex = activeIndex === galleryImages.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);
    setSelectedImage(galleryImages[nextIndex] || "");
  }, [galleryImages, activeIndex]);

  const scrollThumbnails = useCallback((direction) => {
    if (thumbContainerRef.current) {
      const scrollAmount = 200;
      thumbContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const handleImgError = useCallback((e) => {
    e.target.onerror = null;
    e.target.src = "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&q=80&w=600";
  }, []);

  const handleMainImageClick = useCallback(() => {
    if (activeImg) setIsLightboxOpen(true);
  }, [activeImg]);

  const variantOptions = useMemo(
    () =>
      (product?.variants || []).map((v) => ({
        vid: v.vid,
        weight: v.weight,
        price: Number(v.price),
        sale_price: Number(v.sale_price),
        image: v.image || null,
        more_images: v.more_images || null,
      })),
    [product]
  );

  // select variant from URL
  useEffect(() => {
    if (!variantOptions.length) return;
    const fromUrl = vid && variantOptions.find((v) => String(v.vid) === String(vid));
    const next = fromUrl || variantOptions[0];
    setSelectedVar(next);
    setSelectedVariantId(String(next.vid));
    setSelectedImage(parseImageList(next.image)[0] || parseImageList(next.more_images)[0] || productImages[0] || "");

    if (!fromUrl) {
      setSp(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("vid", next.vid);
          return p;
        },
        { replace: true }
      );
    }
  }, [variantOptions, vid, setSp, parseImageList, productImages]);

  const unitPrice = useMemo(() => {
    if (!selectedVar) return 0;
    const sale = Number(selectedVar.sale_price);
    const mrp = Number(selectedVar.price);
    return sale > 0 && sale < mrp ? sale : mrp;
  }, [selectedVar]);

  const totalPrice = (unitPrice || 0) * qty;

  const mrpPrice = useMemo(() => Number(selectedVar?.price) || 0, [selectedVar]);
  const discountPct = useMemo(() => {
    if (mrpPrice > unitPrice && unitPrice > 0) return Math.round(((mrpPrice - unitPrice) / mrpPrice) * 100);
    return 0;
  }, [mrpPrice, unitPrice]);
  const savingsPerUnit = mrpPrice > unitPrice ? mrpPrice - unitPrice : 0;

  const addGuest = useCallback(() => {
    if (!product || !selectedVar?.vid) return;

    const current = readGuest();
    const variantid = selectedVar.vid;
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    const key = toKey(pid, variantid);
    const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

    if (idx > -1) {
      // User requested: no need to increase if already in cart
    } else {
      current.push({
        id: Number(pid),
        variantid,
        name: product.name,
        image: product.image,
        price,
        qty,
      });
    }

    writeGuest(current);
    refresh();
    Swal.fire(`${product.name} added to cart`);
  }, [pid, product, selectedVar, qty, refresh]);

  const addServer = useCallback(async () => {
    return api.post(
      `${API_BASE}/cart`,
      qs.stringify({
        userid: user.id,
        productid: pid,
        variantid: selectedVar.vid,
        qty,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  }, [api, user, pid, selectedVar, qty]);

  const handleAddToCart = useCallback(async () => {
    if (!product || !selectedVar?.vid) return;

    // ✅ CHECK: no need to increase if already in cart
    if (checkInCart()) {
      Swal.fire({
         title: "Already in cart",
         text: `${product.name} is already in your cart.`,
         icon: "info",
         timer: 2000
      });
      return;
    }

    const variantid = selectedVar.vid;
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    if (!token || !user) {
      addOrIncLocal(
        {
          id: Number(pid),
          variantid,
          name: product.name,
          image: product.image,
          price,
          qty,
        },
        qty
      );
      addGuest();
      return;
    }

    // optimistic badge update
    addOrIncLocal(
      {
        id: Number(pid),
        variantid,
        name: product.name,
        image: product.image,
        price,
        qty: 1,
      },
      qty
    );

    try {
      const resp = await addServer();
      if (resp?.data?.success || resp?.data?.status) {
        refresh();
        Swal.fire(`${product.name} added to cart`);
      } else {
        refresh();
        Swal.fire(resp?.data?.message || "Failed to add to cart");
      }
    } catch (e) {
      console.error("add to cart error:", e?.response?.data || e);
      refresh();
      Swal.fire("Error adding to cart");
    }
  }, [product, selectedVar, pid, qty, token, user, addGuest, addOrIncLocal, addServer, refresh, checkInCart]);





  const handleBuyNow = useCallback(async () => {
    if (!product || !selectedVar?.vid) return;

    // ✅ CHECK: if already in cart, just go to checkout
    if (checkInCart()) {
      navigate("/checkout");
      return;
    }

    const variantid = selectedVar.vid;
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    const isOk = (d) =>
      d?.success === true ||
      d?.success === "true" ||
      d?.success === 1 ||
      d?.success === "1" ||
      d?.status === true ||
      d?.status === "true" ||
      d?.status === 1 ||
      d?.status === "1";

    try {
      // ---------- GUEST ----------
      if (!token || !user) {
        const current = readGuest();
        const key = toKey(pid, variantid);
        const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

        if (idx > -1) {
           // Skip addition
        } else {
          current.push({
            id: Number(pid),
            variantid,
            name: product.name,
            image: product.image,
            price,
            qty,
          });
          addOrIncLocal(
            { id: Number(pid), variantid, name: product.name, image: product.image, price, qty },
            qty
          );
        }

        writeGuest(current);
        await refresh();
        navigate("/checkout");
        return;
      }

      // ---------- LOGGED IN ----------
      addOrIncLocal(
        {
          id: Number(pid),
          variantid,
          name: product.name,
          image: product.image,
          price,
          qty: 1,
        },
        qty
      );

      const resp = await addServer();
      const data = resp?.data;
      await refresh();

      if (isOk(data)) {
        navigate("/checkout");
        return;
      }
      Swal.fire(data?.message || "Failed to add to cart");
    } catch (e) {
      console.error("BUY NOW error:", e?.response?.data || e);
      try { await refresh(); } catch {}
      Swal.fire(e?.response?.data?.message || e?.message || "Error adding product");
    }
  }, [
    product,
    selectedVar,
    pid,
    qty,
    token,
    user,
    refresh,
    navigate,
    addOrIncLocal,
    addServer,
    checkInCart
  ]);










  // ✅ show loader while token validation + fetch
  if (!isTokenReady || loading) return <p className="p-6 text-center">Loading…</p>;

  if (error || !product) {
    return (
      <div className="p-6">
        {error || "Product not found."}{" "}
        <Link to="/shop" className="underline text-blue-600">
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ✅ ensure token always exists in fresh browser */}
      <ValidateOnLoad />

      <div className="mx-auto w-[92%] md:w-[75%] py-6">
        <nav className="text-sm text-[#6C5950]/70 mb-6">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:underline">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Gallery */}
          <div className="flex flex-col gap-4 w-full md:max-w-[500px]">
            <style>{`
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            
            {/* Main Image Container */}
            <div className="relative group w-full aspect-square md:h-[500px] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 shadow-md transition-shadow duration-300 hover:shadow-lg">
              {activeImg ? (
                <button
                  type="button"
                  onClick={handleMainImageClick}
                  className="w-full h-full overflow-hidden flex items-center justify-center cursor-zoom-in focus:outline-none"
                  aria-label="Open image in full screen"
                >
                  <img
                    loading="eager"
                    decoding="async"
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${activeImg}`}
                    alt={product.name}
                    onError={handleImgError}
                    className={`w-full h-full object-cover transition-all duration-300 ease-in-out transform ${fadeState} md:group-hover:scale-105`}
                  />
                </button>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-gray-400">
                  <svg
                    className="w-16 h-16 mb-3 stroke-current text-gray-300 animate-pulse"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium tracking-wide text-gray-500 font-[Lato]">No Image Available</span>
                </div>
              )}

              {/* Main Image Nav Arrows (Only visible on hover if > 1 image) */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 shadow-md rounded-full p-3 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 flex items-center justify-center focus:outline-none"
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 shadow-md rounded-full p-3 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 flex items-center justify-center focus:outline-none"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  
                  {/* Indicator Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {galleryImages.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          idx === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails Section */}
            {galleryImages.length > 1 && (
              <div className="relative group/thumbs w-full mt-2">
                {/* Left Arrow for Thumbnails */}
                <button
                  onClick={() => scrollThumbnails("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white text-gray-800 hover:text-black shadow-md border border-gray-100 rounded-full p-2 transition-all duration-200 md:opacity-0 group-hover/thumbs:opacity-100 hover:scale-110 active:scale-95 flex items-center justify-center focus:outline-none"
                  aria-label="Scroll thumbnails left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* Thumbnails list */}
                <div
                  ref={thumbContainerRef}
                  className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory scroll-smooth"
                >
                  {galleryImages.map((img, idx) => (
                    <button
                      key={img}
                      onClick={() => handleThumbnailClick(idx)}
                      className={`w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 snap-start focus:outline-none ${
                        idx === activeIndex
                          ? "border-[#b49d91] ring-2 ring-[#b49d91]/20 scale-95 shadow-sm"
                          : "border-gray-200 hover:border-[#b49d91]/50 hover:scale-102"
                      }`}
                      >
                        <img
                          loading="lazy"
                          src={`https://ikonixperfumer.com/beta/assets/uploads/${img}`}
                          alt=""
                          onError={handleImgError}
                          className="w-full h-full object-cover"
                        />
                    </button>
                  ))}
                </div>

                {/* Right Arrow for Thumbnails */}
                <button
                  onClick={() => scrollThumbnails("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white text-gray-800 hover:text-black shadow-md border border-gray-100 rounded-full p-2 transition-all duration-200 md:opacity-0 group-hover/thumbs:opacity-100 hover:scale-110 active:scale-95 flex items-center justify-center focus:outline-none"
                  aria-label="Scroll thumbnails right"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <h1 className="text-[#8C7367] font-[Lato] text-[32px] md:text-[36px] font-[700] tracking-[0.5px]">
              {product.name}
            </h1>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {["Premium fragrances", "Long-lasting freshness", "A perfume for every mood", "Perfect for everyday use"].map(
                (f) => (
                  <div key={f} className="flex items-center gap-2">
                    <img src={checkedCircle} alt="" className="h-5 w-5" />
                    <span className="text-[#6C5950] font-[Lato] text-[16px]">{f}</span>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-[#6C5950]">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarSolid key={i} className="h-5 w-5 text-[#8C7367]" />
              ))}
              {/* <span className="ml-2 text-[14px]">(90)</span>
              <span className="text-[14px] ml-1">Reviews and Ratings</span> */}
            </div>

            <hr className="border-[#B39384]/60 mt-6" />

            <div className="mt-6 grid gap-4">
              <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
                Flat 20%off — No discount code required.
              </span>
              <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
                Free Perfume 100ml on shopping above Rs 1099/-
              </span>
            </div>

            <hr className="border-[#B39384]/60 my-6" />

            {/* Pricing block */}
            <div className="bg-[#FDF8F5] border border-[#E8D9D0] rounded-xl p-4 mb-5">
              <p className="text-xs text-[#8C7367] font-[Lato] uppercase tracking-widest mb-1">
                {discountPct >= 40 ? "🔥 Best Deal" : discountPct > 0 ? "Special Offer" : "Price"}
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[32px] md:text-[36px] font-bold text-[#2A3443] leading-none">
                  ₹{totalPrice.toFixed(0)}
                </span>
                {discountPct > 0 && (
                  <span className="text-[18px] line-through text-gray-400 font-[Lato]">
                    ₹{(mrpPrice * qty).toFixed(0)}
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-md">
                    {discountPct}% OFF
                  </span>
                )}
              </div>
              {savingsPerUnit > 0 && (
                <p className="text-sm text-green-600 font-semibold mt-1">
                  You Save ₹{(savingsPerUnit * qty).toFixed(0)}
                  {discountPct > 0 && (
                    <span className="text-xs text-gray-500 font-normal ml-2">
                      (MRP ₹{mrpPrice} per unit)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Qty + Variant selectors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-5">
              <div className="w-full">
                <p className="text-xs text-[#8C7367] font-[Lato] mb-2 uppercase tracking-wide">Quantity</p>
                <div className="flex items-center justify-between w-full border border-[#B39384]/60 rounded-full h-12">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty === 1}
                    className="px-4 py-2 disabled:opacity-40"
                  >
                    <MinusIcon className="h-5 w-5 text-[#6C5950]" />
                  </button>
                  <span className="min-w-[2rem] text-center text-[#2A3443]">{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)} className="px-4 py-2">
                    <PlusIcon className="h-5 w-5 text-[#6C5950]" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#8C7367] font-[Lato] mb-2 uppercase tracking-wide">Size</p>
                <div className="flex gap-3">
                  {variantOptions.map((v) => {
                    const vSale = Number(v.sale_price);
                    const vMrp = Number(v.price);
                    const vPct = vMrp > vSale && vSale > 0 ? Math.round(((vMrp - vSale) / vMrp) * 100) : 0;
                    return (
                      <button
                        key={v.vid}
                        onClick={() => {
                          setSelectedVar(v);
                          setSelectedVariantId(String(v.vid));
                          setSelectedImage(parseImageList(v.image)[0] || parseImageList(v.more_images)[0] || productImages[0] || "");
                          setQty(1);
                          setSp(
                            (prev) => {
                              const p = new URLSearchParams(prev);
                              p.set("vid", v.vid);
                              return p;
                            },
                            { replace: true }
                          );
                        }}
                        className={[
                          "relative h-14 px-3 w-full rounded-[12px] text-[14px] transition border flex flex-col items-center justify-center",
                          selectedVariantId === String(v.vid)
                            ? "bg-[#b49d91] text-white border-[#b49d91]"
                            : "bg-white text-[#6C5950] border-[#B39384]/60",
                        ].join(" ")}
                      >
                        <span>{v.weight} ml</span>
                        {vPct > 0 && (
                          <span className={`text-[10px] font-bold ${selectedVariantId === String(v.vid) ? "text-white/80" : "text-green-600"}`}>
                            {vPct}% off
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <button
                disabled={!selectedVar?.vid}
                onClick={handleAddToCart}
                className="w-full h-12 rounded-md bg-[#b49d91] text-white font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
              {/* <button
                disabled={!selectedVar?.vid}
                onClick={() => navigate("/checkout")}
                className="w-full h-12 rounded-md bg-[#2A3443] text-white font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </button> */}

              <button
  disabled={!selectedVar?.vid}
  onClick={handleBuyNow}
  className="w-full h-12 rounded-md bg-[#2A3443] text-white font-medium hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Buy Now
</button>

            </div>

            <hr className="border-[#B39384]/60 mt-7" />

            {/* About This Product */}
            <div className="mt-7">
              <h2 className="font-[Lato] text-[18px] font-bold text-[#2A3443] mb-3">About This Product</h2>
              <ul className="space-y-2">
                {[
                  "Premium long-lasting fragrance — crafted with high-quality ingredients",
                  "Suitable for everyday wear and special occasions",
                  "Perfect for gifting — elegantly packaged",
                  "Cruelty-free and ethically sourced ingredients",
                  "Available in multiple sizes to suit your lifestyle",
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[#6C5950] font-[Lato] text-[15px]">
                    <span className="text-[#b49d91] font-bold mt-0.5">•</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Description (if API provides one) */}
            {product.description && (
              <div className="mt-7">
                <h2 className="font-[Lato] text-[18px] font-bold text-[#2A3443] mb-3">Description</h2>
                <p className="text-[#6C5950] font-[Lato] text-[15px] leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Specifications */}
            <div className="mt-7">
              <h2 className="font-[Lato] text-[18px] font-bold text-[#2A3443] mb-3">Specifications</h2>
              <div className="rounded-xl border border-[#E8D9D0] overflow-hidden">
                {[
                  ["Brand", "Ikonix Perfumer"],
                  ["Category", product.category_name],
                  ...(selectedVar ? [["Size / Volume", `${selectedVar.weight} ml`]] : []),
                  ["Fragrance Type", "Eau de Parfum (EDP)"],
                  ["Country of Origin", "India"],
                  ["Shelf Life", "36 months from manufacturing date"],
                ].map(([label, value], i) => (
                  <div
                    key={label}
                    className={`flex items-start gap-4 px-4 py-3 text-[14px] font-[Lato] ${
                      i % 2 === 0 ? "bg-[#FDF8F5]" : "bg-white"
                    }`}
                  >
                    <span className="text-[#8C7367] font-semibold w-36 flex-shrink-0">{label}</span>
                    <span className="text-[#2A3443]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings highlight */}
            {savingsPerUnit > 0 && (
              <div className="mt-7 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-bold text-green-700 mb-2 text-[15px]">🎉 Special Offer</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">MRP:</span>
                  <span className="text-gray-400 line-through">₹{mrpPrice}</span>
                  <span className="text-gray-500">Sale Price:</span>
                  <span className="font-bold text-[#2A3443]">₹{unitPrice}</span>
                  <span className="text-gray-500">You Save:</span>
                  <span className="font-bold text-green-600">₹{savingsPerUnit} ({discountPct}% OFF)</span>
                </div>
              </div>
            )}

            <hr className="border-[#B39384]/60 mt-7" />
          </div>
        </div>
      </div>

      {isLightboxOpen && activeImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/90 text-4xl leading-none"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close image"
          >
            &times;
          </button>
          <img
            src={`https://ikonixperfumer.com/beta/assets/uploads/${activeImg}`}
            alt={product.name}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
