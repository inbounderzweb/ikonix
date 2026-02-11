// src/pages/product-details/ProductDetails.js
import React, { useMemo, useState, useEffect, useCallback } from "react";
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
  const { refresh, addOrIncLocal } = useCart();

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

  const [product, setProduct] = useState(null);
  const [selectedVar, setSelectedVar] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Images
  const images = useMemo(() => {
    if (!product) return [];
    const pics = [];
    if (product.image) pics.push(product.image);

    if (product.more_images) {
      const extras = Array.isArray(product.more_images)
        ? product.more_images
        : String(product.more_images)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      extras.forEach((img) => {
        if (!pics.includes(img)) pics.push(img);
      });
    }

    return pics;
  }, [product]);

  useEffect(() => {
    if (images.length) setActiveImg(images[0]);
  }, [images]);

  const variantOptions = useMemo(
    () =>
      (product?.variants || []).map((v) => ({
        vid: v.vid,
        weight: v.weight,
        price: Number(v.price),
        sale_price: Number(v.sale_price),
      })),
    [product]
  );

  // select variant from URL
  useEffect(() => {
    if (!variantOptions.length) return;
    const fromUrl = vid && variantOptions.find((v) => String(v.vid) === String(vid));
    const next = fromUrl || variantOptions[0];
    setSelectedVar(next);

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
  }, [variantOptions, vid, setSp]);

  const unitPrice = useMemo(() => {
    if (!selectedVar) return 0;
    const sale = Number(selectedVar.sale_price);
    const mrp = Number(selectedVar.price);
    return sale > 0 && sale < mrp ? sale : mrp;
  }, [selectedVar]);

  const totalPrice = (unitPrice || 0) * qty;

  const addGuest = useCallback(() => {
    if (!product || !selectedVar?.vid) return;

    const current = readGuest();
    const variantid = selectedVar.vid;
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    const key = toKey(pid, variantid);
    const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

    if (idx > -1) current[idx].qty = (Number(current[idx].qty) || 0) + qty;
    else
      current.push({
        id: Number(pid),
        variantid,
        name: product.name,
        image: product.image,
        price,
        qty,
      });

    writeGuest(current);
    refresh();
    Swal.fire(`${product.name} added to cart (guest)`);
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

    const variantid = selectedVar.vid;
    const price = Number(selectedVar.sale_price || selectedVar.price || 0) || 0;

    if (!token || !user) {
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
      if (resp?.data?.success) {
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
  }, [product, selectedVar, pid, qty, token, user, addGuest, addOrIncLocal, addServer, refresh]);





const handleBuyNow = useCallback(async () => {
  if (!product || !selectedVar?.vid) return;

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

      if (idx > -1) current[idx].qty = (Number(current[idx].qty) || 0) + qty;
      else {
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
      await refresh();
      navigate("/checkout");
      return;
    }

    // ---------- LOGGED IN ----------
    // optimistic local
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

    // Always refresh so checkout sees latest
    await refresh();

    // ✅ Navigate when API indicates success (status OR success)
    if (isOk(data)) {
      navigate("/checkout");
      return;
    }

    // If API replied but doesn't look OK
    Swal.fire(data?.message || "Failed to add to cart");
  } catch (e) {
    console.error("BUY NOW error:", e?.response?.data || e);

    // try to keep UI consistent
    try {
      await refresh();
    } catch {}

    Swal.fire(e?.response?.data?.message || e?.message || "Error adding product before checkout");
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
                {images.map((img) => (
                  <button
                    key={img}
                    onClick={() => setActiveImg(img)}
                    className={`h-20 rounded-xl overflow-hidden border transition ${
                      img === activeImg
                        ? "border-[#b49d91]"
                        : "border-gray-200 hover:border-[#b49d91]/60"
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
              <span className="ml-2 text-[14px]">(90)</span>
              <span className="text-[14px] ml-1">Reviews and Ratings</span>
            </div>

            <hr className="border-[#B39384]/60 mt-6" />

            <div className="mt-6 grid gap-4">
              <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
                Flat 20%off — No discount code required.
              </span>
              <span className="inline-block bg-[#EDE2DD] border border-[#B39384] py-[8px] px-[20px] rounded-[24px] font-[Lato] text-[16px] text-[#8C7367] tracking-[0.5px]">
                Free Perfume 100ml on shopping above Rs 1800/-
              </span>
            </div>

            <hr className="border-[#B39384]/60 my-6" />

            <div className="grid grid-cols-1 lg:grid-cols-3 items-center justify-between gap-5">
              <div className="text-[28px] md:text-[30px] font-semibold text-[#2A3443]">
                ₹{totalPrice.toFixed(0)}/-
              </div>

              <div className="w-full">
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

              <div className="flex gap-3">
                {variantOptions.map((v) => {
                  const selected = v.vid === selectedVar?.vid;
                  return (
                    <button
                      key={v.vid}
                      onClick={() => {
                        setSelectedVar(v);
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
                        "h-12 px-2 w-full rounded-[12px] text-[15px] transition border",
                        selected
                          ? "bg-[#b49d91] text-white border-[#b49d91]"
                          : "bg-white text-[#6C5950] border-[#B39384]/60",
                      ].join(" ")}
                    >
                      {v.weight} ml
                    </button>
                  );
                })}
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
          </div>
        </div>
      </div>
    </>
  );
}
