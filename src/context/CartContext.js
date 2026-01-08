// // src/context/CartContext.js
// import React, {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   useCallback,
//   useMemo,
//   useRef,
// } from "react";
// import axios from "axios";
// import qs from "qs";
// import { useAuth } from "./AuthContext";

// const API_BASE = "https://ikonixperfumer.com/beta/api";
// const CartContext = createContext();

// const GUEST_KEY = "guestCart";

// /* ---------------- utils ---------------- */
// const safeJsonParse = (val, fallback) => {
//   try {
//     return JSON.parse(val);
//   } catch {
//     return fallback;
//   }
// };

// const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? "")}`;

// const normalizeGuestItem = (x) => ({
//   id: x.productid ?? x.id,
//   variantid: x.variantid ?? x.vid ?? "",
//   name: x.name,
//   image: x.image,
//   price: Number(x.price) || 0,
//   qty: Math.max(1, Number(x.qty) || 1),
// });

// const normalizeServerItem = (x) => ({
//   cartid: x.cartid ?? x.id ?? null,
//   id: x.productid ?? x.id,
//   variantid: x.variantid ?? x.vid ?? "",
//   name: x.name,
//   image: x.image,
//   price: Number(x.price) || 0,
//   qty: Math.max(1, Number(x.qty) || 1),
// });

// /* ---------------- provider ---------------- */
// export function CartProvider({ children }) {
//   const { user, token } = useAuth();

//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(false); // fetch loader
//   const [syncing, setSyncing] = useState(false); // guest->server sync loader
//   const [error, setError] = useState(null);

//   // fetch / sync guards
//   const fetchingRef = useRef(false);
//   const pendingRefreshRef = useRef(false);

//   const syncingRef = useRef(false); // ✅ prevents overlapping sync calls
//   const syncedRef = useRef(false);  // ✅ prevents multiple sync per login session

//   /* ---------------- guest storage ---------------- */
//   const readGuest = useCallback(() => {
//     const raw = safeJsonParse(localStorage.getItem(GUEST_KEY) || "[]", []);
//     const arr = Array.isArray(raw) ? raw : [];

//     // normalize + dedupe by (id, variantid) and SUM qty
//     const map = new Map();
//     for (const x of arr) {
//       const it = normalizeGuestItem(x);
//       const key = toKey(it.id, it.variantid);
//       const prev = map.get(key);
//       map.set(key, prev ? { ...it, qty: (prev.qty || 0) + it.qty } : it);
//     }
//     return Array.from(map.values());
//   }, []);

//   const writeGuest = useCallback((arr) => {
//     const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
//       // ✅ keep ONE shape in localStorage
//       id: i.id,
//       variantid: i.variantid ?? "",
//       name: i.name,
//       image: i.image,
//       price: Number(i.price) || 0,
//       qty: Math.max(1, Number(i.qty) || 1),
//     }));
//     localStorage.setItem(GUEST_KEY, JSON.stringify(safe));
//   }, []);

//   const clearGuest = useCallback(() => {
//     localStorage.removeItem(GUEST_KEY);
//   }, []);

//   /* ---------------- derived values ---------------- */
//   const cartCount = useMemo(() => {
//     return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
//   }, [items]);

//   /* ---------------- fetch cart ---------------- */
//   const fetchCart = useCallback(async () => {
//     // if fetch is running, queue another refresh
//     if (fetchingRef.current) {
//       pendingRefreshRef.current = true;
//       return;
//     }

//     fetchingRef.current = true;
//     setError(null);
//     setLoading(true);

//     try {
//       // Guest mode
//       if (!user || !token) {
//         const guest = readGuest().map((g) => ({
//           cartid: null,
//           ...g,
//         }));
//         setItems(guest);
//         return;
//       }

//       // Logged-in mode
//       const { data } = await axios.post(
//         `${API_BASE}/cart`,
//         qs.stringify({ userid: user.id }),
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/x-www-form-urlencoded",
//           },
//         }
//       );

//       const server = Array.isArray(data?.data) ? data.data : [];
//       setItems(server.map(normalizeServerItem));
//     } catch (err) {
//       console.error("Cart fetch error", err);
//       setError("Failed to load cart");
//       // keep existing items to avoid badge flicker
//     } finally {
//       setLoading(false);
//       fetchingRef.current = false;

//       // run queued refresh once
//       if (pendingRefreshRef.current) {
//         pendingRefreshRef.current = false;
//         fetchCart();
//       }
//     }
//   }, [user, token, readGuest]);

//   /* ---------------- sync guest -> server (ONCE per login) ---------------- */
//  const syncGuestToServer = useCallback(async () => {
//   if (!user || !token) return;

//   // Prevent overlapping syncs in same mount
//   if (syncingRef.current) return;

//   syncingRef.current = true;
//   setSyncing(true);
//   setError(null);

//   // 1) Read guest cart
//   const guest = readGuest();

//   // Nothing to sync
//   if (!guest.length) {
//     setSyncing(false);
//     syncingRef.current = false;
//     return;
//   }

//   // 2) IMPORTANT: Clear guest cart immediately (prevents double-sync duplication)
//   clearGuest();

//   try {
//     // 3) Push each guest item to server
//     await Promise.all(
//       guest.map((it) =>
//         axios.post(
//           `${API_BASE}/cart`,
//           qs.stringify({
//             userid: user.id,
//             productid: it.id,
//             variantid: it.variantid ?? "",
//             qty: Math.max(1, Number(it.qty) || 1),
//           }),
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/x-www-form-urlencoded",
//             },
//           }
//         )
//       )
//     );

//     // 4) Refresh server cart into context
//     await fetchCart();
//   } catch (err) {
//     console.error("Guest sync failed", err);
//     setError("Failed to sync guest cart");

//     // ✅ Restore guest cart if sync fails (so items are not lost)
//     writeGuest(guest);

//     // allow retry later
//     syncedRef.current = false;
//   } finally {
//     setSyncing(false);
//     syncingRef.current = false;
//   }
// }, [user, token, readGuest, clearGuest, fetchCart, writeGuest]);


//   /* ---------------- reset sync flags on auth change ---------------- */
//   useEffect(() => {
//     // when user logs out or changes user/token, allow sync next login
//     syncedRef.current = false;
//     syncingRef.current = false;
//   }, [user?.id, token]);

//   /* ---------------- bootstrap / keep in sync ---------------- */
//   useEffect(() => {
//     fetchCart();
//   }, [fetchCart]);

//   useEffect(() => {
//     if (user && token) syncGuestToServer();
//   }, [user, token, syncGuestToServer]);

//   /* ---------------- optimistic helpers ---------------- */
//   const addOrIncLocal = useCallback((item, delta = 1) => {
//     const id = item.id;
//     const variantid = item.variantid ?? "";
//     const key = toKey(id, variantid);

//     setItems((prev) => {
//       const next = [...prev];
//       const idx = next.findIndex((x) => toKey(x.id, x.variantid) === key);

//       if (idx === -1) {
//         next.unshift({
//           cartid: null,
//           id,
//           variantid,
//           name: item.name,
//           image: item.image,
//           price: Number(item.price) || 0,
//           qty: Math.max(1, Number(item.qty) || 1) + Math.max(0, Number(delta) || 0) - 1,
//         });
//         return next;
//       }

//       const newQty = Math.max(1, (Number(next[idx].qty) || 1) + (Number(delta) || 0));
//       next[idx] = { ...next[idx], qty: newQty };
//       return next;
//     });
//   }, []);

//   const setQtyDeltaLocal = useCallback((id, variantid, delta) => {
//     const key = toKey(id, variantid);
//     setItems((prev) => {
//       const next = [...prev];
//       const idx = next.findIndex((x) => toKey(x.id, x.variantid) === key);
//       if (idx === -1) return prev;
//       const newQty = Math.max(1, (Number(next[idx].qty) || 1) + (Number(delta) || 0));
//       next[idx] = { ...next[idx], qty: newQty };
//       return next;
//     });
//   }, []);

//   const removeLocal = useCallback((id, variantid) => {
//     const key = toKey(id, variantid);
//     setItems((prev) => prev.filter((x) => toKey(x.id, x.variantid) !== key));
//   }, []);

//   const persistGuestFromItems = useCallback(
//     (nextItems) => {
//       const guest = nextItems.map((i) => ({
//         id: i.id,
//         variantid: i.variantid ?? "",
//         name: i.name,
//         image: i.image,
//         price: Number(i.price) || 0,
//         qty: Math.max(1, Number(i.qty) || 1),
//       }));
//       writeGuest(guest);
//     },
//     [writeGuest]
//   );

//   /* ---------------- actions: inc/dec/remove ---------------- */
//   const inc = useCallback(
//     async (cartid, id, variantid) => {
//       // optimistic
//       setQtyDeltaLocal(id, variantid, +1);

//       if (user && token) {
//         try {
//           await axios.post(
//             `${API_BASE}/cart`,
//             qs.stringify({ userid: user.id, productid: id, variantid, qty: 1 }),
//             {
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Content-Type": "application/x-www-form-urlencoded",
//               },
//             }
//           );
//         } catch (err) {
//           console.error("inc error", err);
//           // rollback
//           setQtyDeltaLocal(id, variantid, -1);
//         }
//         return;
//       }

//       // guest
//       setItems((prev) => {
//         const next = prev.map((x) =>
//           toKey(x.id, x.variantid) === toKey(id, variantid)
//             ? { ...x, qty: Math.max(1, (Number(x.qty) || 1) + 1) }
//             : x
//         );
//         persistGuestFromItems(next);
//         return next;
//       });
//     },
//     [user, token, setQtyDeltaLocal, persistGuestFromItems]
//   );

//   const dec = useCallback(
//     async (cartid, id, variantid) => {
//       // optimistic
//       setQtyDeltaLocal(id, variantid, -1);

//       if (user && token) {
//         try {
//           await axios.post(
//             `${API_BASE}/cart`,
//             qs.stringify({ userid: user.id, productid: id, variantid, qty: -1 }),
//             {
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Content-Type": "application/x-www-form-urlencoded",
//               },
//             }
//           );
//         } catch (err) {
//           console.error("dec error", err);
//           // rollback
//           setQtyDeltaLocal(id, variantid, +1);
//         }
//         return;
//       }

//       // guest
//       setItems((prev) => {
//         const next = prev.map((x) => {
//           if (toKey(x.id, x.variantid) !== toKey(id, variantid)) return x;
//           return { ...x, qty: Math.max(1, (Number(x.qty) || 1) - 1) };
//         });
//         persistGuestFromItems(next);
//         return next;
//       });
//     },
//     [user, token, setQtyDeltaLocal, persistGuestFromItems]
//   );

//   const remove = useCallback(
//     async (cartid, id, variantid) => {
//       const snapshot = items;
//       removeLocal(id, variantid);

//       if (user && token && cartid) {
//         try {
//           await axios.post(
//             `${API_BASE}/delete-cart`,
//             qs.stringify({ userid: user.id, cartid, variantid }),
//             {
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 "Content-Type": "application/x-www-form-urlencoded",
//               },
//             }
//           );
//         } catch (err) {
//           console.error("remove error", err);
//           // rollback
//           setItems(snapshot);
//         }
//         return;
//       }

//       // guest
//       setItems((prev) => {
//         const next = prev.filter((x) => toKey(x.id, x.variantid) !== toKey(id, variantid));
//         persistGuestFromItems(next);
//         return next;
//       });
//     },
//     [user, token, items, removeLocal, persistGuestFromItems]
//   );

//   const clear = useCallback(() => {
//     clearGuest();
//     setItems([]);
//   }, [clearGuest]);

//   return (
//     <CartContext.Provider
//       value={{
//         items,
//         cartCount,
//         loading,
//         syncing,
//         error,
//         inc,
//         dec,
//         remove,
//         refresh: fetchCart,
//         syncGuestToServer,
//         clear,
//         addOrIncLocal, // ✅ use this from PDP/PLP for instant badge updates
//       }}
//     >
//       {children}
//     </CartContext.Provider>
//   );
// }

// export const useCart = () => useContext(CartContext);


// src/context/CartContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import qs from "qs";
import { useAuth } from "./AuthContext";
import { createApiClient } from "../api/client";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const CartContext = createContext();

/* ---------------- Guest storage helpers (ONE SHAPE) ----------------
  guestCart item shape:
  { id, variantid, name, image, price, qty }
------------------------------------------------------------------- */

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

/* ---------------- Normalizers ---------------- */

const normalizeServerItem = (i) => ({
  cartid: i.cartid ?? i.id,
  id: Number(i.productid ?? i.id),
  variantid: String(i.variantid ?? i.vid ?? ""),
  name: i.name,
  image: i.image,
  price: Number(i.price) || 0,
  qty: Math.max(1, Number(i.qty) || 1),
});

const normalizeGuestItem = (i) => ({
  cartid: null,
  id: Number(i.id),
  variantid: String(i.variantid ?? ""),
  name: i.name,
  image: i.image,
  price: Number(i.price) || 0,
  qty: Math.max(1, Number(i.qty) || 1),
});

/* ------------------------------------------------------------- */

export function CartProvider({ children }) {
  const { user, token, setToken, setIsTokenReady } = useAuth();
  const [items, setItems] = useState([]);

  // single API client with auto refresh + retry on 401/403
  const api = useMemo(
    () =>
      createApiClient({
        getToken: () => token,
        setToken,
        setIsTokenReady,
      }),
    [token, setToken, setIsTokenReady]
  );

  // Avoid double fetch / double sync
  const fetchingRef = useRef(false);
  const syncingRef = useRef(false);

  /* ---------------- Derived: cart count ---------------- */
  const cartCount = useMemo(() => {
    return (items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  }, [items]);

  /* ---------------- Fetch cart ---------------- */
  const fetchCart = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // guest
    if (!user || !token) {
      const guest = readGuest().map(normalizeGuestItem);
      setItems(guest);
      fetchingRef.current = false;
      return;
    }

    try {
      const { data } = await api.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const server = Array.isArray(data?.data) ? data.data : [];
      setItems(server.map(normalizeServerItem));
    } catch (err) {
      console.error("Cart fetch error:", err);
      setItems([]);
    } finally {
      fetchingRef.current = false;
    }
  }, [api, user, token]);

  /* ---------------- Sync guest -> server (ONLY ON LOGIN, ONCE) ---------------- */
  const syncGuestToServer = useCallback(async () => {
    if (!user || !token) return;
    if (syncingRef.current) return;

    const guest = readGuest();
    if (!guest.length) return;

    syncingRef.current = true;

    try {
      // ✅ Add each guest item to server
      await Promise.all(
        guest.map((it) =>
          api.post(
            `${API_BASE}/cart`,
            qs.stringify({
              userid: user.id,
              productid: it.id,
              variantid: it.variantid,
              qty: Number(it.qty) || 1,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          )
        )
      );

      // ✅ Clear guest cart AFTER successful sync
      localStorage.removeItem("guestCart");

      // ✅ Refresh from server (source of truth)
      await fetchCart();
    } catch (err) {
      console.error("Guest sync failed:", err);
    } finally {
      syncingRef.current = false;
    }
  }, [api, user, token, fetchCart]);

  /* ---------------- Optimistic local add/inc (for realtime badge) ---------------- */
  const addOrIncLocal = useCallback((item, addQty = 1) => {
    const addN = Math.max(1, Number(addQty) || 1);
    const incoming = {
      cartid: item.cartid ?? null,
      id: Number(item.id),
      variantid: String(item.variantid ?? ""),
      name: item.name,
      image: item.image,
      price: Number(item.price) || 0,
      qty: Math.max(1, Number(item.qty) || 1),
    };

    setItems((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const key = toKey(incoming.id, incoming.variantid);
      const idx = arr.findIndex((x) => toKey(x.id, x.variantid) === key);
      if (idx > -1) {
        arr[idx] = { ...arr[idx], qty: (Number(arr[idx].qty) || 0) + addN };
        return arr;
      }
      return [...arr, { ...incoming, qty: addN }];
    });
  }, []);

  /* ---------------- Actions: inc / dec / remove ---------------- */

  const inc = useCallback(
    async (cartid, id, variantid) => {
      // optimistic
      addOrIncLocal({ id, variantid }, 1);

      if (user && token) {
        try {
          await api.post(
            `${API_BASE}/cart`,
            qs.stringify({ userid: user.id, productid: id, variantid, qty: 1 }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          fetchCart();
        } catch (e) {
          console.error("inc error:", e);
          fetchCart(); // rollback via refetch
        }
      } else {
        // guest
        const guest = readGuest();
        const key = toKey(id, variantid);
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty = (Number(guest[idx].qty) || 0) + 1;
        else guest.push({ id: Number(id), variantid: String(variantid), qty: 1 });
        writeGuest(guest);
        fetchCart();
      }
    },
    [api, user, token, addOrIncLocal, fetchCart]
  );

  const dec = useCallback(
    async (cartid, id, variantid) => {
      // optimistic local dec (safe)
      setItems((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const key = toKey(id, variantid);
        const idx = arr.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx === -1) return arr;
        const nextQty = Math.max(1, (Number(arr[idx].qty) || 1) - 1);
        arr[idx] = { ...arr[idx], qty: nextQty };
        return arr;
      });

      if (user && token) {
        try {
          await api.post(
            `${API_BASE}/cart`,
            qs.stringify({ userid: user.id, productid: id, variantid, qty: -1 }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          fetchCart();
        } catch (e) {
          console.error("dec error:", e);
          fetchCart();
        }
      } else {
        const guest = readGuest();
        const key = toKey(id, variantid);
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty = Math.max(1, (Number(guest[idx].qty) || 1) - 1);
        writeGuest(guest);
        fetchCart();
      }
    },
    [api, user, token, fetchCart]
  );

  const remove = useCallback(
    async (cartid, id, variantid) => {
      // optimistic local remove
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const key = toKey(id, variantid);
        return arr.filter((x) => toKey(x.id, x.variantid) !== key);
      });

      if (user && token && cartid) {
        try {
          await api.post(
            `${API_BASE}/delete-cart`,
            qs.stringify({ userid: user.id, cartid, variantid }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          fetchCart();
        } catch (e) {
          console.error("remove error:", e);
          fetchCart();
        }
      } else {
        const guest = readGuest().filter((x) => toKey(x.id, x.variantid) !== toKey(id, variantid));
        writeGuest(guest);
        fetchCart();
      }
    },
    [api, user, token, fetchCart]
  );

  const clear = useCallback(() => {
    localStorage.removeItem("guestCart");
    setItems([]);
  }, []);

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Only sync when user+token becomes available (login), not on every render
  useEffect(() => {
    if (user && token) syncGuestToServer();
  }, [user, token, syncGuestToServer]);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        inc,
        dec,
        remove,
        refresh: fetchCart,
        addOrIncLocal,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
