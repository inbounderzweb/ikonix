// ─── Header.jsx ──────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { useNavigate, useLocation,Link } from 'react-router-dom';   // ← location closes menu

// … your existing asset imports …
import logo    from '../../assets/logo.svg';
import cartIco from '../../assets/Cart.svg';
import profile from '../../assets/profile.svg';
import search  from '../../assets/search.svg';
import burger  from '../../assets/burger.svg';

import DropDown  from './DropDown';
import Drawer    from '../Drawer';
import AuthModal from '../../Authmodal/AuthModal';
import CartDrawer from '../cartdraw/CartDrawer';
import SearchModal from '../search/Search';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();            // auto-close the mega-menu on route change

  const [open,       setOpen]       = useState(false);  // products ▼
  const [sidebar,    setSidebar]    = useState(false);  // mobile ☰
  const [authOpen,   setAuthOpen]   = useState(false);  // login / signup
  const [cartOpen,   setCartOpen]   = useState(false);  // NEW – cart drawer
  const [searchOpen, setSearchOpen] = useState(false);

  const menuRef = useRef(null);

  /* ───── Close mega-menu on outside click ───────── */
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ───── Also close mega-menu whenever the URL changes ───── */
  useEffect(() => setOpen(false), [location]);

  /* —————————————————————————————————————————————————————— */
  return (
    <div className="mx-auto w-[95%] md:w-[75%] pt-6 font-fancy">
      <div className="bg-[#2A3443] h-[70px] rounded-[8px] md:rounded-[16px]">
        <div className="flex items-center h-full justify-between">
          {/* Logo */}
          <div className="pl-6">
           <Link to={'/'}><img  src={logo} alt="Ikonix logo" className="h-8 md:h-10" /></Link> 
          </div>

          {/* Burger – mobile only */}
          <button onClick={() => setSidebar(true)} className="md:hidden pr-6">
            <img src={burger} alt="Open menu" className="w-6 h-6" />
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8 pr-6 text-white">
            <ul className="flex gap-5 items-center text-[16px] font-thin">
              <li onClick={() => navigate('/')}          className="cursor-pointer">Home</li>
              <li onClick={() => navigate('/about')}     className="cursor-pointer">About&nbsp;us</li>

              {/* Products dropdown */}
              <li ref={menuRef} className="relative">
                <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1">
                  Products
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Mega-menu */}
                <div
                  className={`absolute z-20 transition-all duration-200
                              ${open ? 'opacity-100 translate-y-0 visible'
                                     : 'opacity-0 -translate-y-3 invisible'}`}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 h-5 w-5 rotate-45
                                  bg-gray-100 border-l border-t border-slate-300 mt-2" />
                  <DropDown onSelect={() => setOpen(false)} />
                </div>
              </li>

              <li onClick={() => navigate('/contact')} className="cursor-pointer">Contact&nbsp;us</li>
            </ul>

            {/* Icons */}
            <div className="flex gap-3 items-center">
              <img src={search} onClick={()=>setSearchOpen(true)}  alt="Search"  className="cursor-pointer" />
              <img src={profile} alt="Profile" className="cursor-pointer"
                   onClick={() => setAuthOpen(true)} />
              <img src={cartIco} alt="Cart"    className="cursor-pointer"
                   onClick={() => setCartOpen(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer (☰) */}
      <Drawer setSideBarOpen={sidebar} onClose={() => setSidebar(false)}>
        {/* … unchanged mobile menu content … */}
      </Drawer>

      {/* Auth modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        
      <SearchModal
  open={searchOpen}
  onClose={() => setSearchOpen(false)}
  onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
/>

      {/* ─── Cart drawer ───────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={mockCart}              // ⬅️ replace with your state / context
        onInc={id => {/* +1 logic */}}
        onDec={id => {/* -1 logic */}}
        onRemove={id => {/* remove logic */}}
        recommended={discoverMore}   // optional array for “Discover More”
      />
    </div>
  );
}

/* Mock data for quick testing — remove when wired to real store */
const mockCart = [
  { id: 1, title: 'Bangalore Bloom Men’s', price: 399, qty: 1,
    img: 'https://placehold.co/200x240?text=Perfume' },
  { id: 2, title: 'Bangalore Bloom Men’s', price: 399, qty: 1,
    img: 'https://placehold.co/200x240?text=Perfume' },
];

const discoverMore = Array.from({ length: 5 }, (_, i) => ({
  id: i + 10,
  title: 'Bangalore Bloom Men’s',
  img: 'https://placehold.co/160x200?text=Perfume',
}));

export default Header;
