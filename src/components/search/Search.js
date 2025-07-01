import React, { useEffect, useRef, useState } from "react";
import { XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

/**
 * SearchModal – centred popup with blurred backdrop and Tailwind-only animations.
 *
 * Props
 * ▸ open        : boolean
 * ▸ onClose     : () => void
 * ▸ onSubmit    : (string) => void   (optional, fired on Enter)
 */
export default function SearchModal({ open, onClose, onSubmit = () => {} }) {
  const [show, setShow] = useState(open);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // mount while animating
  useEffect(() => {
    if (open) setShow(true);
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleEnd = () => {
    if (!open) setShow(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(query);
    onClose();
  };

  if (!show && !open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative bg-white w-[90%] max-w-lg rounded-2xl shadow-xl transform transition-all duration-300 px-6 pb-8 pt-6 ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onTransitionEnd={handleEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
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
            className="flex-1 text-lg outline-none placeholder:text-gray-400 caret-[#b49d91]"
          />
        </form>
      </div>
    </div>
  );
}
