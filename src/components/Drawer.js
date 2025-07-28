import React, { useEffect, useState, useMemo } from "react";
import ReactDOM from "react-dom";

const TRANSITION_MS = 600;               // duration-600 in Tailwind = 600 ms

const Drawer = ({ setSideBarOpen, onClose, width = "w-56", children }) => {
  /* -----------------------------------------------------------
     1.  Create a portal node exactly once
  ----------------------------------------------------------- */
  const el = useMemo(() => document.createElement("div"), []);

  useEffect(() => {
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, [el]);

  /* -----------------------------------------------------------
     2.  Track two things:
         • visible  – whether the drawer/backdrop are in the DOM
         • shown    – whether they are in their "open" position
  ----------------------------------------------------------- */
  const [visible, setVisible] = useState(setSideBarOpen);   // DOM mount flag
  const [shown,   setShown]   = useState(false);    // anim-position flag

  /* -----------------------------------------------------------
     3.  Handle open / close
  ----------------------------------------------------------- */
  useEffect(() => {
    if (setSideBarOpen) {
      setVisible(true);                 //  mount
      requestAnimationFrame(() => {     //  next paint → start anim
        setShown(true);
      });
      document.body.style.overflow = "hidden";   // lock scroll
    } else {
      setShown(false);                  // start slide-out
      document.body.style.overflow = "";         // unlock scroll
      const t = setTimeout(() => setVisible(false), TRANSITION_MS);
      return () => clearTimeout(t);     // cleanup if unmount early
    }
  }, [setSideBarOpen]);

  if (!visible) return null;

  /* -----------------------------------------------------------
     4.  Render via portal
  ----------------------------------------------------------- */
  return ReactDOM.createPortal(
    <>
      {/* backdrop */}
      <div
        className={`
          fixed inset-0 z-40
          transition-opacity duration-1000 ease-in-out
          ${shown ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* drawer */}
      <aside
        className={`
          fixed right-0 top-0 h-full ${width} bg-[#eaebed] shadow-lg z-50
          transform transition-transform duration-1000 ease-in-out
          ${shown ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* header with close button */}
        <div className="flex items-center justify-end p-4 border-b border-[#c5a292]">
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-70 text-[#c5a292]"
            aria-label="Close menu"
          >
            &times;
          </button>

        </div>

        {/* scrollable content */}
        <div className="p-6 overflow-y-auto">{children}</div>

        <div className="grid grid-cols-1 gap-5 ml-5">
          <p>About us</p>
          <p>Products</p>
          <p>contact</p>
        </div>
        
      </aside>







    </>,
    el
  );
};

export default Drawer;
