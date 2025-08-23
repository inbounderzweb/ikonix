// src/context/CartContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import axios from 'axios';
import qs from 'qs';
import { useAuth } from './AuthContext';

const API_BASE = 'https://ikonixperfumer.com/beta/api';
const CartContext = createContext();

export function CartProvider({ children }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const fetchingRef = useRef(false);

  /* --- Guest storage (sanitized read/write + dedupe) --- */
  const readGuest = () => {
    const raw = JSON.parse(localStorage.getItem('guestCart') || '[]');

    // Normalize & coerce
    const normalized = (Array.isArray(raw) ? raw : []).map(x => ({
      id:    x.productid ?? x.id,
      vid:   x.variantid ?? x.vid,
      name:  x.name,
      image: x.image,
      price: Number(x.price) || 0,
      qty:   Number(x.qty)   || 1,
    }));

    // Deduplicate by id+vid, summing qty
    const byKey = new Map();
    for (const it of normalized) {
      const key = `${it.id}::${it.vid}`;
      const prev = byKey.get(key);
      byKey.set(
        key,
        prev
          ? { ...it, qty: (Number(prev.qty) || 0) + (Number(it.qty) || 0) }
          : it
      );
    }
    return Array.from(byKey.values());
  };

  const writeGuest = arr => {
    const safe = (Array.isArray(arr) ? arr : []).map(i => ({
      id:    i.id,
      vid:   i.vid ?? i.variantid, // allow either field name
      name:  i.name,
      image: i.image,
      price: Number(i.price) || 0,
      qty:   Number(i.qty)   || 1,
    }));
    localStorage.setItem('guestCart', JSON.stringify(safe));
  };

  /* --- Normalize each item for UI --- */
  const normalize = i => ({
    cartid:    i.cartid ?? i.id,                  // server may send cartid
    id:        i.productid ?? i.id,
    variantid: i.variantid ?? i.vid,              // unify to variantid for UI
    name:      i.name,
    image:     i.image,
    price:     Number(i.price) || 0,
    qty:       Number(i.qty)   || 1,
  });

  /* --- Fetch cart (server if logged in, else guest) --- */
  const fetchCart = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!token || !user) {
      const guest = readGuest();
      setItems(guest.map(normalize));
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
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const server = Array.isArray(data?.data) ? data.data : [];
      setItems(server.map(normalize));
      // keep guest mirror in sync for fallback flows
      writeGuest(
        server.map(it => ({
          id: it.id,
          vid: it.variantid ?? it.vid,
          name: it.name,
          image: it.image,
          price: Number(it.price) || 0,
          qty: Number(it.qty) || 1,
        }))
      );
    } catch {
      setItems([]);
    } finally {
      fetchingRef.current = false;
    }
  }, [user, token]);

  /* --- Sync guest items after login --- */
  const syncGuestToServer = useCallback(
    async (list = readGuest()) => {
      if (!user || !token || !list.length) return;
      await Promise.all(
        list.map(it => {
          const vid = it.variantid ?? it.vid;
          return axios
            .post(
              `${API_BASE}/cart`,
              qs.stringify({
                userid:     user.id,
                productid:  it.id,
                variantid:  vid,
                qty:        Number(it.qty) || 1,
              }),
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
              }
            )
            .catch(err =>
              console.error('Sync failed for', it.id, vid, err)
            );
        })
      );
    },
    [user, token]
  );

  /* --- Ensure server cart not empty (for checkout) --- */
  const ensureServerCartNotEmpty = useCallback(async () => {
    if (!user || !token) return;
    const { data } = await axios.post(
      `${API_BASE}/cart`,
      qs.stringify({ userid: user.id }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const server = Array.isArray(data?.data) ? data.data : [];
    if (!server.length) {
      await syncGuestToServer();
      await fetchCart();
    }
  }, [user, token, syncGuestToServer, fetchCart]);

  /* --- Clear --- */
  const clear = useCallback(() => {
    localStorage.removeItem('guestCart');
    setItems([]);
  }, []);

  /* --- Effects --- */
  useEffect(() => { fetchCart(); }, [fetchCart]);

  useEffect(() => {
    if (!user || !token) {
      // Always sanitize guest reads
      setItems(readGuest().map(normalize));
    } else {
      (async () => {
        await syncGuestToServer();
        await fetchCart();
      })();
    }
  }, [user, token, syncGuestToServer, fetchCart]);

  /* --- inc / dec / remove (guest path numeric-safe) --- */
  const inc = async (cartid, id, variantid) => {
    if (token && user) {
      await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id, productid: id, variantid, qty: 1 }),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      await fetchCart();
    } else {
      const raw = readGuest();
      const idx = raw.findIndex(x => x.id === id && (x.vid ?? x.variantid) === variantid);
      if (idx > -1) {
        raw[idx].qty = (Number(raw[idx].qty) || 0) + 1;
        writeGuest(raw);
        setItems(raw.map(normalize));
      }
    }
  };

  const dec = async (cartid, id, variantid) => {
    if (token && user) {
      await axios.post(
        `${API_BASE}/cart`,
        qs.stringify({ userid: user.id, productid: id, variantid, qty: -1 }),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      await fetchCart();
    } else {
      const raw = readGuest();
      const idx = raw.findIndex(x => x.id === id && (x.vid ?? x.variantid) === variantid);
      if (idx > -1) {
        const nextQty = Math.max(1, (Number(raw[idx].qty) || 1) - 1);
        raw[idx].qty = nextQty;
        writeGuest(raw);
        setItems(raw.map(normalize));
      }
    }
  };

  const remove = async (cartid, id, variantid) => {
    if (token && user && cartid) {
      await axios.post(
        `${API_BASE}/delete-cart`,
        qs.stringify({ userid: user.id, cartid, variantid }),
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      await fetchCart();
    } else {
      const raw = readGuest().filter(x => !(x.id === id && (x.vid ?? x.variantid) === variantid));
      writeGuest(raw);
      setItems(raw.map(normalize));
    }
  };

  return (
    <CartContext.Provider value={{
      items,
      inc,
      dec,
      remove,
      refresh: fetchCart,
      readGuest,
      syncGuestToServer,
      ensureServerCartNotEmpty,
      clear,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
