// src/components/header/Header.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

import logo from "../../assets/logo.svg";
import cartIco from "../../assets/Cart.svg";
import profile from "../../assets/profile.svg";
import search from "../../assets/search.svg";
import burger from "../../assets/burger.svg";

import DropDown from "./DropDown";
import Drawer from "../Drawer";
import AuthModal from "../../Authmodal/AuthModal";
import CartDrawer from "../cartdraw/CartDrawer";
import SearchModal from "../search/Search";
import MobileBottomNav from "../MobileBottomNav";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCart();

  const [open, setOpen] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebar(false), []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuRef = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  useEffect(() => setOpen(false), [location]);

  const goShop = useCallback(
    (cat) => {
      const c = String(cat || "").toLowerCase().trim();
      if (!c || c === "all") navigate("/shop");
      else navigate(`/shop?cat=${encodeURIComponent(c)}`);
      setOpen(false);
    },
    [navigate]
  );

  return (
    <>
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 w-[95%]
        transition-all duration-300 ease-in-out font-fancy
        ${scrolled ? "bg-[#2d3545]/95 shadow-md backdrop-blur-md" : "bg-[#2d3545]"}
        rounded-[18px] md:rounded-[22px] mt-3 ring-1 ring-white/5`}
      >
        <div className="bg-[#2d3545] h-[78px] rounded-[18px] md:rounded-[22px]">
          <div className="flex items-center h-full justify-between">
            <div className="pl-6">
              <Link to="/">
                <img src={logo} alt="Ikonix logo" className="h-8 md:h-10" />
              </Link>
            </div>

            <button onClick={() => setSidebar(true)} className="md:hidden pr-6">
              <img src={burger} alt="Open menu" className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center gap-8 pr-6 text-white">
              <ul className="flex gap-8 items-center text-[16px] font-normal">
                <li onClick={() => navigate("/")} className="cursor-pointer">
                  Home
                </li>
                <li onClick={() => navigate("/about")} className="cursor-pointer">
                  About us
                </li>

                <li ref={menuRef} className="relative">
                  <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1">
                    Products
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>

                  <div
                    className={`absolute z-30 transition-all duration-200
                    ${open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-3 invisible"}`}
                  >
                    <div
                      className="absolute left-1/2 -translate-x-1/2 h-5 w-5 rotate-45
                      bg-gray-100 border-l border-t border-slate-300 mt-2"
                    />

                    {/* ✅ DropDown MUST call onNavigate("mens"/"womens"/"bestsellers"/"all") */}
                    <DropDown onNavigate={goShop} onSelect={() => setOpen(false)} />
                  </div>
                </li>

                <li onClick={() => navigate("/contact")} className="cursor-pointer">
                  Contact us
                </li>
              </ul>

              <div className="flex gap-3 items-center">
                <button onClick={() => setSearchOpen(true)} className="cursor-pointer w-11 h-11 rounded-full bg-white/10 grid place-items-center">
                  <img src={search} alt="Search" className="w-5 h-5" />
                </button>

                <button
                  className="cursor-pointer w-11 h-11 rounded-full bg-white/10 grid place-items-center"
                  onClick={() => (user ? navigate("/user-profile") : setAuthOpen(true))}
                >
                  <img src={profile} alt="Profile" className="w-5 h-5" />
                </button>

                <div className="relative cursor-pointer" onClick={() => setCartOpen(true)}>
                  <div className="w-11 h-11 rounded-full bg-white/10 grid place-items-center">
                    <img src={cartIco} alt="Cart" className="w-5 h-5" />
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer setSideBarOpen={sidebar} onClose={closeSidebar}>
        {/* mobile menu */}
      </Drawer>

      <MobileBottomNav 
        onSearchOpen={() => setSearchOpen(true)}
        onCartOpen={() => setCartOpen(true)}
        onAuthOpen={() => setAuthOpen(true)}
      />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}


export default Header;
