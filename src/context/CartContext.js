// src/context/CartContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";
import qs from "qs";
import { useAuth } from "./AuthContext";

const API_BASE = "https://ikonixperfumer.com/beta/api";
const CartContext = createContext();

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const fetchingRef = useRef(false);
  const syncedRef = useRef(false); // ✅ prevent multiple guest syncs

  /* --- Guest storage (safe read/write) --- */
  const readGuest = () => {
    try {
      return JSON.parse(localStorage.getItem("guestCart") || "[]");
    } catch {
      return [];
    }
  };

  const writeGuest = (arr) => {
    localStorage.setItem("guestCart", JSON.stringify(arr || []));
  };

  /* --- Normalize item shape --- */
  const normalize = (i) => ({
    cartid: i.cartid ?? i.id,
    id: i.productid ?? i.id,
    variantid: i.variantid ?? i.vid,
    name: i.name,
    image: i.image,
    price: Number(i.price) || 0,
    qty: Number(i.qty) || 1,
  });

  /* --- Fetch cart (server if logged in, else guest) --- */
  const fetchCart = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!user || !token) {
      setItems(readGuest().map(normalize));
      fetchingRef.current = false;
      return;
    }

    try {
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
      setItems(server.map(normalize));
    } catch (err) {
      console.error("Cart fetch error", err);
      setItems([]);
    } finally {
      fetchingRef.current = false;
    }
  }, [user, token]);

  /* --- Sync guest items to server (once per login) --- */
  const syncGuestToServer = useCallback(
    async (list = readGuest()) => {
      if (!user || !token || !list.length || syncedRef.current) return;
      try {
        await Promise.all(
          list.map((it) =>
            axios.post(
              `${API_BASE}/cart`,
              qs.stringify({
                userid: user.id,
                productid: it.id,
                variantid: it.variantid ?? it.vid,
                qty: Number(it.qty) || 1,
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
        syncedRef.current = true; // ✅ mark synced
        localStorage.removeItem("guestCart");
        await fetchCart();
      } catch (err) {
        console.error("Guest sync failed", err);
      }
    },
    [user, token, fetchCart]
  );

  /* --- Ensure server cart not empty --- */
  const ensureServerCartNotEmpty = useCallback(async () => {
    if (!user || !token) return;
    const { data } = await axios.post(
      `${API_BASE}/cart`,
      qs.stringify({ userid: user.id }),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const server = Array.isArray(data?.data) ? data.data : [];
    if (!server.length) {
      await syncGuestToServer();
      await fetchCart();
    }
  }, [user, token, syncGuestToServer, fetchCart]);

  /* --- Clear cart --- */
  const clear = useCallback(() => {
    localStorage.removeItem("guestCart");
    setItems([]);
  }, []);

  /* --- Effects --- */
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (user && token) {
      syncGuestToServer();
    }
  }, [user, token, syncGuestToServer]);

  /* --- Actions (inc, dec, remove) --- */
  const inc = async (cartid, id, variantid) => {
    if (user && token) {
      await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id, productid: id, variantid, qty: 1 }),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } else {
      const guest = readGuest();
      const idx = guest.findIndex((x) => x.id === id && (x.vid ?? x.variantid) === variantid);
      if (idx > -1) guest[idx].qty++;
      writeGuest(guest);
      setItems(guest.map(normalize));
    }
  };

  const dec = async (cartid, id, variantid) => {
    if (user && token) {
      await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id, productid: id, variantid, qty: -1 }),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } else {
      const guest = readGuest();
      const idx = guest.findIndex((x) => x.id === id && (x.vid ?? x.variantid) === variantid);
      if (idx > -1 && guest[idx].qty > 1) guest[idx].qty--;
      writeGuest(guest);
      setItems(guest.map(normalize));
    }
  };

  const remove = async (cartid, id, variantid) => {
    if (user && token && cartid) {
      await axios.post(
        `${API_BASE}/delete-cart`,
        qs.stringify({ userid: user.id, cartid, variantid }),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } else {
      const guest = readGuest().filter((x) => !(x.id === id && (x.vid ?? x.variantid) === variantid));
      writeGuest(guest);
      setItems(guest.map(normalize));
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        inc,
        dec,
        remove,
        refresh: fetchCart,
        readGuest,
        syncGuestToServer,
        ensureServerCartNotEmpty,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
