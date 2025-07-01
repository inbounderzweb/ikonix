import React, { useState, useEffect, useRef } from 'react';
import logo from '../../assets/logo.svg';
import cart from '../../assets/Cart.svg';
import profile from '../../assets/profile.svg';
import search from '../../assets/search.svg';
import burger from '../../assets/burger.svg';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

import DropDown from './DropDown';
import Drawer from '../Drawer';
import AuthModal from '../../Authmodal/AuthModal';
import { useNavigate } from 'react-router-dom';








function Header() {

  const navigate = useNavigate();

  const [open, setOpen] = useState(false);      // products dropdown
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);  // NEW ⬅️ auth modal

  const menuRef = useRef(null);

  // close the products dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='mx-auto w-[95%] md:w-[75%] pt-[24px] font-fancy'>
      <div className='bg-[#2A3443] h-[70px] rounded-[8px] md:rounded-[16px]'>
        <div className='flex items-center h-full justify-between'>

          {/* ─── Logo ──────────────────────────────────────────────── */}
          <div className='pl-[25px]'>
            <img src={logo} alt='Ikonix logo' className='h-8 md:h-10' />
          </div>

          {/* ─── Mobile burger (drawer trigger) ───────────────────── */}
          <div className='block md:hidden pr-[25px]'>
            <button onClick={() => setSidebarOpen(true)}>
              <img src={burger} alt='Open menu' className='w-6 h-6' />
            </button>
          </div>

          {/* ─── Desktop nav & icons ──────────────────────────────── */}
          <div className='gap-8 items-center pr-[25px] hidden md:flex'>

            {/* Nav links */}
            <ul className='flex gap-5 text-white items-center text-[16px] font-thin'>
            <li className='cursor-pointer' onClick={() => navigate('/')}>Home</li>
              <li className='cursor-pointer' onClick={()=>navigate('/about')}>About&nbsp;us</li>

              {/* Products dropdown */}
              <li className='relative' ref={menuRef}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  className='flex items-center gap-1 outline-none'
                >
                  Products
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Mega-menu */}
                <div
                  className={`absolute z-20 ${
                    open
                      ? 'opacity-100 translate-y-0 visible'
                      : 'opacity-0 -translate-y-3 invisible'
                  }`}
                >
                  <div className='absolute left-4/8 translate-x-[100%] h-5 w-5 mt-2 rotate-45 bg-gray-100 border-l border-t border-slate-300 z-10' />
                  <DropDown />
                </div>
              </li>

              <li className='cursor-pointer' onClick={()=>navigate('/contact')}>Contact&nbsp;us</li>
            </ul>

            {/* Icons */}
            <div className='flex gap-2 items-center'>
              <img src={search} alt='Search' className='cursor-pointer' />
              <img
                src={profile}
                alt='Profile'
                className='cursor-pointer'
                onClick={() => setAuthOpen(true)}          // NEW ⬅️ open modal
              />
              <img src={cart} alt='Cart' className='cursor-pointer' />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile drawer content ───────────────────────────────── */}
      <Drawer
        setSideBarOpen={sidebarOpen}                 // keeps your existing API
        onClose={() => setSidebarOpen(false)}
      >
        <div className='grid gap-6 text-lg text-gray-800 px-6 pt-8'>
          <p className='cursor-pointer' onClick={()=>navigate('/about')}>About us</p>
          <p>Products</p>
          <p>Contact us</p>

          <div className='flex gap-4 items-center mt-10'>
            <img src={search} alt='Search' />
            <img
              src={profile}
              alt='Profile'
              className='cursor-pointer'
              onClick={() => {
                setSidebarOpen(false);
                setAuthOpen(true);                  // open modal from drawer
              }}
            />
            <img src={cart} alt='Cart' />
          </div>
        </div>
      </Drawer>

      {/* ─── Auth modal ──────────────────────────────────────────── */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

export default Header;
