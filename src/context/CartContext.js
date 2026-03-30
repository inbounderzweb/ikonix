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

/* ---------------- Price picker (SERVER MAY SEND DIFFERENT KEYS) ----------------
   Prefer sale/offer price when available; fallback to regular price.
   Adjust keys here if your API uses different names.
------------------------------------------------------------------- */
const pickBestPrice = (i) => {
  const candidates = [
    i.sale_price,
    i.selling_price,
    i.offer_price,
    i.discount_price,
    i.final_price,
    i.unit_price,
    i.price, // fallback
  ];

  for (const v of candidates) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

/* ---------------- Normalizers ---------------- */

const normalizeServerItem = (i) => ({
  cartid: i.cartid ?? i.id,
  id: Number(i.productid ?? i.id),
  variantid: String(i.variantid ?? i.vid ?? ""),
  name: i.name,
  image: i.image,
  // ✅ IMPORTANT FIX: use best price (sale/offer) if present
  price: pickBestPrice(i),
  qty: Math.max(1, Number(i.qty) || 1),

  // optional: keep msrp if your API sends it (harmless if undefined)
  msrp: Number(i.msrp ?? i.mrp ?? i.regular_price ?? i.price) || 0,
  sale_price: Number(i.sale_price ?? i.selling_price ?? i.offer_price ?? "") || 0,
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
  const [items, setItems] = useState(() => {
    // 1) read guest items from local storage immediately to avoid 0 badge count
    const guestItems = readGuest().map(normalizeGuestItem);
    return guestItems.length > 0 ? guestItems : [];
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Persistent guest UID for server-side guest cart tracking
  const [guestId] = useState(() => {
    let id = localStorage.getItem("guest_uid");
    if (!id) {
      // Use 0 as a standard guest ID or a session token
      id = "0"; 
      localStorage.setItem("guest_uid", id);
    }
    return id;
  });

  const getEffectiveUserId = useCallback(() => {
    return user?.id || guestId;
  }, [user, guestId]);

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
    setLoading(true);

    // determine uid (user id or guest id)
    const uid = getEffectiveUserId();

    try {
      const { data } = await api.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: uid }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const server = Array.isArray(data?.data) ? data.data : [];

      if (server.length === 0 && !user) {
        // Fallback to local guest cart if server is empty and we're a guest
        const guest = readGuest().map(normalizeGuestItem);
        setItems(guest);
      } else {
        setItems(server.map(normalizeServerItem));
      }
    } catch (err) {
      console.error("Cart fetch error (500 likely):", err?.response?.data || err);
      // Fallback to local items if guest
      if (!user) {
        const guest = readGuest().map(normalizeGuestItem);
        if (guest.length) setItems(guest);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }

  }, [api, user, getEffectiveUserId]);


  /* ---------------- Sync guest -> server ---------------- */
  const syncGuestToServer = useCallback(async () => {
    const uid = getEffectiveUserId();
    const guest = readGuest();
    if (!guest.length || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    console.log("Syncing Guest Cart items to server for UID:", uid);

    try {
      // Use for..of instead of Promise.all to isolate failures and avoid overwhelming the server
      for (const it of guest) {
        try {
          await api.post(
            `${API_BASE}/cart`,
            qs.stringify({
              userid: uid,
              productid: it.id,
              variantid: it.variantid || "",
              qty: Number(it.qty) || 1,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
        } catch (itemErr) {
          console.error(`Failed to sync item ${it.id}:`, itemErr?.response?.data || itemErr.message);
        }
      }

      if (user) {
        localStorage.removeItem("guestCart");
      }
      
      await fetchCart();
    } catch (err) {
      console.error("Critical error in syncGuestToServer:", err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [api, user, getEffectiveUserId, fetchCart]);


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
      msrp: Number(item.msrp) || 0,
      sale_price: Number(item.sale_price) || 0,
    };

    setItems((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const key = toKey(incoming.id, incoming.variantid);
      const idx = arr.findIndex((x) => toKey(x.id, x.variantid) === key);

      if (idx > -1) {
        const prevQty = Number(arr[idx].qty) || 0;
        arr[idx] = { ...arr[idx], qty: prevQty + addN };
        const incPrice = Number(incoming.price) || 0;
        if (incPrice > 0) arr[idx].price = incPrice;
        return arr;
      }

      return [...arr, { ...incoming, qty: addN }];
    });
  }, []);

  /* ---------------- Actions: inc / dec / remove ---------------- */

  const inc = useCallback(
    async (cartid, id, variantid) => {
      addOrIncLocal({ id, variantid }, 1);
      const uid = getEffectiveUserId();

      try {
        await api.post(
          `${API_BASE}/cart`,
          qs.stringify({ userid: uid, productid: id, variantid, qty: 1 }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        fetchCart();
      } catch (e) {
        console.error("inc error:", e);
        fetchCart();
      }

      if (!user) {
        const guest = readGuest();
        const key = toKey(id, variantid);
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty = (Number(guest[idx].qty) || 0) + 1;
        else guest.push({ id: Number(id), variantid: String(variantid), qty: 1 });
        writeGuest(guest);
      }
    },
    [api, user, getEffectiveUserId, addOrIncLocal, fetchCart]
  );

  const dec = useCallback(
    async (cartid, id, variantid) => {
      setItems((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
        const key = toKey(id, variantid);
        const idx = arr.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx === -1) return arr;
        const nextQty = Math.max(1, (Number(arr[idx].qty) || 1) - 1);
        arr[idx] = { ...arr[idx], qty: nextQty };
        return arr;
      });

      const uid = getEffectiveUserId();
      try {
        await api.post(
          `${API_BASE}/cart`,
          qs.stringify({ userid: uid, productid: id, variantid, qty: -1 }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        fetchCart();
      } catch (e) {
        console.error("dec error:", e);
        fetchCart();
      }

      if (!user) {
        const guest = readGuest();
        const key = toKey(id, variantid);
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty = Math.max(1, (Number(guest[idx].qty) || 1) - 1);
        writeGuest(guest);
      }
    },
    [api, user, getEffectiveUserId, fetchCart]
  );

  const remove = useCallback(
    async (cartid, id, variantid) => {
      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const key = toKey(id, variantid);
        return arr.filter((x) => toKey(x.id, x.variantid) !== key);
      });

      const uid = getEffectiveUserId();
      if (cartid || uid) {
        try {
          await api.post(
            `${API_BASE}/delete-cart`,
            qs.stringify({ userid: uid, cartid, variantid }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          fetchCart();
        } catch (e) {
          console.error("remove error:", e);
          fetchCart();
        }
      }

      if (!user) {
        const guest = readGuest().filter(
          (x) => toKey(x.id, x.variantid) !== toKey(id, variantid)
        );
        writeGuest(guest);
      }
    },
    [api, user, getEffectiveUserId, fetchCart]
  );

  const clear = useCallback(() => {
    localStorage.removeItem("guestCart");
    setItems([]);
  }, []);

  /* ---------------- Effects ---------------- */

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

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
        syncGuestToServer,
        ensureServerCartNotEmpty: syncGuestToServer,
        guestId,
        loading,
        syncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
