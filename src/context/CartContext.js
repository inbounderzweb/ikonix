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
import { toastSuccess, toastError, truncateName } from "../utils/toast";
import { getApiErrorMessage, getResponseMessage, isAuthError } from "../utils/apiError";
import { getCartPricing, normalizeServerCartItem } from "../utils/cartPricing";

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

export const toKey = (id, variantid) => `${String(id)}::${String(variantid ?? "")}`;

export const readGuest = () => {
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
      weight: x.weight ?? "",
      price: Number(x.price) || 0,
      qty,
    };

    const key = toKey(item.id, item.variantid);
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...item, qty: prev.qty + item.qty } : item);
  }

  return Array.from(byKey.values());
};

export const writeGuest = (arr) => {
  const safe = (Array.isArray(arr) ? arr : []).map((i) => ({
    id: Number(i.id),
    variantid: String(i.variantid ?? ""),
    name: i.name,
    image: i.image,
    weight: i.weight ?? "",
    price: Number(i.price) || 0,
    qty: Math.max(1, Number(i.qty) || 1),
  }));
  localStorage.setItem("guestCart", JSON.stringify(safe));
};

/* ---------------- Normalizers ---------------- */

const normalizeGuestItem = (i) => ({
  cartid: null,
  id: Number(i.id),
  variantid: String(i.variantid ?? ""),
  name: i.name,
  image: i.image,
  weight: i.weight ?? "",
  price: Number(i.price) || 0,
  qty: Math.max(1, Number(i.qty) || 1),
});

/* ------------------------------------------------------------- */

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState(() => {
    // 1) read guest items from local storage immediately to avoid 0 badge count
    const guestItems = readGuest().map(normalizeGuestItem);
    return guestItems.length > 0 ? guestItems : [];
  });
  // Server-calculated offer lines (e.g. "Buy 4 Get 1 Free"); empty when no offer applies
  const [freeItems, setFreeItems] = useState([]);
  // Bumps every time the cart newly qualifies for (more of) an offer, so the UI can
  // open the cart and celebrate. Not bumped for the first load of an already-qualifying cart.
  const [offerTick, setOfferTick] = useState(0);
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

  // The client reads the current stored session for every request, including
  // delayed payment callbacks and requests after a login/logout.
  const api = useMemo(
    () => createApiClient({ baseUrl: '' }),
    []
  );

  // Session invalidation belongs to the API client; permission failures
  // should show the backend message without logging the customer out.
  const reportCartError = useCallback((err, fallback) => {
    if (isAuthError(err)) {
      toastError('Your session has expired. Please log in again.');
    } else {
      toastError(getApiErrorMessage(err, fallback));
    }
  }, []);

  const authRef = useRef({ userId: user?.id, token });
  authRef.current = { userId: user?.id, token };

  // Avoid double fetch / double sync
  const fetchingRef = useRef(false);
  const syncingRef = useRef(false);
  // Avoid duplicate inc/dec/remove requests for the same line item
  // (e.g. a rapid double-click) racing each other
  const pendingItemsRef = useRef(new Set());
  // A fetch requested while another is in flight is queued (not dropped), so the
  // final state always reflects the latest cart
  const queuedRef = useRef(false);
  const lastFetchRef = useRef(0);
  const fetchCartRef = useRef(null);
  const refreshTimerRef = useRef(null);
  // free-bottle count from the previous server response (null = not loaded yet)
  const freeBaselineRef = useRef(null);

  /* ---------------- Derived: cart count ---------------- */
  const cartCount = useMemo(() => {
    return (items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  }, [items]);

  const pricing = useMemo(
    () => getCartPricing(items, freeItems),
    [items, freeItems]
  );
  const discount = pricing.discount;

  // Checkout's delivery quote is also a cart snapshot. Keep the shared cart in
  // sync so quantity controls act on the same quantities that checkout shows.
  const applyServerCart = useCallback((response) => {
    if (response?.status === false || response?.success === false || !Array.isArray(response?.data)) return;
    const nextFree = Array.isArray(response.free_items) ? response.free_items : [];
    setFreeItems(nextFree);

    const freeQty = nextFree.reduce((sum, f) => sum + (Number(f.free_qty) || 0), 0);
    if (freeBaselineRef.current !== null && freeQty > freeBaselineRef.current) {
      setOfferTick((t) => t + 1);
    }
    freeBaselineRef.current = freeQty;
    setItems(response.data.map(normalizeServerCartItem));
    lastFetchRef.current = Date.now();
  }, []);

  /* ---------------- Fetch cart ---------------- */
  const fetchCart = useCallback(async (opts) => {
    // background refreshes (silent) don't flash the "Loading cart..." bar
    const silent = opts?.silent === true;

    // A guest cart lives in localStorage and is always the source of truth, so
    // even an empty guest cart never reads the shared server guest bucket.
    if (!user) {
      setItems(readGuest().map(normalizeGuestItem));
      setFreeItems([]);
      setLoading(false);
      lastFetchRef.current = Date.now();
      return;
    }

    if (fetchingRef.current) {
      queuedRef.current = true;
      return;
    }

    fetchingRef.current = true;
    if (!silent) setLoading(true);

    // Only logged-in carts are stored on the server.
    const uid = getEffectiveUserId();

    try {
      const { data } = await api.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: uid }),
        { requireUser: true, expectedUserToken: token, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (authRef.current.userId !== user.id || authRef.current.token !== token) return;

      applyServerCart(data);
    } catch (err) {
      console.error("Cart fetch error:", err?.response?.data || err);
    } finally {
      fetchingRef.current = false;
      lastFetchRef.current = Date.now();
      setLoading(false);
      if (queuedRef.current) {
        queuedRef.current = false;
        fetchCartRef.current?.({ silent: true });
      }
    }

  }, [api, user, token, getEffectiveUserId, applyServerCart]);
  fetchCartRef.current = fetchCart;

  // Debounced background refetch used after qty changes (offer recalculation),
  // so rapid +/- clicks produce one request instead of one per click
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => fetchCartRef.current?.({ silent: true }), 400);
  }, []);

  // Refetch only if the cart hasn't been loaded recently
  const refreshIfStale = useCallback((maxAgeMs = 30000) => {
    if (Date.now() - lastFetchRef.current > maxAgeMs) fetchCartRef.current?.();
  }, []);

  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  // New login/logout: forget the previous offer baseline
  useEffect(() => {
    freeBaselineRef.current = null;
  }, [user?.id]);


  /* ---------------- Sync guest -> server ---------------- */
  const syncGuestToServer = useCallback(async () => {
    if (!user?.id || !token) return;
    const uid = user.id;
    const guest = readGuest();
    if (!guest.length || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    console.log("Syncing Guest Cart items to server for UID:", uid);

    try {
      // Use for..of instead of Promise.all to isolate failures and avoid overwhelming the server
      for (const it of guest) {
        if (authRef.current.userId !== uid || authRef.current.token !== token) break;
        try {
          const { data } = await api.post(
            `${API_BASE}/cart`,
            qs.stringify({
              userid: uid,
              productid: it.id,
              variantid: it.variantid || "",
              qty: Number(it.qty) || 1,
            }),
            { requireUser: true, expectedUserToken: token, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          if ([false, "false", 0, "0"].includes(data?.success) ||
              [false, "false", 0, "0"].includes(data?.status)) {
            throw new Error(getResponseMessage(data, "Cart transfer was rejected"));
          }

          // Remove only the quantity confirmed by the server. Failed lines,
          // and anything added while this request was running, stay local.
          const key = toKey(it.id, it.variantid);
          const remaining = readGuest().flatMap((item) => {
            if (toKey(item.id, item.variantid) !== key) return [item];
            const qty = item.qty - it.qty;
            return qty > 0 ? [{ ...item, qty }] : [];
          });
          if (remaining.length) writeGuest(remaining);
          else localStorage.removeItem("guestCart");
        } catch (itemErr) {
          console.error(`Failed to sync item ${it.id}:`, itemErr?.response?.data || itemErr.message);
          if (isAuthError(itemErr) || itemErr.__sessionChanged) break;
        }
      }
      
      if (authRef.current.userId === uid && authRef.current.token === token) await fetchCart();
    } catch (err) {
      console.error("Critical error in syncGuestToServer:", err);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
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
      weight: item.weight ?? "",
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
        if (incoming.weight) arr[idx].weight = incoming.weight;
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
      const key = toKey(id, variantid);
      if (!user) {
        const guest = readGuest();
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty += 1;
        else {
          const existing = items.find((x) => toKey(x.id, x.variantid) === key);
          guest.push({ ...existing, id: Number(id), variantid: String(variantid ?? ""), qty: 1 });
        }
        writeGuest(guest);
        setItems(guest.map(normalizeGuestItem));
        return;
      }
      if (pendingItemsRef.current.has(key)) return; // already in flight
      pendingItemsRef.current.add(key);

      addOrIncLocal({ id, variantid }, 1);
      const uid = getEffectiveUserId();

      try {
        await api.post(
          `${API_BASE}/cart`,
          qs.stringify({ userid: uid, productid: id, variantid, qty: 1 }),
          { requireUser: true, expectedUserToken: token, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        // optimistic update already reflects the new qty; refetch only to
        // recalculate the server-side offer (e.g. buy 4 get 1 free)
        if (user) scheduleRefresh();
      } catch (e) {
        console.error("inc error:", e?.response?.data || e);
        reportCartError(e, "Couldn't update quantity");
        fetchCart(); // resync/rollback to server truth
      } finally {
        pendingItemsRef.current.delete(key);
      }
    },
    [api, user, token, items, getEffectiveUserId, addOrIncLocal, fetchCart, scheduleRefresh, reportCartError]
  );

  const dec = useCallback(
    async (cartid, id, variantid) => {
      const key = toKey(id, variantid);

      if (!user) {
        const guest = readGuest();
        const idx = guest.findIndex((x) => toKey(x.id, x.variantid) === key);
        if (idx > -1) guest[idx].qty = Math.max(1, guest[idx].qty - 1);
        writeGuest(guest);
        setItems(guest.map(normalizeGuestItem));
        return;
      }

      // Quantity floor: never go below 1, and never fire a decrement
      // request when already at 1.
      const current = items.find((x) => toKey(x.id, x.variantid) === key);
      if (current && (Number(current.qty) || 1) <= 1) return;

      if (pendingItemsRef.current.has(key)) return; // already in flight
      pendingItemsRef.current.add(key);

      setItems((prev) => {
        const arr = Array.isArray(prev) ? [...prev] : [];
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
          { requireUser: true, expectedUserToken: token, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        // optimistic update already reflects the new qty; refetch only to
        // recalculate the server-side offer (e.g. buy 4 get 1 free)
        if (user) scheduleRefresh();
      } catch (e) {
        console.error("dec error:", e?.response?.data || e);
        reportCartError(e, "Couldn't update quantity");
        fetchCart(); // resync/rollback to server truth
      } finally {
        pendingItemsRef.current.delete(key);
      }
    },
    [api, user, token, getEffectiveUserId, fetchCart, scheduleRefresh, items, reportCartError]
  );

  const remove = useCallback(
    async (cartid, id, variantid) => {
      const key = toKey(id, variantid);
      if (!user) {
        const removedName = items.find((x) => toKey(x.id, x.variantid) === key)?.name;
        const guest = readGuest().filter((x) => toKey(x.id, x.variantid) !== key);
        writeGuest(guest);
        setItems(guest.map(normalizeGuestItem));
        toastSuccess(removedName ? `${truncateName(removedName)} removed from cart` : "Item removed from cart");
        return;
      }
      if (pendingItemsRef.current.has(key)) return; // already in flight
      pendingItemsRef.current.add(key);

      const removedName = items.find((x) => toKey(x.id, x.variantid) === key)?.name;

      setItems((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.filter((x) => toKey(x.id, x.variantid) !== key);
      });

      const uid = getEffectiveUserId();
      // The backend requires a server cart ID; an optimistic new line may
      // not have received one yet.
      if (cartid) {
        try {
          await api.post(
            `${API_BASE}/delete-cart`,
            qs.stringify({ userid: uid, cartid, variantid }),
            { requireUser: true, expectedUserToken: token, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          // item already removed from local state; refetch to recalculate the offer
          if (user) scheduleRefresh();
          toastSuccess(removedName ? `${truncateName(removedName)} removed from cart` : "Item removed from cart");
        } catch (e) {
          console.error("remove error:", e?.response?.data || e);
          reportCartError(e, "Couldn't remove item");
          fetchCart(); // resync/rollback to server truth
        } finally {
          pendingItemsRef.current.delete(key);
        }
      } else {
        toastSuccess(removedName ? `${truncateName(removedName)} removed from cart` : "Item removed from cart");
        pendingItemsRef.current.delete(key);
      }
    },
    [api, user, token, getEffectiveUserId, fetchCart, scheduleRefresh, items, reportCartError]
  );

  const clear = useCallback(() => {
    localStorage.removeItem("guestCart");
    setItems([]);
    setFreeItems([]);
    freeBaselineRef.current = 0;
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
        items: pricing.items,
        freeItems,
        discount,
        applyServerCart,
        offerTick,
        refreshIfStale,
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
        api,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
