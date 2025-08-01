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

  /* --- Guest storage --- */
  const readGuest = () =>
    JSON.parse(localStorage.getItem('guestCart') || '[]');
  const writeGuest = arr =>
    localStorage.setItem('guestCart', JSON.stringify(arr));

  /* --- Normalize each item --- */
  const normalize = i => ({
    cartid:    i.cartid ?? i.id,
    id:        i.productid ?? i.id,
    variantid: i.variantid ?? i.vid,
    name:      i.name,
    image:     i.image,
    price:     Number(i.price),
    qty:       Number(i.qty),
  });

  /* --- Fetch cart (server if logged in, else guest) --- */
  const fetchCart = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const guest = readGuest();
    if (!token || !user) {
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
      const server = Array.isArray(data.data) ? data.data : [];
      setItems(server.map(normalize));
      writeGuest(server);
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
                qty:        it.qty,
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
    const server = Array.isArray(data.data) ? data.data : [];
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
      setItems(readGuest().map(normalize));
    } else {
      (async () => {
        await syncGuestToServer();
        await fetchCart();
      })();
    }
  }, [user, token, syncGuestToServer, fetchCart]);

  /* --- inc / dec / remove, all now pass variantid --- */
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
      const idx = raw.findIndex(x => x.id === id && (x.variantid ?? x.vid) === variantid);
      if (idx > -1) {
        raw[idx].qty += 1;
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
      const idx = raw.findIndex(x => x.id === id && (x.variantid ?? x.vid) === variantid);
      if (idx > -1) {
        raw[idx].qty = Math.max(1, raw[idx].qty - 1);
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
      const raw = readGuest().filter(x => !(x.id === id && (x.variantid ?? x.vid) === variantid));
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
