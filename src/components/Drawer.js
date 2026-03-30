import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";

const TRANSITION_MS = 300;               // Adjusted for smoother animation

const Drawer = ({ setSideBarOpen, onClose, width = "w-[85%]", children }) => {
  const el = useMemo(() => document.createElement("div"), []);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, [el]);

  const [visible, setVisible] = useState(setSideBarOpen);
  const [shown,   setShown]   = useState(false);

  useEffect(() => {
    if (setSideBarOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        setShown(true);
      });
      document.body.style.overflow = "hidden";
    } else {
      setShown(false);
      document.body.style.overflow = "";
      const t = setTimeout(() => setVisible(false), TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [setSideBarOpen]);

  useEffect(() => {
    onClose();
  }, [location.pathname, location.search]);

  if (!visible) return null;

  const handleNavigate = (path, filter = "all") => {
    navigate(path, { state: { activeFilter: filter } });
    onClose();
  };

  return ReactDOM.createPortal(
    <>
      <div
        className={`fixed inset-0 z-[110] bg-black/50 transition-opacity duration-300 ${
          shown ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 h-full ${width} bg-[#2A3443] shadow-2xl z-[120] transform transition-transform duration-300 ease-in-out ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >

        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <Link to="/" onClick={onClose}>
            <img src={logo} alt="Ikonix logo" className="h-8" />
          </Link>
          <button
            onClick={onClose}
            className="text-3xl text-white/70 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col p-6 space-y-6">
          <Link to="/" className="text-white text-xl font-light hover:text-gray-300 transition-colors">
            Home
          </Link>
          <Link to="/about" className="text-white text-xl font-light hover:text-gray-300 transition-colors">
            About us
          </Link>
          
          <div className="flex flex-col space-y-4 pt-2">
            <h3 className="text-gray-400 text-sm uppercase tracking-widest font-semibold">Collections</h3>
            <div className="flex flex-col space-y-4 pl-4 border-l border-gray-700">
              <button 
                onClick={() => handleNavigate("/shop", "all")}
                className="text-white text-lg font-light text-left hover:text-gray-300 transition-colors"
              >
                All Products
              </button>
              <button 
                onClick={() => handleNavigate("/shop", "mens")}
                className="text-white text-lg font-light text-left hover:text-gray-300 transition-colors"
              >
                Men’s Perfume
              </button>
              <button 
                onClick={() => handleNavigate("/shop", "women")}
                className="text-white text-lg font-light text-left hover:text-gray-300 transition-colors"
              >
                Women’s Perfume
              </button>
              <button 
                onClick={() => handleNavigate("/shop", "bestSellers")}
                className="text-white text-lg font-light text-left hover:text-gray-300 transition-colors"
              >
                Our Best Sellers
              </button>
            </div>
          </div>
          
          <Link to="/contact" className="text-white text-xl font-light hover:text-gray-300 transition-colors">
            Contact us
          </Link>
        </div>

        <div className="p-6">{children}</div>
      </aside>
    </>,
    el
  );
};

export default Drawer;

