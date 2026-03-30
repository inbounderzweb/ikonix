import React from "react";
import { useNavigate } from "react-router-dom";
import cartIco from "../assets/Cart.svg";
import profile from "../assets/profile.svg";
import search from "../assets/search.svg";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

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
    <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[45] w-[90%] max-w-[400px]">
      <div className="bg-[#2A3443] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full h-16 flex items-center justify-around px-4">

        {/* Search */}
        <button
          onClick={onSearchOpen}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full active:bg-white/10 transition-all hover:scale-110"
        >
          <img src={search} alt="Search" className="w-6 h-6 opacity-90" />
        </button>

        {/* Cart */}
        <button
          onClick={onCartOpen}
          className="relative flex flex-col items-center justify-center w-12 h-12 rounded-full active:bg-white/10 transition-all hover:scale-110"
        >
          <img src={cartIco} alt="Cart" className="w-6 h-6 opacity-90" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#2A3443]">
              {cartCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={handleProfileClick}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full active:bg-white/10 transition-all hover:scale-110"
        >
          <img src={profile} alt="Profile" className="w-6 h-6 opacity-90" />
        </button>
      </div>
    </div>
  );
};

export default MobileBottomNav;

