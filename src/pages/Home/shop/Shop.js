// src/pages/shop/Shop.js
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import qs from "qs";
import bag from "../../../assets/bag.svg";
import Spinner from "../../../components/loader/Spinner";
import shopherobg from "../../../assets/about/aboutBannerDesk.svg";
import shopherobgmob from "../../../assets/about/aboutBannerMob.svg";
import ValidateOnLoad from "../../../components/ValidateOnLoad";
import { useGetProductsQuery } from "../../../features/product/productApi";
import { useAuth } from "../../../context/AuthContext";
import { useCart, readGuest, writeGuest, toKey } from "../../../context/CartContext";
import { createApiClient } from "../../../api/client";
import { toastSuccess, toastError, truncateName } from "../../../utils/toast";
import { trackViewItemList, trackSelectItem, trackAddToCart } from "../../../lib/ecommerce";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const PRODUCTS_PER_PAGE = 10;
const LIST_ID = "shop_catalog";
const LIST_NAME = "Shop Catalog";

const FILTER_STORAGE_KEY = "shopActiveFilter"; // sessionStorage key

export default function Shop() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();
  const { items, refresh, addOrIncLocal, inc } = useCart();

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

  // view_item_list: fire once per distinct rendered page of the list.
  const lastListKeyRef = useRef(null);
  useEffect(() => {
    if (!paginatedProducts.length) return;
    const key = `${selectedCategory}:${currentPage}:${paginatedProducts.map((p) => p.id).join(',')}`;
    if (lastListKeyRef.current === key) return;
    lastListKeyRef.current = key;
    trackViewItemList(paginatedProducts, { listId: LIST_ID, listName: LIST_NAME });
  }, [paginatedProducts, selectedCategory, currentPage]);

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
      toastSuccess(`${truncateName(product.name)} added to cart`);
      trackAddToCart(product, variant, 1);
    },
    [refresh]
  );

  const handleAddToCart = useCallback(
    async (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? "";
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      // ✅ Already in cart: increase quantity instead of a silent no-op
      if (checkInCart(product.id, variantid)) {
        inc(null, product.id, variantid);
        toastSuccess(`${truncateName(product.name)} quantity increased`);
        trackAddToCart(product, variant, 1);
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

        if (resp?.success) {
          refresh();
          toastSuccess(`${truncateName(product.name)} added to cart`);
          trackAddToCart(product, variant, 1);
        } else {
          refresh();
          toastError(resp?.message || "Failed to add to cart");
        }
      } catch (e) {
        console.error("add to cart error:", e?.response?.data || e);
        refresh();
        toastError("Error adding to cart");
      }
    },
    [api, token, user, addOrIncLocal, refresh, saveGuestCart, checkInCart, inc]
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Discount badge */}
                {badgeLabel && (
                  <span className="absolute top-2.5 left-2.5 z-10 flex items-center gap-0.5 rounded-full bg-[#2A3443] px-2 py-0.5 text-[9px] font-medium text-white">
                    {discountPct >= 40 ? "🔥 " : ""}{badgeLabel}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-3 right-3 z-10 rounded-full border border-[#c9b6a9] bg-white/70 p-2.5 backdrop-blur-sm hover:bg-white transition"
                >
                  <img src={bag} alt="cart" className="h-4 w-4" />
                </button>

                <img
                  onClick={() => {
                    trackSelectItem(product, { listId: LIST_ID, listName: LIST_NAME });
                    navigate(`/product-details/${product.id}?vid=${vid}`);
                  }}
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-40 sm:h-64 object-cover cursor-pointer"
                />

                <div className="p-3">
                  <h3 className="text-[#2A3443] font-[Lato] text-[15px] leading-snug font-medium line-clamp-2 min-h-[2.4em]">{product.name}</h3>

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
                        <span className="text-xs line-through text-gray-400">₹{msrp}/-</span>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">Save ₹{savings}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-6 mt-10 pt-6 border-t border-[#e6d9d0]">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="text-[#b49d91] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>

            <span className="text-[#8C7367] font-fancy text-[15px]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="text-[#b49d91] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </div>
        )}
      </section>
    </>
  );
}

