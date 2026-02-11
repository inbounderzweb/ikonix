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

      // ✅ normalize with sale/offer price preference
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

      // optional fields if you pass them
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
        // keep existing price unless incoming has a better one
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
        const guest = readGuest().filter(
          (x) => toKey(x.id, x.variantid) !== toKey(id, variantid)
        );
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
