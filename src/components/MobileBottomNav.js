import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import waicon from "../assets/whatsapp.png";

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" strokeLinecap="round" />
  </svg>
);

const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
    <path strokeLinecap="round" d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MobileBottomNav = ({ onSearchOpen, onCartOpen, onAuthOpen }) => {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user } = useAuth();

  const handleProfileClick = () => {
    if (user) {
      navigate("/user-profile");
    } else {
      onAuthOpen();
    }
  };

  return (
    <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[45] w-[92%] max-w-[420px] flex items-center gap-3">
      {/* Main nav pill */}
      <div className="flex-1 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] rounded-2xl flex items-center justify-around px-2 py-2">

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="flex flex-col items-center justify-center gap-0.5 px-4 py-1 text-[#3D3934] active:opacity-60 transition-opacity"
        >
          <SearchIcon />
          <span className="text-[10px] font-medium tracking-wide">Search</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[#E8E0DB]" />

        {/* Cart */}
        <button
          onClick={onCartOpen}
          className="relative flex flex-col items-center justify-center gap-0.5 px-4 py-1 text-[#3D3934] active:opacity-60 transition-opacity"
        >
          <CartIcon />
          {cartCount > 0 && (
            <span className="absolute top-0.5 right-2.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-0.5">
              {cartCount}
            </span>
          )}
          <span className="text-[10px] font-medium tracking-wide">Cart</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[#E8E0DB]" />

        {/* Products / Profile */}
        <button
          onClick={handleProfileClick}
          className="flex flex-col items-center justify-center gap-0.5 px-4 py-1 text-[#3D3934] active:opacity-60 transition-opacity"
        >
          <ProfileIcon />
          <span className="text-[10px] font-medium tracking-wide">Products</span>
        </button>
      </div>

      {/* WhatsApp button */}
      <a
        href="https://wa.me/919072416518"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#25D366] shadow-[0_4px_20px_rgba(37,211,102,0.35)] flex items-center justify-center active:opacity-80 transition-opacity"
        aria-label="Chat on WhatsApp"
      >
        <img src={waicon} alt="WhatsApp" className="w-8 h-8" />
      </a>
    </div>
  );
};

export default MobileBottomNav;

