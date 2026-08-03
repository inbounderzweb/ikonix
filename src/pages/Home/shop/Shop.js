// src/pages/shop/Shop.js
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import qs from "qs";
import bag from "../../../assets/bag.svg";
import Spinner from "../../../components/loader/Spinner";
import shopherobg from "../../../assets/about/aboutBannerDesk.svg";
import shopherobgmob from "../../../assets/about/aboutBannerMob.svg";
import ValidateOnLoad from "../../../components/ValidateOnLoad";
import { useGetProductsQuery } from "../../../features/product/productApi";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { createApiClient } from "../../../api/client";

const API_BASE = "http://ikonixperfumer.com/beta/api";
const PRODUCTS_PER_PAGE = 10;

/* ---------------- Guest helpers ---------------- */
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
/* ------------------------------------------------ */

const FILTER_STORAGE_KEY = "shopActiveFilter"; // sessionStorage key

export default function Shop() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();
  const { items, refresh, addOrIncLocal } = useCart();

  const checkInCart = useCallback((pid, vid) => {
    return items.some(
      (it) => 
        Number(it.id) === Number(pid) && 
        String(it.variantid) === String(vid)
    );
  }, [items]);

  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => token,
        setToken,
        setIsTokenReady,
      }),
    [token, setToken, setIsTokenReady]
  );

  // RTK products (token-ready)
  const { data, isLoading, isError, refetch } = useGetProductsQuery(undefined, {
    skip: !isTokenReady,
  });

  useEffect(() => {
    if (isTokenReady) refetch();
  }, [isTokenReady, refetch]);

  const products = useMemo(() => data?.data || [], [data?.data]);

  // Build category filters
  const categoryList = useMemo(
    () => [...new Set(products.map((p) => p.category_name).filter(Boolean))],
    [products]
  );

  const filters = useMemo(
    () => ["All", "Our Bestsellers", ...categoryList],
    [categoryList]
  );

  // helper: find actual tab name for men/women based on categoryList
  const resolveHeaderFilterToTab = useCallback(
    (activeFilter) => {
      if (!activeFilter) return "All";

      // exact special
      if (activeFilter === "bestSellers") return "Our Bestsellers";

      // try to match category names smartly
      const lowerCats = categoryList.map((c) => String(c || "").toLowerCase());

      if (activeFilter === "men") {
        const idx = lowerCats.findIndex((c) => c.includes("men"));
        return idx > -1 ? categoryList[idx] : "All";
      }

      if (activeFilter === "women") {
        const idx = lowerCats.findIndex((c) => c.includes("women"));
        return idx > -1 ? categoryList[idx] : "All";
      }

      // fallback: if someone passes the category name directly
      const directIdx = lowerCats.findIndex((c) => c === String(activeFilter).toLowerCase());
      if (directIdx > -1) return categoryList[directIdx];

      return "All";
    },
    [categoryList]
  );

  /**
   * ✅ Read requested filter from:
   * 1) location.state.activeFilter (navigation)
   * 2) sessionStorage (persisted)
   */
  const requestedFilter = useMemo(() => {
    return (
      location.state?.activeFilter ||
      sessionStorage.getItem(FILTER_STORAGE_KEY) ||
      null
    );
  }, [location.state]);

  const [selectedCategory, setSelectedCategory] = useState("All");

  // ✅ Apply header filter once categories exist (after products load)
  useEffect(() => {
    if (!filters.length) return;

    const tab = resolveHeaderFilterToTab(requestedFilter);

    // apply only if valid
    if (filters.includes(tab)) {
      setSelectedCategory(tab);
    } else {
      setSelectedCategory("All");
    }

    // ✅ Clear it after applying (prevents repeated resetting)
    if (location.state?.activeFilter) {
      sessionStorage.setItem(FILTER_STORAGE_KEY, location.state.activeFilter);
      // clear router state so it won't re-run on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    filters,
    requestedFilter,
    resolveHeaderFilterToTab,
    location.state,
    location.pathname,
    navigate,
  ]);

  // Keep selection valid after refetch
  useEffect(() => {
    if (!filters.includes(selectedCategory)) setSelectedCategory("All");
  }, [filters, selectedCategory]);

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return products;
    if (selectedCategory === "Our Bestsellers") return products; // TODO: replace with real bestseller logic
    return products.filter((p) => p.category_name === selectedCategory);
  }, [selectedCategory, products]);

  // Pagination (backend ignores page/limit params, so we page client-side)
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const totalPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filtered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filtered, currentPage]);

  const resultsTopRef = useRef(null);

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Guest add
  const saveGuestCart = useCallback(
    (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? "";
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      const current = readGuest();
      const key = toKey(product.id, variantid);
      const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

      if (idx > -1) {
        // User requested: no need to increase if already in cart
      } else {
        current.push({
          id: product.id,
          variantid,
          name: product.name,
          image: product.image,
          price,
          qty: 1,
        });
      }

      writeGuest(current);
      refresh();
    },
    [refresh]
  );

  const handleAddToCart = useCallback(
    async (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? "";
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      // ✅ CHECK: no need to increase if already in cart
      if (checkInCart(product.id, variantid)) {
        return;
      }

      // guest
      if (!token || !user) {
        addOrIncLocal(
          { id: product.id, variantid, name: product.name, image: product.image, price, qty: 1 },
          1
        );
        saveGuestCart(product);
        return;
      }

      // optimistic badge
      addOrIncLocal(
        { id: product.id, variantid, name: product.name, image: product.image, price, qty: 1 },
        1
      );

      try {
        const { data: resp } = await api.post(
          `${API_BASE}/cart`,
          qs.stringify({ userid: user.id, productid: product.id, variantid, qty: 1 }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        if (resp?.success) refresh();
        else {
          refresh();
          alert(resp?.message || "Failed to add to cart");
        }
      } catch (e) {
        console.error("add to cart error:", e?.response?.data || e);
        refresh();
      }
    },
    [api, token, user, addOrIncLocal, refresh, saveGuestCart, checkInCart]
  );

  if (isLoading) {
    return (
      <p className="text-center py-8">
        <Spinner />
      </p>
    );
  }
  if (isError) return <p className="text-center py-8">Error loading products..</p>;

  return (
    <>
      <ValidateOnLoad />

      {/* Hero */}
      <div
        className="h-[242px] hidden md:flex w-[95%] xl:w-[80%] mx-auto bg-center rounded-2xl bg-cover justify-end mt-10"
        style={{ backgroundImage: `url(${shopherobg})` }}
      >
        <span className="font-[luxia] text-[#53443D] text-[36px] leading-tight lg:mr-[80px] xl:mr-[200px] flex items-center">
          {/* Discover Your <br /> Perfect Scent */}
        </span>
      </div>

      {/* <div
        className="h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center mt-6"
        style={{ backgroundImage: `url(${shopherobgmob})` }}
      >
        <p className="text-center mt-6 font-[luxia] text-[27px] leading-tight">
          Discover Your <br /> Perfect Scent
        </p>
      </div> */}

      <section className="mx-auto w-[95%] xl:w-[80%] py-8">
        <div ref={resultsTopRef} />
        {/* Tabs */}
        <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide no-scrollbar pb-4">
          {filters.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                sessionStorage.setItem(FILTER_STORAGE_KEY, cat); // ✅ persist user choice
              }}
              className={`px-4 py-2 rounded-full flex-shrink-0 transition ${
                selectedCategory === cat
                  ? "bg-[#b49d91] text-white"
                  : "bg-white text-[#b49d91] border border-[#b49d91]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products */}
        <div className="flex flex-row gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {paginatedProducts.map((product) => {
            const variant = product.variants?.[0] || {};
            const vid = variant.vid ?? "";
            const msrp = Number(variant.price) || 0;
            const sale = Number(variant.sale_price) || msrp;
            const discountPct = msrp > 0 && sale < msrp ? Math.round(((msrp - sale) / msrp) * 100) : 0;
            const savings = msrp > sale ? msrp - sale : 0;
            const badgeLabel = discountPct >= 40 ? "Best Deal" : discountPct > 0 ? `${discountPct}% OFF` : null;

            return (
              <div
                key={`${product.id}-${vid}`}
                className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px] bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Discount badge */}
                {badgeLabel && (
                  <span className={`absolute top-2 left-2 z-10 text-white text-xs font-bold px-2 py-1 rounded-md ${discountPct >= 40 ? "bg-orange-500" : "bg-red-500"}`}>
                    {discountPct >= 40 ? "🔥 " : ""}{badgeLabel}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 z-10 rounded-full p-1 bg-white/80 backdrop-blur-sm shadow"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                <img
                  onClick={() => navigate(`/product-details/${product.id}?vid=${vid}`)}
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-64 object-cover cursor-pointer"
                />

                <div className="p-3">
                  <h3 className="text-[#2A3443] font-[Lato] text-[15px] leading-snug font-medium">{product.name}</h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarSolid key={i} className="h-3 w-3 text-[#b49d91]" />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">(4.8)</span>
                  </div>

                  {/* Pricing */}
                  <div className="mt-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-[#2A3443] text-[17px]">₹{sale}/-</span>
                      {discountPct > 0 && (
                        <>
                          <span className="text-xs line-through text-gray-400">₹{msrp}/-</span>
                          <span className="text-xs text-green-600 font-bold">{discountPct}% OFF</span>
                        </>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">Save ₹{savings}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center flex-wrap gap-2 mt-10">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-full border border-[#b49d91] text-[#b49d91] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`h-10 w-10 rounded-full transition ${
                  currentPage === pageNum
                    ? "bg-[#b49d91] text-white"
                    : "bg-white text-[#b49d91] border border-[#b49d91]"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-full border border-[#b49d91] text-[#b49d91] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </>
  );
}

