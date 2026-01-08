// // src/pages/shop/Shop.js
// import React, { useState, useMemo, useEffect, useCallback } from "react";
// import { useNavigate, useLocation } from "react-router-dom";
// import qs from "qs";
// import bag from "../../../assets/bag.svg";
// import Spinner from "../../../components/loader/Spinner";
// import shopherobg from "../../../assets/shopherobg.svg";
// import shopherobgmob from "../../../assets/shopheromobbg.svg";
// import ValidateOnLoad from "../../../components/ValidateOnLoad";
// import { useGetProductsQuery } from "../../../features/product/productApi";
// import { useAuth } from "../../../context/AuthContext";
// import { useCart } from "../../../context/CartContext";
// import { createApiClient } from "../../../api/client";

// const API_BASE = "https://ikonixperfumer.com/beta/api";

// /* ---------------- Guest helpers (same as CartContext) ---------------- */
// const safeJsonParse = (val, fallback) => {
//   try {
//     return JSON.parse(val);
//   } catch {
//     return fallback;
//   }
// };
// const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? "")}`;

// const readGuest = () => {
//   const raw = safeJsonParse(localStorage.getItem("guestCart") || "[]", []);
//   const arr = Array.isArray(raw) ? raw : [];
//   const byKey = new Map();

//   for (const x of arr) {
//     const id = x.productid ?? x.id;
//     const variantid = x.variantid ?? x.vid ?? "";
//     const qty = Math.max(1, Number(x.qty) || 1);

//     const item = {
//       id: Number(id),
//       variantid: String(variantid),
//       name: x.name,
//       image: x.image,
//       price: Number(x.price) || 0,
//       qty,
//     };

//     const key = toKey(item.id, item.variantid);
//     const prev = byKey.get(key);
//     byKey.set(key, prev ? { ...item, qty: prev.qty + item.qty } : item);
//   }

//   return Array.from(byKey.values());
// };

// const writeGuest = (arr) => {
//   const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
//     id: Number(i.id),
//     variantid: String(i.variantid ?? ""),
//     name: i.name,
//     image: i.image,
//     price: Number(i.price) || 0,
//     qty: Math.max(1, Number(i.qty) || 1),
//   }));
//   localStorage.setItem("guestCart", JSON.stringify(safe));
// };
// /* ------------------------------------------------------------------- */

// export default function Shop() {
//   const navigate = useNavigate();
//   const location = useLocation();

//   const { user, token, setToken, setIsTokenReady, isTokenReady } = useAuth();
//   const { refresh, addOrIncLocal } = useCart();

//   const api = useMemo(
//     () =>
//       createApiClient({
//         getToken: () => token,
//         setToken,
//         setIsTokenReady,
//       }),
//     [token, setToken, setIsTokenReady]
//   );

//   // RTK products (token-ready)
//   const { data, isLoading, isError, refetch } = useGetProductsQuery(undefined, {
//     skip: !isTokenReady,
//   });

//   useEffect(() => {
//     if (isTokenReady) refetch();
//   }, [isTokenReady, refetch]);

//   const products = data?.data || [];

//   // Filters
//   const categoryList = useMemo(
//     () => [...new Set(products.map((p) => p.category_name).filter(Boolean))],
//     [products]
//   );

//   const filters = useMemo(() => ["All", "Our Bestsellers", ...categoryList], [categoryList]);

//   // ✅ default tab from header navigation state
//   // DropDown sends: navigate("/shop", { state: { activeFilter: "women" }})
//   const initialFromHeader = useMemo(() => {
//     const f = location.state?.activeFilter;
//     if (!f) return "All";
//     if (f === "men") return "Men’s Perfume";
//     if (f === "women") return "Women’s Perfume";
//     if (f === "bestSellers") return "Our Bestsellers";
//     return "All";
//   }, [location.state]);

//   const [selectedCategory, setSelectedCategory] = useState(initialFromHeader);

//   // When we come from header again, update the selected tab
//   useEffect(() => {
//     setSelectedCategory(initialFromHeader);
//   }, [initialFromHeader]);

//   // Keep selected valid after refetch
//   useEffect(() => {
//     if (!filters.includes(selectedCategory)) setSelectedCategory("All");
//   }, [filters, selectedCategory]);

//   const filtered = useMemo(() => {
//     if (selectedCategory === "All") return products;
//     if (selectedCategory === "Our Bestsellers") return products; // adjust if you have a real bestseller flag
//     return products.filter((p) => p.category_name === selectedCategory);
//   }, [selectedCategory, products]);

//   // guest add
//   const saveGuestCart = useCallback(
//     (product) => {
//       const variant = product.variants?.[0] || {};
//       const variantid = variant.vid ?? "";
//       const price = Number(variant.sale_price || variant.price || 0) || 0;

//       const current = readGuest();
//       const key = toKey(product.id, variantid);
//       const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

//       if (idx > -1) current[idx].qty = (Number(current[idx].qty) || 0) + 1;
//       else {
//         current.push({
//           id: product.id,
//           variantid,
//           name: product.name,
//           image: product.image,
//           price,
//           qty: 1,
//         });
//       }

//       writeGuest(current);
//       refresh();
//     },
//     [refresh]
//   );

//   const handleAddToCart = useCallback(
//     async (product) => {
//       const variant = product.variants?.[0] || {};
//       const variantid = variant.vid ?? "";
//       const price = Number(variant.sale_price || variant.price || 0) || 0;

//       // guest
//       if (!token || !user) {
//         saveGuestCart(product);
//         return;
//       }

//       // optimistic
//       addOrIncLocal(
//         { id: product.id, variantid, name: product.name, image: product.image, price, qty: 1 },
//         1
//       );

//       try {
//         const { data: resp } = await api.post(
//           `${API_BASE}/cart`,
//           qs.stringify({ userid: user.id, productid: product.id, variantid, qty: 1 }),
//           { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
//         );

//         if (resp?.success) refresh();
//         else {
//           refresh();
//           alert(resp?.message || "Failed to add to cart");
//         }
//       } catch (e) {
//         console.error("add to cart error:", e);
//         refresh();
//       }
//     },
//     [api, token, user, addOrIncLocal, refresh, saveGuestCart]
//   );

//   if (isLoading) {
//     return (
//       <p className="text-center py-8">
//         <Spinner />
//       </p>
//     );
//   }
//   if (isError) return <p className="text-center py-8">Error loading products..</p>;

//   return (
//     <>
//       <ValidateOnLoad />

//       {/* Hero */}
//       <div
//         className="h-[242px] hidden md:flex w-[90%] xl:w-[75%] mx-auto bg-center bg-cover justify-end mt-6"
//         style={{ backgroundImage: `url(${shopherobg})` }}
//       >
//         <span className="font-[luxia] text-[#53443D] text-[36px] leading-tight lg:mr-[80px] xl:mr-[200px] flex items-center">
//           Lorem Ipsum <br /> dolor sit amet
//         </span>
//       </div>

//       <div
//         className="h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center mt-6"
//         style={{ backgroundImage: `url(${shopherobgmob})` }}
//       >
//         <p className="text-center mt-6 font-[luxia] text-[27px] leading-tight">
//           Lorem Ipsum <br /> dolor sit amet
//         </p>
//       </div>

//       <section className="mx-auto w-[90%] md:w-[75%] py-8">
//         {/* Tabs */}
//         <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-4">
//           {filters.map((cat) => (
//             <button
//               key={cat}
//               onClick={() => setSelectedCategory(cat)}
//               className={`px-4 py-2 rounded-full flex-shrink-0 transition ${
//                 selectedCategory === cat
//                   ? "bg-[#b49d91] text-white"
//                   : "bg-white text-[#b49d91] border border-[#b49d91]"
//               }`}
//             >
//               {cat}
//             </button>
//           ))}
//         </div>

//         {/* Products */}
//         <div className="flex flex-row gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
//           {filtered.map((product) => {
//             const variant = product.variants?.[0] || {};
//             const vid = variant.vid ?? "";
//             const msrp = Number(variant.price) || 0;
//             const sale = Number(variant.sale_price) || msrp;

//             return (
//               <div
//                 key={`${product.id}-${vid}`}
//                 className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
//               >
//                 <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
//                   {product.category_name}
//                 </span>

//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleAddToCart(product);
//                   }}
//                   className="absolute top-2 right-2 rounded-full p-1"
//                 >
//                   <img src={bag} alt="cart" className="h-6 w-6" />
//                 </button>

//                 <img
//                   onClick={() => navigate(`/product-details/${product.id}?vid=${vid}`)}
//                   src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
//                   alt={product.name}
//                   className="w-full h-72 object-cover cursor-pointer"
//                 />

//                 <div className="pt-4 flex justify-between items-start">
//                   <div>
//                     <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">{product.name}</h3>
//                     <p className="text-[#2A3443] font-[Lato] text-[14px]">{product.category_name}</p>
//                   </div>
//                   <div className="text-right">
//                     {sale < msrp && (
//                       <span className="text-xs line-through text-[#2A3443] font-[Lato] block">₹{msrp}/-</span>
//                     )}
//                     <span className="font-semibold text-[#2A3443]">₹{sale}/-</span>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </section>
//     </>
//   );
// }

// src/pages/shop/Shop.js
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import qs from "qs";
import bag from "../../../assets/bag.svg";
import Spinner from "../../../components/loader/Spinner";
import shopherobg from "../../../assets/shopherobg.svg";
import shopherobgmob from "../../../assets/shopheromobbg.svg";
import ValidateOnLoad from "../../../components/ValidateOnLoad";
import { useGetProductsQuery } from "../../../features/product/productApi";
import { useAuth } from "../../../context/AuthContext";
import { useCart } from "../../../context/CartContext";
import { createApiClient } from "../../../api/client";

const API_BASE = "https://ikonixperfumer.com/beta/api";

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
  const { refresh, addOrIncLocal } = useCart();

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

  const products = data?.data || [];

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

  // Guest add
  const saveGuestCart = useCallback(
    (product) => {
      const variant = product.variants?.[0] || {};
      const variantid = variant.vid ?? "";
      const price = Number(variant.sale_price || variant.price || 0) || 0;

      const current = readGuest();
      const key = toKey(product.id, variantid);
      const idx = current.findIndex((i) => toKey(i.id, i.variantid) === key);

      if (idx > -1) current[idx].qty = (Number(current[idx].qty) || 0) + 1;
      else {
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

      // guest
      if (!token || !user) {
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
    [api, token, user, addOrIncLocal, refresh, saveGuestCart]
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
        className="h-[242px] hidden md:flex w-[90%] xl:w-[75%] mx-auto bg-center bg-cover justify-end mt-6"
        style={{ backgroundImage: `url(${shopherobg})` }}
      >
        <span className="font-[luxia] text-[#53443D] text-[36px] leading-tight lg:mr-[80px] xl:mr-[200px] flex items-center">
          Lorem Ipsum <br /> dolor sit amet
        </span>
      </div>

      <div
        className="h-[300px] flex md:hidden w-[98%] mx-auto bg-center bg-cover justify-center mt-6"
        style={{ backgroundImage: `url(${shopherobgmob})` }}
      >
        <p className="text-center mt-6 font-[luxia] text-[27px] leading-tight">
          Lorem Ipsum <br /> dolor sit amet
        </p>
      </div>

      <section className="mx-auto w-[90%] md:w-[75%] py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 overflow-x-auto scrollbar-hide pb-4">
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
          {filtered.map((product) => {
            const variant = product.variants?.[0] || {};
            const vid = variant.vid ?? "";
            const msrp = Number(variant.price) || 0;
            const sale = Number(variant.sale_price) || msrp;

            return (
              <div
                key={`${product.id}-${vid}`}
                className="min-w-[80%] lg:min-w-[60%] sm:min-w-0 relative overflow-hidden rounded-[10px]"
              >
                <span className="absolute top-2 left-2 inline-block rounded-full border border-[#8C7367] px-3 py-1 text-xs text-[#8C7367]">
                  {product.category_name}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="absolute top-2 right-2 rounded-full p-1"
                >
                  <img src={bag} alt="cart" className="h-6 w-6" />
                </button>

                <img
                  onClick={() => navigate(`/product-details/${product.id}?vid=${vid}`)}
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${product.image}`}
                  alt={product.name}
                  className="w-full h-72 object-cover cursor-pointer"
                />

                <div className="pt-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-[#2A3443] font-[Lato] text-[16px] leading-snug">{product.name}</h3>
                    <p className="text-[#2A3443] font-[Lato] text-[14px]">{product.category_name}</p>
                  </div>

                  <div className="text-right">
                    {sale < msrp && (
                      <span className="text-xs line-through text-[#2A3443] font-[Lato] block">
                        ₹{msrp}/-
                      </span>
                    )}
                    <span className="font-semibold text-[#2A3443]">₹{sale}/-</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

