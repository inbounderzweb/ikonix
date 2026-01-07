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
import axios from "axios";
import qs from "qs";
import { useAuth } from "./AuthContext";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const CartContext = createContext();

const GUEST_KEY = "guestCart";

/* ---------------- utils ---------------- */
const safeJsonParse = (val, fallback) => {
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? "")}`;

const normalizeGuestItem = (x) => ({
  id: x.productid ?? x.id,
  variantid: x.variantid ?? x.vid ?? "",
  name: x.name,
  image: x.image,
  price: Number(x.price) || 0,
  qty: Math.max(1, Number(x.qty) || 1),
});

const normalizeServerItem = (x) => ({
  cartid: x.cartid ?? x.id ?? null,
  id: x.productid ?? x.id,
  variantid: x.variantid ?? x.vid ?? "",
  name: x.name,
  image: x.image,
  price: Number(x.price) || 0,
  qty: Math.max(1, Number(x.qty) || 1),
});

/* ---------------- provider ---------------- */
export function CartProvider({ children }) {
  const { user, token } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false); // fetch loader
  const [syncing, setSyncing] = useState(false); // guest->server sync loader
  const [error, setError] = useState(null);

  // fetch / sync guards
  const fetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  const syncingRef = useRef(false); // ✅ prevents overlapping sync calls
  const syncedRef = useRef(false);  // ✅ prevents multiple sync per login session

  /* ---------------- guest storage ---------------- */
  const readGuest = useCallback(() => {
    const raw = safeJsonParse(localStorage.getItem(GUEST_KEY) || "[]", []);
    const arr = Array.isArray(raw) ? raw : [];

    // normalize + dedupe by (id, variantid) and SUM qty
    const map = new Map();
    for (const x of arr) {
      const it = normalizeGuestItem(x);
      const key = toKey(it.id, it.variantid);
      const prev = map.get(key);
      map.set(key, prev ? { ...it, qty: (prev.qty || 0) + it.qty } : it);
    }
    return Array.from(map.values());
  }, []);

  const writeGuest = useCallback((arr) => {
    const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
      // ✅ keep ONE shape in localStorage
      id: i.id,
      variantid: i.variantid ?? "",
      name: i.name,
      image: i.image,
      price: Number(i.price) || 0,
      qty: Math.max(1, Number(i.qty) || 1),
    }));
    localStorage.setItem(GUEST_KEY, JSON.stringify(safe));
  }, []);

  const clearGuest = useCallback(() => {
    localStorage.removeItem(GUEST_KEY);
  }, []);

  /* ---------------- derived values ---------------- */
  const cartCount = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }, [items]);

  /* ---------------- fetch cart ---------------- */
  const fetchCart = useCallback(async () => {
    // if fetch is running, queue another refresh
    if (fetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    fetchingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      // Guest mode
      if (!user || !token) {
        const guest = readGuest().map((g) => ({
          cartid: null,
          ...g,
        }));
        setItems(guest);
        return;
      }

      // Logged-in mode
      const { data } = await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const server = Array.isArray(data?.data) ? data.data : [];
      setItems(server.map(normalizeServerItem));
    } catch (err) {
      console.error("Cart fetch error", err);
      setError("Failed to load cart");
      // keep existing items to avoid badge flicker
    } finally {
      setLoading(false);
      fetchingRef.current = false;

      // run queued refresh once
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchCart();
      }
    }
  }, [user, token, readGuest]);

  /* ---------------- sync guest -> server (ONCE per login) ---------------- */
 const syncGuestToServer = useCallback(async () => {
  if (!user || !token) return;

  // Prevent overlapping syncs in same mount
  if (syncingRef.current) return;

  syncingRef.current = true;
  setSyncing(true);
  setError(null);

  // 1) Read guest cart
  const guest = readGuest();

  // Nothing to sync
  if (!guest.length) {
    setSyncing(false);
    syncingRef.current = false;
    return;
  }

  // 2) IMPORTANT: Clear guest cart immediately (prevents double-sync duplication)
  clearGuest();

  try {
    // 3) Push each guest item to server
    await Promise.all(
      guest.map((it) =>
        axios.post(
          `${API_BASE}/cart`,
          qs.stringify({
            userid: user.id,
            productid: it.id,
            variantid: it.variantid ?? "",
            qty: Math.max(1, Number(it.qty) || 1),
          }),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        )
      )
    );

    // 4) Refresh server cart into context
    await fetchCart();
  } catch (err) {
    console.error("Guest sync failed", err);
    setError("Failed to sync guest cart");

    // ✅ Restore guest cart if sync fails (so items are not lost)
    writeGuest(guest);

    // allow retry later
    syncedRef.current = false;
  } finally {
    setSyncing(false);
    syncingRef.current = false;
  }
}, [user, token, readGuest, clearGuest, fetchCart, writeGuest]);


  /* ---------------- reset sync flags on auth change ---------------- */
  useEffect(() => {
    // when user logs out or changes user/token, allow sync next login
    syncedRef.current = false;
    syncingRef.current = false;
  }, [user?.id, token]);

  /* ---------------- bootstrap / keep in sync ---------------- */
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (user && token) syncGuestToServer();
  }, [user, token, syncGuestToServer]);

  /* ---------------- optimistic helpers ---------------- */
  const addOrIncLocal = useCallback((item, delta = 1) => {
    const id = item.id;
    const variantid = item.variantid ?? "";
    const key = toKey(id, variantid);

    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => toKey(x.id, x.variantid) === key);

      if (idx === -1) {
        next.unshift({
          cartid: null,
          id,
          variantid,
          name: item.name,
          image: item.image,
          price: Number(item.price) || 0,
          qty: Math.max(1, Number(item.qty) || 1) + Math.max(0, Number(delta) || 0) - 1,
        });
        return next;
      }

      const newQty = Math.max(1, (Number(next[idx].qty) || 1) + (Number(delta) || 0));
      next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  }, []);

  const setQtyDeltaLocal = useCallback((id, variantid, delta) => {
    const key = toKey(id, variantid);
    setItems((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => toKey(x.id, x.variantid) === key);
      if (idx === -1) return prev;
      const newQty = Math.max(1, (Number(next[idx].qty) || 1) + (Number(delta) || 0));
      next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  }, []);

  const removeLocal = useCallback((id, variantid) => {
    const key = toKey(id, variantid);
    setItems((prev) => prev.filter((x) => toKey(x.id, x.variantid) !== key));
  }, []);

  const persistGuestFromItems = useCallback(
    (nextItems) => {
      const guest = nextItems.map((i) => ({
        id: i.id,
        variantid: i.variantid ?? "",
        name: i.name,
        image: i.image,
        price: Number(i.price) || 0,
        qty: Math.max(1, Number(i.qty) || 1),
      }));
      writeGuest(guest);
    },
    [writeGuest]
  );

  /* ---------------- actions: inc/dec/remove ---------------- */
  const inc = useCallback(
    async (cartid, id, variantid) => {
      // optimistic
      setQtyDeltaLocal(id, variantid, +1);

      if (user && token) {
        try {
          await axios.post(
            `${API_BASE}/cart`,
            qs.stringify({ userid: user.id, productid: id, variantid, qty: 1 }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
        } catch (err) {
          console.error("inc error", err);
          // rollback
          setQtyDeltaLocal(id, variantid, -1);
        }
        return;
      }

      // guest
      setItems((prev) => {
        const next = prev.map((x) =>
          toKey(x.id, x.variantid) === toKey(id, variantid)
            ? { ...x, qty: Math.max(1, (Number(x.qty) || 1) + 1) }
            : x
        );
        persistGuestFromItems(next);
        return next;
      });
    },
    [user, token, setQtyDeltaLocal, persistGuestFromItems]
  );

  const dec = useCallback(
    async (cartid, id, variantid) => {
      // optimistic
      setQtyDeltaLocal(id, variantid, -1);

      if (user && token) {
        try {
          await axios.post(
            `${API_BASE}/cart`,
            qs.stringify({ userid: user.id, productid: id, variantid, qty: -1 }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
        } catch (err) {
          console.error("dec error", err);
          // rollback
          setQtyDeltaLocal(id, variantid, +1);
        }
        return;
      }

      // guest
      setItems((prev) => {
        const next = prev.map((x) => {
          if (toKey(x.id, x.variantid) !== toKey(id, variantid)) return x;
          return { ...x, qty: Math.max(1, (Number(x.qty) || 1) - 1) };
        });
        persistGuestFromItems(next);
        return next;
      });
    },
    [user, token, setQtyDeltaLocal, persistGuestFromItems]
  );

  const remove = useCallback(
    async (cartid, id, variantid) => {
      const snapshot = items;
      removeLocal(id, variantid);

      if (user && token && cartid) {
        try {
          await axios.post(
            `${API_BASE}/delete-cart`,
            qs.stringify({ userid: user.id, cartid, variantid }),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
        } catch (err) {
          console.error("remove error", err);
          // rollback
          setItems(snapshot);
        }
        return;
      }

      // guest
      setItems((prev) => {
        const next = prev.filter((x) => toKey(x.id, x.variantid) !== toKey(id, variantid));
        persistGuestFromItems(next);
        return next;
      });
    },
    [user, token, items, removeLocal, persistGuestFromItems]
  );

  const clear = useCallback(() => {
    clearGuest();
    setItems([]);
  }, [clearGuest]);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        loading,
        syncing,
        error,
        inc,
        dec,
        remove,
        refresh: fetchCart,
        syncGuestToServer,
        clear,
        addOrIncLocal, // ✅ use this from PDP/PLP for instant badge updates
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
