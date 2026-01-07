// ─── Header.jsx ──────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

import logo from '../../assets/logo.svg';
import cartIco from '../../assets/Cart.svg';
import profile from '../../assets/profile.svg';
import search from '../../assets/search.svg';
import burger from '../../assets/burger.svg';

import DropDown from './DropDown';
import Drawer from '../Drawer';
import AuthModal from '../../Authmodal/AuthModal';
import CartDrawer from '../cartdraw/CartDrawer';
import SearchModal from '../search/Search';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const { cartCount } = useCart(); // ✅ single source of truth

  const [open, setOpen] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Header sticky
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mega-menu when clicking outside or on route change
  const menuRef = useRef(null);
  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
  useEffect(() => setOpen(false), [location]);

  return (
    <>
      {/* ─── Desktop & Tablet Header ───────── */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 w-[95%] lg:w-[75%]
        transition-all duration-300 ease-in-out font-fancy
        ${scrolled ? 'bg-[#2A3443]/90 shadow-md backdrop-blur-md' : 'bg-[#2A3443]'}
        rounded-[8px] md:rounded-[16px] mt-3`}
      >
        <div className="bg-[#2A3443] h-[70px] rounded-[8px] md:rounded-[16px]">
          <div className="flex items-center h-full justify-between">
            {/* Logo */}
            <div className="pl-6">
              <Link to="/">
                <img src={logo} alt="Ikonix logo" className="h-8 md:h-10" />
              </Link>
            </div>

            {/* Burger – mobile only */}
            <button onClick={() => setSidebar(true)} className="md:hidden pr-6">
              <img src={burger} alt="Open menu" className="w-6 h-6" />
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8 pr-6 text-white">
              <ul className="flex gap-5 items-center text-[16px] font-thin">
                <li onClick={() => navigate('/')} className="cursor-pointer">Home</li>
                <li onClick={() => navigate('/about')} className="cursor-pointer">About us</li>

                <li ref={menuRef} className="relative">
                  <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
                    Products
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  <div
                    className={`absolute z-20 transition-all duration-200
                    ${open ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-3 invisible'}`}
                  >
                    <div className="absolute left-1/2 -translate-x-1/2 h-5 w-5 rotate-45
                      bg-gray-100 border-l border-t border-slate-300 mt-2"
                    />
                    <DropDown onSelect={() => setOpen(false)} />
                  </div>
                </li>

                <li onClick={() => navigate('/contact')} className="cursor-pointer">Contact us</li>
              </ul>

              {/* Icons */}
              <div className="flex gap-3 items-center">
                <img src={search} onClick={() => setSearchOpen(true)} alt="Search" className="cursor-pointer" />

                <img
                  src={profile}
                  alt="Profile"
                  className="cursor-pointer"
                  onClick={() => (user ? navigate('/user-profile') : setAuthOpen(true))}
                />

                {/* ✅ Cart icon with badge (from context) */}
                <div className="relative cursor-pointer" onClick={() => setCartOpen(true)}>
                  <img src={cartIco} alt="Cart" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white
                      text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                    >
                      {cartCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Mobile Drawer (☰) ───────────────── */}
      <Drawer setSideBarOpen={sidebar} onClose={() => setSidebar(false)}>
        {/* … your mobile menu content … */}
      </Drawer>

      {/* ─── Modals ─────────────────────────────── */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* ─── Fixed Bottom Nav (mobile only) ───────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t shadow-inner z-50">
        <ul className="flex justify-around items-center py-2">
          <li onClick={() => setSearchOpen(true)} className="cursor-pointer flex flex-col items-center">
            <img src={search} alt="Search" className="w-6 h-6 mx-auto" />
            <span className="text-xs mt-1 block">Search</span>
          </li>

          <li onClick={() => setCartOpen(true)} className="cursor-pointer flex flex-col items-center">
            <div className="relative">
              <img src={cartIco} alt="Cart" className="w-6 h-6 mx-auto" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white
                  text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                >
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 block">Cart</span>
          </li>

          <li
            onClick={() => (user ? navigate('/user-profile') : setAuthOpen(true))}
            className="cursor-pointer flex flex-col items-center"
          >
            <img src={profile} alt="Profile" className="w-6 h-6 mx-auto" />
            <span className="text-xs mt-1 block">{user ? 'Profile' : 'Login'}</span>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default Header;
