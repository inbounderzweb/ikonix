// src/components/SearchModal.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../../features/product/productApi'; // ← same hook you already use

/**
 * SearchModal – centred popup with blurred backdrop and Tailwind-only animations.
 *
 * Props
 *  open      : boolean
 *  onClose   : () => void
 *  onSubmit  : (string) => void   (optional, fired when pressing Enter with no row selected)
 *  onPick    : (product) => void  (optional, fired when a product row is clicked / Enter on a row)
 */
export default function SearchModal({ open, onClose, onSubmit = () => {}, onPick }) {
  const [show, setShow]   = useState(open);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0); // keyboard highlight
  const inputRef  = useRef(null);
  const listRef   = useRef(null);
  const navigate  = useNavigate();

  // fetch all products once (RTK Query)
  const { data, isLoading } = useGetProductsQuery();
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

  // Filter products (case-insensitive substring on name + category)
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return allProducts.filter(
      p =>
        p.name?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        String(p.price).includes(q)
    );
  }, [query, allProducts]);

  // keep active index in bounds
  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results.length, active]);

  const closeAndReset = useCallback(() => {
    setQuery('');
    setActive(0);
    onClose();
  }, [onClose]);

  const firePick = useCallback(
    (product) => {
      if (onPick) onPick(product);
      else {
        // default: go to detail page
        navigate('/product-details', { state: { product } });
      }
      closeAndReset();
    },
    [onPick, navigate, closeAndReset]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (results.length > 0) {
      firePick(results[active]);
    } else {
      onSubmit(query);
      closeAndReset();
    }
  };

  const handleKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
      listRef.current?.children[(active + 1) % results.length]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
      listRef.current?.children[(active - 1 + results.length) % results.length]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      firePick(results[active]);
    }
  };

  // simple highlight helper
  const highlight = (text) => {
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-lg outline-none placeholder:text-gray-400 caret-[#b49d91]"
          />
        </form>

        {/* Results */}
        <div className="mt-5 max-h-80 overflow-y-auto" ref={listRef}>
          {isLoading && (
            <p className="text-sm text-gray-500 py-4 text-center">Loading products…</p>
          )}

          {!isLoading && query && results.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">No matches found.</p>
          )}

          {!isLoading &&
            results.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => firePick(p)}
                className={`w-full flex items-center gap-3 py-2 px-2 rounded-lg text-left hover:bg-gray-100 transition ${
                  idx === active ? 'bg-gray-100' : ''
                }`}
              >
                <img
                  src={`https://ikonixperfumer.com/beta/assets/uploads/${p.image}`}
                  alt={p.name}
                  className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">
                    {highlight(p.name || '')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {highlight(p.category_name || '')} • ₹{p.price}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
