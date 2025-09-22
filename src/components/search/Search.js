// src/components/SearchModal.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../../features/product/productApi';
import { useAuth } from '../../context/AuthContext';

/**
 * SearchModal – centred popup with blurred backdrop and Tailwind-only animations.
 *
 * Props
 *  open      : boolean
 *  onClose   : () => void
 *  onSubmit  : (string) => void   (optional, fired when pressing Enter with no row selected)
 *  onPick    : (product, vid) => void  (optional, fired when a product row is clicked / Enter on a row)
 */
export default function SearchModal({ open, onClose, onSubmit = () => {}, onPick }) {
  const [show, setShow]       = useState(open);
  const [query, setQuery]     = useState('');
  const [active, setActive]   = useState(0);
  const inputRef              = useRef(null);
  const listRef               = useRef(null);
  const navigate              = useNavigate();

  // 🔑 Auth
  const { isTokenReady } = useAuth();

  // fetch products only once token is ready
  const {
    data,
    isLoading,
    refetch,
  } = useGetProductsQuery(undefined, { skip: !isTokenReady });

  useEffect(() => {
    if (isTokenReady) {
      refetch();
    }
  }, [isTokenReady, refetch]);

  const allProducts = data?.data || [];

  // mount/animate
  useEffect(() => {
    if (open) {
      setShow(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleEnd = () => {
    if (!open) setShow(false);
  };

  // filter products by name/category/price
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return allProducts.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q) ||
      String(p.variants?.[0]?.price || '').includes(q) ||
      String(p.variants?.[0]?.sale_price || '').includes(q)
    );
  }, [query, allProducts]);

  // attach first variant for display
  const displayList = useMemo(
    () => results.map(p => ({
      product: p,
      variant: (Array.isArray(p.variants) ? p.variants[0] : {}) || {}
    })),
    [results]
  );

  // keep active in bounds
  useEffect(() => {
    if (active >= displayList.length) setActive(0);
  }, [displayList.length, active]);

  const closeAndReset = useCallback(() => {
    setQuery('');
    setActive(0);
    onClose();
  }, [onClose]);

  const firePick = useCallback(
    (prod, vid) => {
      if (onPick) {
        onPick(prod, vid);
      } else {
        navigate(`/product-details/${prod.id}?vid=${vid ?? ''}`);
      }
      closeAndReset();
    },
    [onPick, navigate, closeAndReset]
  );

  const handleSubmit = e => {
    e.preventDefault();
    if (displayList.length > 0) {
      const { product, variant } = displayList[active];
      firePick(product, variant.vid);
    } else {
      onSubmit(query);
      closeAndReset();
    }
  };

  const handleKeyDown = e => {
    if (!displayList.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (active + 1) % displayList.length;
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (active - 1 + displayList.length) % displayList.length;
      setActive(prev);
      listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const { product, variant } = displayList[active];
      firePick(product, variant.vid);
    }
  };

  const highlight = text => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'ig'));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">{p}</mark>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  };

  if (!show && !open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeAndReset}
      />

      {/* Dialog */}
      <div
        className={`relative bg-white w-[90%] max-w-lg rounded-2xl shadow-xl transform transition-all duration-300 px-6 pt-6 pb-4 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onTransitionEnd={handleEnd}
      >
        {/* Close */}
        <button
          onClick={closeAndReset}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close search"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-3">
          <MagnifyingGlassIcon className="w-6 h-6 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, collections …"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-lg outline-none placeholder:text-gray-400 caret-[#b49d91]"
          />
        </form>

        {/* Results */}
        <div className="mt-5 max-h-80 overflow-y-auto" ref={listRef}>
          {isLoading && (
            <p className="text-sm text-gray-500 py-4 text-center">Loading products…</p>
          )}

          {!isLoading && query && displayList.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">No matches found.</p>
          )}

          {!isLoading &&
            displayList.map(({ product: p, variant }, idx) => {
              const imgSrc = variant.image || p.image;
              const price  = variant.sale_price ?? variant.price ?? 0;
              return (
                <button
                  key={`${p.id}-${variant.vid}`}
                  onClick={() => firePick(p, variant.vid)}
                  className={`w-full flex items-center gap-3 py-2 px-2 rounded-lg text-left hover:bg-gray-100 transition ${
                    idx === active ? 'bg-gray-100' : ''
                  }`}
                >
                  <img
                    src={`https://ikonixperfumer.com/beta/assets/uploads/${imgSrc}`}
                    alt={p.name}
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium leading-tight line-clamp-1">
                      {highlight(p.name || '')}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {highlight(p.category_name || '')} • ₹{price}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
